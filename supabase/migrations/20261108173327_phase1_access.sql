-- Phase 1. Apply AFTER the verified legacy baseline. No table or user data is deleted.
-- Existing policies on these two application tables are replaced deliberately.
begin;

create schema khipu_private;
revoke all on schema khipu_private from public;
grant usage on schema khipu_private to anon,authenticated,service_role;

create table public.khipu_memberships (
 user_id uuid primary key references auth.users(id) on delete restrict,
 email text not null,
 display_name text not null default '' check(length(display_name)<=100),
 role text not null default 'artisan' check(role in ('artisan','admin')),
 status text not null default 'pending' check(status in ('pending','active','rejected','suspended')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.khipu_invitations (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(trim(email)) and length(email) between 3 and 254),
 status text not null default 'pending' check(status in ('pending','claimed','revoked')),
 invited_by uuid,
 claimed_by uuid,
 expires_at timestamptz not null default (now()+interval '7 days'),
 last_attempt_at timestamptz,
 delivered_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.khipu_admin_events (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid,
 target_id uuid,
 action text not null,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index on public.khipu_memberships(status,created_at);
create index on public.khipu_memberships(email);
create index on public.khipu_admin_events(created_at desc);
create index on public.khipu_admin_events(actor_id,action,created_at desc);
create index on public.productos(owner_id);
create index on public.productos(artisan_id);
alter table public.khipu_memberships enable row level security;
alter table public.khipu_invitations enable row level security;
alter table public.khipu_admin_events enable row level security;
revoke all on public.khipu_memberships,public.khipu_invitations,public.khipu_admin_events from public,anon,authenticated;
-- No browser role has direct INSERT/UPDATE/DELETE, including administrators.

create or replace function public.khipu_is_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.khipu_memberships where user_id=(select auth.uid()) and role='admin' and status='active'); $$;
create or replace function public.soy_artesana_autorizada()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.khipu_memberships where user_id=(select auth.uid()) and role='artisan' and status='active'); $$;
revoke all on function public.khipu_is_admin(),public.soy_artesana_autorizada() from public,anon,authenticated;
grant execute on function public.khipu_is_admin(),public.soy_artesana_autorizada() to authenticated;

-- Preserve existing verified accounts, including a prior suspension.
insert into public.khipu_memberships(user_id,email,display_name,status)
select distinct on (u.id) u.id,lower(trim(u.email)),left(coalesce(a.nombre,''),100),
 case when a.activa then 'active' else 'suspended' end
from auth.users u join public.artesanas_autorizadas a on lower(trim(a.correo))=lower(trim(u.email))
where u.email_confirmed_at is not null order by u.id,a.activa desc;
-- Previously approved emails without a verified account receive a transitional invitation.
insert into public.khipu_invitations(email,expires_at)
select distinct lower(trim(a.correo)),now()+interval '30 days'
from public.artesanas_autorizadas a where a.activa=true
and length(trim(a.correo)) between 3 and 254
and not exists(select 1 from public.khipu_memberships m where m.email=lower(trim(a.correo)))
on conflict(email) do nothing;
insert into public.khipu_admin_events(action,detail) values('legacy_access_imported',jsonb_build_object('source','artesanas_autorizadas'));

create function public.khipu_request_access()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare u auth.users; m public.khipu_memberships; invitation public.khipu_invitations;
begin
 select * into u from auth.users where id=(select auth.uid());
 if u.id is null or u.email_confirmed_at is null or u.email is null then
  raise exception 'Confirma tu correo e inicia sesión.' using errcode='42501';
 end if;
 -- Serializes same-account callbacks; no duplicate request or invitation claim.
 perform pg_advisory_xact_lock(hashtextextended(u.id::text,0));
 select * into m from public.khipu_memberships where user_id=u.id;
 if m.user_id is null then
  select * into invitation from public.khipu_invitations
   where email=lower(trim(u.email)) and status='pending' and expires_at>now() for update;
  insert into public.khipu_memberships(user_id,email,display_name,status)
   values(u.id,lower(trim(u.email)),left(coalesce(u.raw_user_meta_data->>'full_name',''),100),
   case when invitation.id is not null then 'active' else 'pending' end) returning * into m;
  if invitation.id is not null then
   update public.khipu_invitations set status='claimed',claimed_by=u.id where id=invitation.id;
   insert into public.khipu_admin_events(actor_id,target_id,action,detail)
    values(invitation.invited_by,u.id,'invitation_claimed',jsonb_build_object('invitation_id',invitation.id));
  end if;
 end if;
 return jsonb_build_object('user_id',m.user_id,'email',m.email,'display_name',m.display_name,'role',m.role,'status',m.status);
end; $$;

create function public.khipu_manage_member(target_user uuid,action text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare m public.khipu_memberships; next_status text;
begin
 if not public.khipu_is_admin() then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 select * into m from public.khipu_memberships where user_id=target_user for update;
 if m.user_id is null then raise exception 'No se encontró la cuenta.'; end if;
 if m.role='admin' then raise exception 'Las cuentas administradoras se gestionan únicamente desde el servidor.' using errcode='42501'; end if;
 next_status:=case
  when action='approve' and m.status='pending' then 'active'
  when action='reject' and m.status='pending' then 'rejected'
  when action='suspend' and m.status='active' then 'suspended'
  when action='reactivate' and m.status in ('suspended','rejected') then 'active'
  else null end;
 if next_status is null then raise exception 'La cuenta cambió de estado. Actualiza la lista.'; end if;
 update public.khipu_memberships set status=next_status,updated_at=now() where user_id=target_user;
 insert into public.khipu_admin_events(actor_id,target_id,action,detail)
  values(auth.uid(),target_user,action,jsonb_build_object('before',m.status,'after',next_status));
 return jsonb_build_object('status',next_status);
end; $$;

create function public.khipu_prepare_invitation(invite_email text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare normalized text:=lower(trim(invite_email)); invitation public.khipu_invitations;
begin
 if not public.khipu_is_admin() then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 if length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Revisa el correo de la invitación.'; end if;
 -- Serialize by actor and email to enforce the sending limit under concurrency.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 perform pg_advisory_xact_lock(hashtextextended(normalized,2));
 if exists(select 1 from public.khipu_memberships where email=normalized) then
  raise exception 'Esta cuenta ya está registrada. Gestiona su solicitud desde la lista.';
 end if;
 if (select count(*) from public.khipu_admin_events where actor_id=auth.uid() and action='invitation_prepared' and created_at>now()-interval '1 hour')>=10 then
  raise exception 'Alcanzaste el límite de 10 invitaciones por hora.';
 end if;
 select * into invitation from public.khipu_invitations where email=normalized for update;
 if invitation.last_attempt_at>now()-interval '60 seconds' then raise exception 'Espera un minuto antes de reenviar la invitación.'; end if;
 insert into public.khipu_invitations(email,invited_by,expires_at,last_attempt_at)
  values(normalized,auth.uid(),now()+interval '7 days',now())
  on conflict(email) do update set status='pending',invited_by=auth.uid(),expires_at=now()+interval '7 days',last_attempt_at=now(),delivered_at=null
  returning * into invitation;
 insert into public.khipu_admin_events(actor_id,target_id,action,detail)
  values(auth.uid(),invitation.id,'invitation_prepared',jsonb_build_object('email',normalized));
 return jsonb_build_object('id',invitation.id,'email',invitation.email);
end; $$;

create function public.khipu_revoke_invitation(invitation_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
 if not public.khipu_is_admin() then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 update public.khipu_invitations set status='revoked' where id=invitation_id and status='pending';
 if not found then raise exception 'La invitación ya cambió. Actualiza la lista.'; end if;
 insert into public.khipu_admin_events(actor_id,target_id,action) values(auth.uid(),invitation_id,'invitation_revoked');
end; $$;

-- Only the server-side service role records the email provider result.
create function public.khipu_invitation_delivery(invitation_id uuid,succeeded boolean)
returns void language plpgsql security definer set search_path=''
as $$ begin
 update public.khipu_invitations set delivered_at=case when succeeded then now() else null end where id=invitation_id;
 insert into public.khipu_admin_events(target_id,action)
 values(invitation_id,case when succeeded then 'invitation_email_sent' else 'invitation_email_failed' end);
end; $$;

create function public.khipu_admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path=''
as $$ begin
 if not public.khipu_is_admin() then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 return jsonb_build_object(
  'members',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from (select * from public.khipu_memberships order by created_at desc limit 200) m),
  'invitations',(select coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) from (select * from public.khipu_invitations order by created_at desc limit 100) i),
  'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from (select * from public.khipu_admin_events order by created_at desc limit 100) e),
  'counts',(select jsonb_build_object('pending',count(*) filter(where role='artisan' and status='pending'),'active',count(*) filter(where role='artisan' and status='active'),'suspended',count(*) filter(where role='artisan' and status='suspended'),'total',count(*)) from public.khipu_memberships));
end; $$;

-- SQL Editor only. Not exposed to any API role, including service_role.
create function public.khipu_bootstrap_admin(admin_user uuid)
returns void language plpgsql security definer set search_path=''
as $$ declare u auth.users; begin
 lock table public.khipu_memberships in share row exclusive mode;
 if exists(select 1 from public.khipu_memberships where role='admin') then raise exception 'La administración inicial ya está configurada.'; end if;
 select * into u from auth.users where id=admin_user and email_confirmed_at is not null;
 if u.id is null then raise exception 'Selecciona una cuenta con correo confirmado.'; end if;
 insert into public.khipu_memberships(user_id,email,role,status)
  values(u.id,lower(trim(u.email)),'admin','active')
  on conflict(user_id) do update set role='admin',status='active',updated_at=now();
 insert into public.khipu_admin_events(target_id,action) values(u.id,'bootstrap_admin');
end; $$;

revoke all on function public.khipu_request_access(),public.khipu_manage_member(uuid,text),public.khipu_prepare_invitation(text),public.khipu_revoke_invitation(uuid),public.khipu_admin_dashboard() from public,anon,authenticated;
grant execute on function public.khipu_request_access(),public.khipu_manage_member(uuid,text),public.khipu_prepare_invitation(text),public.khipu_revoke_invitation(uuid),public.khipu_admin_dashboard() to authenticated;
revoke all on function public.khipu_invitation_delivery(uuid,boolean) from public,anon,authenticated;
grant execute on function public.khipu_invitation_delivery(uuid,boolean) to service_role;
revoke all on function public.khipu_bootstrap_admin(uuid) from public,anon,authenticated,service_role;

-- Replace permissive legacy policies on application tables, including unknown old policies.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies
  where schemaname='public' and tablename in ('artesanas_perfiles','productos') loop
  execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end; $$;
revoke all on public.artesanas_perfiles,public.productos from public,anon,authenticated;
grant select,insert,update on public.artesanas_perfiles to authenticated;
grant select,insert,update,delete on public.productos to authenticated;
create policy phase1_profile_read on public.artesanas_perfiles for select to authenticated
 using((user_id=(select auth.uid()) and (select public.soy_artesana_autorizada())) or (select public.khipu_is_admin()));
create policy phase1_profile_insert on public.artesanas_perfiles for insert to authenticated
 with check(user_id=(select auth.uid()) and (select public.soy_artesana_autorizada()));
create policy phase1_profile_update on public.artesanas_perfiles for update to authenticated
 using(user_id=(select auth.uid()) and (select public.soy_artesana_autorizada()))
 with check(user_id=(select auth.uid()) and (select public.soy_artesana_autorizada()));
create policy phase1_product_read on public.productos for select to authenticated
 using((owner_id=(select auth.uid()) and (select public.soy_artesana_autorizada())) or (select public.khipu_is_admin()));
create policy phase1_product_insert on public.productos for insert to authenticated
 with check(owner_id=(select auth.uid()) and (select public.soy_artesana_autorizada()) and exists(select 1 from public.artesanas_perfiles a where a.id=artisan_id and a.user_id=(select auth.uid())));
create policy phase1_product_update on public.productos for update to authenticated
 using(owner_id=(select auth.uid()) and (select public.soy_artesana_autorizada()))
 with check(owner_id=(select auth.uid()) and (select public.soy_artesana_autorizada()) and exists(select 1 from public.artesanas_perfiles a where a.id=artisan_id and a.user_id=(select auth.uid())));
create policy phase1_product_delete on public.productos for delete to authenticated
 using(owner_id=(select auth.uid()) and (select public.soy_artesana_autorizada()));

-- Public catalog exposes an explicit field list; never auth IDs or account emails.
create function public.khipu_public_catalog()
returns jsonb language sql stable security definer set search_path=''
as $$
 with visible_profiles as (
  select a.* from public.artesanas_perfiles a join public.khipu_memberships m on m.user_id=a.user_id
  where a.visible and m.role='artisan' and m.status='active'
 ) select jsonb_build_object(
 'profiles',(select coalesce(jsonb_agg(jsonb_build_object(
  'id',a.id,'name',a.name,'city',a.city,'specialty',a.specialty,'bio',a.bio,'story',a.story,
  'experience',a.experience,'fair',a.fair,'avatar_url',a.avatar_url,'facebook',a.facebook,
  'instagram',a.instagram,'tiktok',a.tiktok,'youtube',a.youtube,'video',a.video,'whatsapp',a.whatsapp)),'[]'::jsonb) from visible_profiles a),
 'products',(select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'name',p.name,'category',p.category,'material',p.material,'price',p.price,'dimensions',p.dimensions,
  'care',p.care,'story',p.story,'stock',p.stock,'collection',p.collection,'image_url',p.image_url,
  'artesanas_perfiles',jsonb_build_object('name',a.name)) order by p.created_at desc),'[]'::jsonb)
  from public.productos p join visible_profiles a on a.id=p.artisan_id and a.user_id=p.owner_id where p.publicado));
$$;
revoke all on function public.khipu_public_catalog() from public,anon,authenticated;
grant execute on function public.khipu_public_catalog() to anon,authenticated;

-- Legacy Storage upload policies already call soy_artesana_autorizada(), now UID based.
-- Restrictive guards also cover an accidentally broader pre-existing write policy.
create policy phase1_storage_insert_guard on storage.objects as restrictive for insert to authenticated
 with check(bucket_id not in ('productos','perfiles') or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.soy_artesana_autorizada())));
create policy phase1_storage_update_guard on storage.objects as restrictive for update to authenticated
 using(bucket_id not in ('productos','perfiles') or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.soy_artesana_autorizada())))
 with check(bucket_id not in ('productos','perfiles') or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.soy_artesana_autorizada())));
create policy phase1_storage_delete_guard on storage.objects as restrictive for delete to authenticated
 using(bucket_id not in ('productos','perfiles') or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.soy_artesana_autorizada())));
create policy phase1_storage_anon_write_guard on storage.objects as restrictive for all to anon
 using(bucket_id not in ('productos','perfiles')) with check(bucket_id not in ('productos','perfiles'));
-- Known public image URLs stay public; migrating draft media is Phase 2.

-- Privileged implementations live outside the exposed public API schema. Their
-- existing ACLs follow the move; wrappers below have explicit caller privileges.
alter function public.khipu_is_admin() set schema khipu_private;
alter function public.soy_artesana_autorizada() set schema khipu_private;
alter function public.khipu_request_access() set schema khipu_private;
alter function public.khipu_manage_member(uuid,text) set schema khipu_private;
alter function public.khipu_prepare_invitation(text) set schema khipu_private;
alter function public.khipu_revoke_invitation(uuid) set schema khipu_private;
alter function public.khipu_invitation_delivery(uuid,boolean) set schema khipu_private;
alter function public.khipu_admin_dashboard() set schema khipu_private;
alter function public.khipu_bootstrap_admin(uuid) set schema khipu_private;
alter function public.khipu_public_catalog() set schema khipu_private;
revoke execute on all functions in schema khipu_private from public;

create function public.khipu_is_admin() returns boolean language sql stable security invoker set search_path=''
as $$ select khipu_private.khipu_is_admin(); $$;
create function public.soy_artesana_autorizada() returns boolean language sql stable security invoker set search_path=''
as $$ select khipu_private.soy_artesana_autorizada(); $$;
create function public.khipu_request_access() returns jsonb language sql security invoker set search_path=''
as $$ select khipu_private.khipu_request_access(); $$;
create function public.khipu_manage_member(target_user uuid,action text) returns jsonb language sql security invoker set search_path=''
as $$ select khipu_private.khipu_manage_member(target_user,action); $$;
create function public.khipu_prepare_invitation(invite_email text) returns jsonb language sql security invoker set search_path=''
as $$ select khipu_private.khipu_prepare_invitation(invite_email); $$;
create function public.khipu_revoke_invitation(invitation_id uuid) returns void language sql security invoker set search_path=''
as $$ select khipu_private.khipu_revoke_invitation(invitation_id); $$;
create function public.khipu_invitation_delivery(invitation_id uuid,succeeded boolean) returns void language sql security invoker set search_path=''
as $$ select khipu_private.khipu_invitation_delivery(invitation_id,succeeded); $$;
create function public.khipu_admin_dashboard() returns jsonb language sql stable security invoker set search_path=''
as $$ select khipu_private.khipu_admin_dashboard(); $$;
create function public.khipu_bootstrap_admin(admin_user uuid) returns void language sql security invoker set search_path=''
as $$ select khipu_private.khipu_bootstrap_admin(admin_user); $$;
create function public.khipu_public_catalog() returns jsonb language sql stable security invoker set search_path=''
as $$ select khipu_private.khipu_public_catalog(); $$;

revoke all on function public.khipu_is_admin(),public.soy_artesana_autorizada(),public.khipu_request_access(),public.khipu_manage_member(uuid,text),public.khipu_prepare_invitation(text),public.khipu_revoke_invitation(uuid),public.khipu_invitation_delivery(uuid,boolean),public.khipu_admin_dashboard(),public.khipu_bootstrap_admin(uuid),public.khipu_public_catalog() from public,anon,authenticated,service_role;
grant execute on function public.khipu_is_admin(),public.soy_artesana_autorizada(),public.khipu_request_access(),public.khipu_manage_member(uuid,text),public.khipu_prepare_invitation(text),public.khipu_revoke_invitation(uuid),public.khipu_admin_dashboard() to authenticated;
grant execute on function public.khipu_invitation_delivery(uuid,boolean) to service_role;
grant execute on function public.khipu_public_catalog() to anon,authenticated;

-- The automatic RLS event trigger remains installed. Browser roles do not need
-- EXECUTE on its function. Some local test environments do not have that trigger.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke all on function public.rls_auto_enable() from public,anon,authenticated';
 end if;
end; $$;
commit;
