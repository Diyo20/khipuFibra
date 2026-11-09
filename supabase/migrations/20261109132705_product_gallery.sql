-- Applied on 2026-11-09 after Diego's explicit authorization.
-- Filename matches the version recorded by the hosted migration tool.
-- Keep image_url as the main photograph; store up to two additional photographs.
-- No row is deleted and no existing privilege or policy is broadened.
alter table public.productos add column gallery_urls text[] not null default '{}';
alter table public.productos add constraint product_gallery_limit check (
 cardinality(gallery_urls)<=2 and array_position(gallery_urls,null) is null
 and array_position(gallery_urls,'') is null
);

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
  from public.productos p join visible_profiles a on a.id=p.artisan_id and a.user_id=p.owner_id where p.publicado));
$$;
-- CREATE OR REPLACE preserves the existing function privileges. Its public
-- invoker wrapper and the active/visible/published filters remain unchanged.
