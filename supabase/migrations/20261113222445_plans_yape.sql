-- Local proposal. Apply remotely only after explicit authorization.
create table public.khipu_plan_settings (
 id boolean primary key default true check(id), price numeric(10,2) not null default 19 check(price between 1 and 9999),
 enabled boolean not null default false, recipient text not null default '' check(length(recipient)<=100),
 instructions text not null default '' check(length(instructions)<=1500),qr_path text not null default '',updated_at timestamptz not null default now()
);
insert into public.khipu_plan_settings(id) values(true);
create table public.khipu_plan_payments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.khipu_memberships(user_id),
 amount numeric(10,2) not null check(amount>0),reference text not null check(length(reference) between 3 and 100),proof_path text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid,reason text,verified_reference text,
 starts_at timestamptz,expires_at timestamptz
);
create unique index khipu_plan_one_pending on public.khipu_plan_payments(user_id) where status='pending';
create unique index khipu_plan_verified_once on public.khipu_plan_payments(lower(verified_reference)) where status='approved';
alter table public.khipu_plan_settings enable row level security;
alter table public.khipu_plan_payments enable row level security;
revoke all on public.khipu_plan_settings,public.khipu_plan_payments from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('plan-qr','plan-qr',true,5242880,array['image/png','image/jpeg','image/webp']),
 ('plan-proofs','plan-proofs',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy plan_qr_read on storage.objects for select to anon,authenticated using(bucket_id='plan-qr');
create policy plan_qr_insert on storage.objects for insert to authenticated with check(bucket_id='plan-qr' and public.khipu_is_admin() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy plan_proof_insert on storage.objects for insert to authenticated with check(bucket_id='plan-proofs' and public.soy_artesana_autorizada() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy plan_proof_read on storage.objects for select to authenticated using(bucket_id='plan-proofs' and (public.khipu_is_admin() or (public.soy_artesana_autorizada() and (storage.foldername(name))[1]=(select auth.uid())::text)));
create policy plan_proof_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'plan-proofs' or (public.khipu_is_admin() or (public.soy_artesana_autorizada() and (storage.foldername(name))[1]=(select auth.uid())::text)));
create policy plan_proof_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'plan-proofs') with check(bucket_id<>'plan-proofs');
create policy plan_media_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id not in ('plan-proofs','plan-qr')) with check(bucket_id not in ('plan-proofs','plan-qr'));
create policy plan_media_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id not in ('plan-proofs','plan-qr'));

create function khipu_private.khipu_plan_public() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('settings',to_jsonb(s)-'id','limits',(select jsonb_agg(to_jsonb(l) order by plan) from public.khipu_ai_limits l)) from public.khipu_plan_settings s where id;
$$;
create function khipu_private.khipu_plan_my() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());chosen text; expiry timestamptz;
begin
 if uid is null or not khipu_private.soy_artesana_autorizada() then raise exception 'Acceso de artesana requerido.' using errcode='42501';end if;
 select plan,expires_at into chosen,expiry from public.khipu_ai_plans where user_id=uid;
 if chosen is distinct from 'pro' or expiry<=now() then chosen:='basic';end if;
 return khipu_private.khipu_plan_public()||jsonb_build_object('plan',chosen,'expires_at',expiry,
 'monthly_used',(select count(*) from public.khipu_ai_requests where user_id=uid and created_at>=date_trunc('month',now())),
 'requests',(select coalesce(jsonb_agg(to_jsonb(p) order by created_at desc),'[]') from (select id,amount,reference,proof_path,status,created_at,reviewed_at,reason,starts_at,expires_at from public.khipu_plan_payments where user_id=uid order by created_at desc limit 50)p));
end;$$;
create function khipu_private.khipu_plan_submit(p_reference text,p_proof text,p_price numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.khipu_plan_settings;uid uuid:=(select auth.uid());r public.khipu_plan_payments;
begin
 if uid is null or not khipu_private.soy_artesana_autorizada() then raise exception 'Acceso de artesana requerido.' using errcode='42501';end if;
 select * into s from public.khipu_plan_settings where id for share;
 if not s.enabled then raise exception 'Las solicitudes de Pro todavía no están habilitadas.' using errcode='22023';end if;
 if p_price is distinct from s.price then raise exception 'El precio cambió. Actualiza Mi plan antes de pagar o enviar la solicitud.' using errcode='22023';end if;
 if p_reference is null or length(trim(p_reference)) not between 3 and 100 then raise exception 'Escribe una referencia de 3 a 100 caracteres.' using errcode='22023';end if;
 if p_proof is not null and not exists(select 1 from storage.objects where bucket_id='plan-proofs' and name=p_proof and (storage.foldername(name))[1]=uid::text) then raise exception 'El comprobante no pertenece a tu cuenta.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,719850));
 if exists(select 1 from public.khipu_plan_payments where user_id=uid and status='pending') then raise exception 'Ya tienes una solicitud pendiente de revisión.' using errcode='22023';end if;
 if (select count(*) from public.khipu_plan_payments where user_id=uid and created_at>=date_trunc('day',now()))>=3 then raise exception 'Alcanzaste el límite de solicitudes de hoy.' using errcode='22023';end if;
 insert into public.khipu_plan_payments(user_id,amount,reference,proof_path) values(uid,s.price,trim(p_reference),p_proof) returning * into r;
 return to_jsonb(r);
end;$$;
create function khipu_private.khipu_plan_admin() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Administración requerida.' using errcode='42501';end if;
 return khipu_private.khipu_plan_public()||jsonb_build_object(
 'requests',(select coalesce(jsonb_agg(to_jsonb(p) order by created_at desc),'[]') from (select p.*,m.email,m.display_name from public.khipu_plan_payments p join public.khipu_memberships m on m.user_id=p.user_id order by p.created_at desc limit 200)p),
 'subscriptions',(select coalesce(jsonb_agg(to_jsonb(p) order by expires_at desc),'[]') from (select p.*,m.email,m.display_name from public.khipu_ai_plans p join public.khipu_memberships m on m.user_id=p.user_id order by expires_at desc limit 200)p));
end;$$;
create function khipu_private.khipu_plan_config(p_price numeric,p_recipient text,p_instructions text,p_qr text,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Administración requerida.' using errcode='42501';end if;
 if p_enabled is null or p_price is null or p_price<1 or p_price>9999 or p_price<>round(p_price,2) or p_recipient is null or p_instructions is null or p_qr is null then raise exception 'Revisa la configuración de pago.' using errcode='22023';end if;
 if p_qr<>'' and not exists(select 1 from storage.objects where bucket_id='plan-qr' and name=p_qr) then raise exception 'Sube un QR válido desde administración.' using errcode='22023';end if;
 if p_enabled and (length(trim(p_recipient))<3 or length(trim(p_instructions))<10 or p_qr='') then raise exception 'Configura titular, instrucciones y QR antes de habilitar los pagos.' using errcode='22023';end if;
 update public.khipu_plan_settings set price=p_price,recipient=trim(p_recipient),instructions=trim(p_instructions),qr_path=p_qr,enabled=p_enabled,updated_at=now() where id;
 insert into public.khipu_admin_events(actor_id,action,detail) values((select auth.uid()),'plan_settings_updated',jsonb_build_object('price',p_price,'enabled',p_enabled));
end;$$;
create function khipu_private.khipu_plan_decide(p_id uuid,p_action text,p_reason text,p_verified text,p_confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.khipu_plan_payments;begins timestamptz;ends timestamptz;
begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Administración requerida.' using errcode='42501';end if;
 if p_action is null or p_action not in ('approve','reject') or p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Indica una decisión y un motivo de 5 a 500 caracteres.' using errcode='22023';end if;
 select * into r from public.khipu_plan_payments where id=p_id for update;
 if r.id is null or r.status<>'pending' then raise exception 'La solicitud ya fue revisada o no existe.' using errcode='22023';end if;
 if p_action='approve' then
  if p_confirmed is distinct from true or p_verified is null or length(trim(p_verified)) not between 3 and 100 then raise exception 'Verifica el abono real e indica su referencia antes de aprobar.' using errcode='22023';end if;
  if not exists(select 1 from public.khipu_memberships where user_id=r.user_id and role='artisan' and status='active') then raise exception 'La cuenta debe estar activa para recibir Pro.' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,719850));
  select expires_at into ends from public.khipu_ai_plans where user_id=r.user_id and plan='pro' for update;
  begins:=greatest(now(),coalesce(ends,now()));ends:=begins+interval '1 month';
  insert into public.khipu_ai_plans(user_id,plan,expires_at) values(r.user_id,'pro',ends) on conflict(user_id) do update set plan='pro',expires_at=excluded.expires_at;
 end if;
 update public.khipu_plan_payments set status=case when p_action='approve' then 'approved' else 'rejected' end,reason=trim(p_reason),reviewed_at=now(),reviewed_by=(select auth.uid()),verified_reference=case when p_action='approve' then lower(trim(p_verified)) else null end,starts_at=begins,expires_at=ends where id=r.id;
 insert into public.khipu_admin_events(actor_id,target_id,action,detail) values((select auth.uid()),r.user_id,'plan_'||p_action,jsonb_build_object('request_id',r.id,'amount',r.amount,'reason',trim(p_reason),'expires_at',ends));
end;$$;
create function khipu_private.khipu_plan_adjust(p_user uuid,p_expires timestamptz,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare previous_expiry timestamptz;
begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Administración requerida.' using errcode='42501';end if;
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 or p_expires is null or p_expires>now()+interval '2 years' then raise exception 'Indica una fecha válida y un motivo de 5 a 500 caracteres.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,719850));
 select expires_at into previous_expiry from public.khipu_ai_plans where user_id=p_user for update;
 if previous_expiry is null then raise exception 'No existe una suscripción para ajustar.' using errcode='22023';end if;
 update public.khipu_ai_plans set plan=case when p_expires>now() then 'pro' else 'basic' end,expires_at=p_expires where user_id=p_user;
 insert into public.khipu_admin_events(actor_id,target_id,action,detail) values((select auth.uid()),p_user,'plan_adjust',jsonb_build_object('before',previous_expiry,'expires_at',p_expires,'reason',trim(p_reason)));
end;$$;

create function public.khipu_plan_public() returns jsonb language sql stable security invoker set search_path='' as $$select khipu_private.khipu_plan_public();$$;
create function public.khipu_plan_my() returns jsonb language sql stable security invoker set search_path='' as $$select khipu_private.khipu_plan_my();$$;
create function public.khipu_plan_submit(p_reference text,p_proof text default null,p_price numeric default null) returns jsonb language sql security invoker set search_path='' as $$select khipu_private.khipu_plan_submit(p_reference,p_proof,p_price);$$;
create function public.khipu_plan_admin() returns jsonb language sql stable security invoker set search_path='' as $$select khipu_private.khipu_plan_admin();$$;
create function public.khipu_plan_config(p_price numeric,p_recipient text,p_instructions text,p_qr text,p_enabled boolean) returns void language sql security invoker set search_path='' as $$select khipu_private.khipu_plan_config(p_price,p_recipient,p_instructions,p_qr,p_enabled);$$;
create function public.khipu_plan_decide(p_id uuid,p_action text,p_reason text,p_verified text default null,p_confirmed boolean default false) returns void language sql security invoker set search_path='' as $$select khipu_private.khipu_plan_decide(p_id,p_action,p_reason,p_verified,p_confirmed);$$;
create function public.khipu_plan_adjust(p_user uuid,p_expires timestamptz,p_reason text) returns void language sql security invoker set search_path='' as $$select khipu_private.khipu_plan_adjust(p_user,p_expires,p_reason);$$;
do $$declare f record;begin
 for f in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','khipu_private') and p.proname like 'khipu_plan_%' loop
  execute format('revoke all on function %I.%I(%s) from public,anon,authenticated,service_role',f.nspname,f.proname,f.args);
  execute format('grant execute on function %I.%I(%s) to authenticated',f.nspname,f.proname,f.args);
  if f.proname='khipu_plan_public' then execute format('grant execute on function %I.%I(%s) to anon',f.nspname,f.proname,f.args);end if;
 end loop;
end;$$;
