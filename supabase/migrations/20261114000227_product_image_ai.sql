-- Add image editing to the existing atomic quota system; preserve grants and ownership checks.
create or replace function khipu_private.khipu_ai_scope(p_user uuid,p_tool text,p_entity uuid) returns text
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.khipu_memberships where user_id=p_user and status='active' and role in ('artisan','admin')) then raise exception 'Cuenta no autorizada.' using errcode='42501'; end if;
 if p_tool not in ('generate_image','generate_product','generate_social_facebook','generate_social_instagram','generate_social_tiktok','generate_social_whatsapp','product_story','product_care','profile_bio','profile_story','profile_fair','social_facebook','social_instagram','social_tiktok','social_whatsapp','moderation','review','message') then raise exception 'Herramienta no válida.' using errcode='22023'; end if;
 if p_tool='moderation' and not exists(select 1 from public.khipu_memberships where user_id=p_user and status='active' and role='admin') then raise exception 'Administración requerida.' using errcode='42501'; end if;
 if p_tool like 'product_%' or p_tool like 'generate_%' or p_tool like 'social_%' then
  if p_entity is null then return 'product:draft'; end if;
  if not exists(select 1 from public.productos where id=p_entity and owner_id=p_user) then raise exception 'Este producto no pertenece a tu cuenta.' using errcode='42501'; end if;
  return 'product:'||p_entity;
 end if;
 return 'account';
end; $$;
