-- Local proposal. Apply remotely only after explicit approval.
-- Administrative holds are separate from the artisan's publication state.
create table public.khipu_product_moderation (
 product_id uuid primary key references public.productos(id) on delete cascade,
 hidden boolean not null default false,
 reason text not null check(length(reason) between 5 and 500),
 updated_by uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.khipu_product_moderation enable row level security;
revoke all on public.khipu_product_moderation from public,anon,authenticated;

create function khipu_private.khipu_admin_commerce()
returns jsonb language plpgsql stable security definer set search_path=''
as $$ begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 return jsonb_build_object(
  'products',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (
   select p.*,a.name as artisan_name,coalesce(m.hidden,false) as moderation_hidden,coalesce(m.reason,'') as moderation_reason,
    (p.publicado and a.visible and u.role='artisan' and u.status='active' and not coalesce(m.hidden,false)) as public_visible
   from public.productos p join public.artesanas_perfiles a on a.id=p.artisan_id
   join public.khipu_memberships u on u.user_id=p.owner_id
   left join public.khipu_product_moderation m on m.product_id=p.id order by p.created_at desc limit 200)q),
  'reviews',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (
   select r.*,case when r.kind='product' then (select p.name from public.productos p where p.id::text=r.target)
    else (select a.name from public.artesanas_perfiles a where a.name=r.target) end as target_name
   from public.valoraciones r order by r.created_at desc limit 200)q));
end; $$;

create function khipu_private.khipu_my_product_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $$ begin
 if (select auth.uid()) is null or not khipu_private.soy_artesana_autorizada() then raise exception 'Acceso de artesana requerido.' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'hidden',m.hidden,'reason',m.reason)),'[]'::jsonb)
  from public.productos p join public.khipu_product_moderation m on m.product_id=p.id where p.owner_id=(select auth.uid()));
end; $$;

create function khipu_private.khipu_moderate_commerce(record_kind text,record_id uuid,operation text,reason_text text)
returns void language plpgsql security definer set search_path=''
as $$ declare p public.productos; r public.valoraciones; was_hidden boolean; before_value jsonb; after_value jsonb; label text;
begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 if reason_text is null or length(trim(reason_text)) not between 5 and 500 then raise exception 'Escribe un motivo de 5 a 500 caracteres.' using errcode='22023'; end if;
 if record_kind='product' and operation in ('hide','restore') then
  select * into p from public.productos where id=record_id for update;
  if p.id is null then raise exception 'No se encontró este producto.' using errcode='22023'; end if;
  select coalesce((select hidden from public.khipu_product_moderation where product_id=record_id),false) into was_hidden;
  if was_hidden=(operation='hide') then raise exception 'Este producto ya tiene ese estado de moderación.' using errcode='22023'; end if;
  before_value:=jsonb_build_object('hidden',was_hidden,'published',p.publicado);
  insert into public.khipu_product_moderation(product_id,hidden,reason,updated_by)
   values(record_id,operation='hide',trim(reason_text),(select auth.uid()))
   on conflict(product_id) do update set hidden=excluded.hidden,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now();
  -- Restoring removes the administrative hold; the artisan reviews and republishes.
  update public.productos set publicado=false where id=record_id;
  after_value:=jsonb_build_object('hidden',operation='hide','published',false);label:=p.name;
 elsif record_kind='review' and operation in ('approve','hide') then
  select * into r from public.valoraciones where id=record_id for update;
  if r.id is null then raise exception 'No se encontró esta valoración.' using errcode='22023'; end if;
  if r.aprobada=(operation='approve') then raise exception 'Esta valoración ya tiene ese estado.' using errcode='22023'; end if;
  before_value:=jsonb_build_object('approved',r.aprobada);
  update public.valoraciones set aprobada=(operation='approve') where id=record_id;
  after_value:=jsonb_build_object('approved',operation='approve');label:=r.nombre;
 else raise exception 'Operación de moderación inválida.' using errcode='22023';
 end if;
 insert into public.khipu_admin_events(actor_id,target_id,action,detail)
  values((select auth.uid()),record_id,record_kind||'_'||operation,jsonb_build_object('kind',record_kind,'record_id',record_id,'record_name',label,'reason',trim(reason_text),'before',before_value,'after',after_value));
end; $$;

create function public.khipu_admin_commerce() returns jsonb language sql stable security invoker set search_path=''
as $$ select khipu_private.khipu_admin_commerce(); $$;
create function public.khipu_my_product_status() returns jsonb language sql stable security invoker set search_path=''
as $$ select khipu_private.khipu_my_product_status(); $$;
create function public.khipu_moderate_commerce(record_kind text,record_id uuid,operation text,reason_text text)
returns void language sql security invoker set search_path=''
as $$ select khipu_private.khipu_moderate_commerce(record_kind,record_id,operation,reason_text); $$;
revoke all on function khipu_private.khipu_admin_commerce(),khipu_private.khipu_my_product_status(),khipu_private.khipu_moderate_commerce(text,uuid,text,text),public.khipu_admin_commerce(),public.khipu_my_product_status(),public.khipu_moderate_commerce(text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function khipu_private.khipu_admin_commerce(),khipu_private.khipu_my_product_status(),khipu_private.khipu_moderate_commerce(text,uuid,text,text),public.khipu_admin_commerce(),public.khipu_my_product_status(),public.khipu_moderate_commerce(text,uuid,text,text) to authenticated;

create or replace function khipu_private.khipu_public_catalog()
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
  'photos',to_jsonb(p.gallery_urls),'artesanas_perfiles',jsonb_build_object('name',a.name)) order by p.created_at desc),'[]'::jsonb)
  from public.productos p join visible_profiles a on a.id=p.artisan_id and a.user_id=p.owner_id where p.publicado
   and not exists(select 1 from public.khipu_product_moderation m where m.product_id=p.id and m.hidden)));
$$;
