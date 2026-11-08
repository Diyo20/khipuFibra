-- Legacy baseline for a FRESH database only. Existing projects must compare their schema
-- and mark this baseline as applied; see docs/FASE_1.md. Never replay blindly.
begin;
-- khipuFibra: ejecutar en SQL Editor del proyecto existente.
-- No elimina la tabla public.artesanas_autorizadas ya creada.
-- IMPORTANTE: la lista de correos se administra SOLO desde SQL Editor.

-- gen_random_uuid() is built into the supported PostgreSQL version.
create table if not exists public.artesanas_autorizadas (
 id uuid primary key default gen_random_uuid(),
 correo text not null unique,
 nombre text,
 activa boolean not null default true,
 creada_en timestamptz not null default now()
);
alter table public.artesanas_autorizadas enable row level security;
revoke all on public.artesanas_autorizadas from anon, authenticated;

-- Solo devuelve verdadero/falso para la persona que inició sesión.
-- La lista de correos NO se expone mediante SELECT público.
create or replace function public.soy_artesana_autorizada()
returns boolean language sql stable security definer
set search_path = ''
as $$
 select (select auth.uid()) is not null and exists(
  select 1 from public.artesanas_autorizadas a
  where lower(trim(a.correo))=lower(trim((select auth.jwt())->>'email'))
  and a.activa=true
 );
$$;
revoke all on function public.soy_artesana_autorizada() from public, anon;
grant execute on function public.soy_artesana_autorizada() to authenticated;

create table if not exists public.artesanas_perfiles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null unique check(length(name) between 2 and 100),
 city text not null default '', specialty text not null default '',
 bio text not null default '', story text not null default '',
 experience text not null default '', fair text not null default '',
 avatar_url text not null default '',
 facebook text not null default '', instagram text not null default '',
 tiktok text not null default '', youtube text not null default '',
 video text not null default '', whatsapp text not null default '',
 visible boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.artesanas_perfiles enable row level security;
revoke all on public.artesanas_perfiles from anon, authenticated;
grant select on public.artesanas_perfiles to anon, authenticated;
grant insert,update on public.artesanas_perfiles to authenticated;
create policy "ver perfiles públicos" on public.artesanas_perfiles for select to anon,authenticated using (visible=true or ((select auth.uid())=user_id and (select public.soy_artesana_autorizada())));
create policy "crear solo perfil propio autorizado" on public.artesanas_perfiles for insert to authenticated with check ((select auth.uid())=user_id and (select public.soy_artesana_autorizada()));
create policy "editar solo perfil propio autorizado" on public.artesanas_perfiles for update to authenticated using ((select auth.uid())=user_id and (select public.soy_artesana_autorizada())) with check ((select auth.uid())=user_id and (select public.soy_artesana_autorizada()));

create table if not exists public.productos (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 artisan_id uuid not null references public.artesanas_perfiles(id) on delete cascade,
 name text not null check (length(name) between 2 and 120),
 category text not null default 'Otros', material text not null default '',
 price numeric(10,2) check(price>=0),
 dimensions text not null default '', care text not null default '',
 story text not null default '', stock text not null default 'Disponible',
 collection text not null default '', image_url text not null default '',
 publicado boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.productos enable row level security;
revoke all on public.productos from anon,authenticated;
grant select on public.productos to anon,authenticated;
grant insert,update,delete on public.productos to authenticated;
create policy "ver productos publicados" on public.productos for select to anon,authenticated using (publicado=true or ((select auth.uid())=owner_id and (select public.soy_artesana_autorizada())));
create policy "crear productos propios" on public.productos for insert to authenticated with check (
 (select auth.uid())=owner_id and (select public.soy_artesana_autorizada())
 and exists (select 1 from public.artesanas_perfiles ap where ap.id=artisan_id and ap.user_id=(select auth.uid())));
create policy "editar productos propios" on public.productos for update to authenticated using ((select auth.uid())=owner_id and (select public.soy_artesana_autorizada())) with check ((select auth.uid())=owner_id and (select public.soy_artesana_autorizada()) and exists(select 1 from public.artesanas_perfiles ap where ap.id=artisan_id and ap.user_id=(select auth.uid())));
create policy "borrar productos propios" on public.productos for delete to authenticated using ((select auth.uid())=owner_id and (select public.soy_artesana_autorizada()));

-- Reseñas públicas solo una vez aprobadas por el administrador.
-- Los visitantes no pueden modificar ni aprobar comentarios.
create table if not exists public.valoraciones (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('product','artisan')),
 target text not null check(length(target) between 1 and 150),
 nombre text not null check(length(nombre) between 2 and 50),
 comentario text not null check(length(comentario) between 10 and 400),
 estrellas smallint not null check(estrellas between 1 and 5),
 aprobada boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.valoraciones enable row level security;
revoke all on public.valoraciones from anon,authenticated;
grant select,insert on public.valoraciones to anon, authenticated;
create policy "solo reseñas aprobadas" on public.valoraciones for select to anon,authenticated using (aprobada=true);
create policy "enviar reseña pendiente" on public.valoraciones for insert to anon,authenticated with check (aprobada=false);

-- Fotos alojadas en Supabase Storage. Acceso de subida por carpeta personal.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('productos','productos',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
create policy "lectura pública de fotos de productos" on storage.objects for select to anon,authenticated using(bucket_id='productos');
create policy "subida solo por artesana autorizada" on storage.objects for insert to authenticated
 with check(bucket_id='productos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.soy_artesana_autorizada()));

-- Foto opcional de la artesana
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('perfiles','perfiles',true,3145728,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
create policy "lectura pública de fotos de perfil" on storage.objects for select to anon,authenticated using(bucket_id='perfiles');
create policy "subida perfil artesana propia" on storage.objects for insert to authenticated
 with check(bucket_id='perfiles' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.soy_artesana_autorizada()));

-- IMPORTANTE: las credenciales de Meta se almacenarán posteriormente
-- en servidor/almacenamiento cifrado; NUNCA en artesanas_perfiles ni en JavaScript.

commit;
