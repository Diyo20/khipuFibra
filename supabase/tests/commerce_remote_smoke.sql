-- Uses synthetic records inside a subtransaction that is always rolled back.
do $$
declare original_role name:=current_user;
 test_admin uuid:=gen_random_uuid(); test_artisan uuid:=gen_random_uuid();
 test_profile uuid:=gen_random_uuid(); test_product uuid:=gen_random_uuid(); test_review uuid:=gen_random_uuid();
 payload jsonb;
begin
 begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
   (test_admin,'commerce-admin-'||test_admin||'@example.invalid',now(),'{}'),
   (test_artisan,'commerce-artisan-'||test_artisan||'@example.invalid',now(),'{}');
  insert into public.khipu_memberships(user_id,email,role,status) values
   (test_admin,'commerce-admin-'||test_admin||'@example.invalid','admin','active'),
   (test_artisan,'commerce-artisan-'||test_artisan||'@example.invalid','artisan','active');
  perform set_config('request.jwt.claim.sub',test_artisan::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_artisan,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.artesanas_perfiles(id,user_id,name) values(test_profile,test_artisan,'Commerce fixture '||test_artisan);
  insert into public.productos(id,owner_id,artisan_id,name,publicado) values(test_product,test_artisan,test_profile,'Commerce fixture',true);
  insert into public.valoraciones(id,kind,target,nombre,comentario,estrellas) values(test_review,'product',test_product::text,'Visitante de prueba','Comentario sintético de verificación',5);
  begin
   perform public.khipu_moderate_commerce('product',test_product,'hide','Motivo de prueba');
   raise exception 'FAIL: artisan moderated a product';
  exception when insufficient_privilege then null; end;
  begin
   perform 1 from public.khipu_product_moderation;
   raise exception 'FAIL: direct moderation table access';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',test_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_admin,'role','authenticated')::text,true);
  payload:=public.khipu_admin_commerce();
  if not exists(select 1 from jsonb_array_elements(payload->'reviews')r where r->>'id'=test_review::text and not (r->>'aprobada')::boolean) then raise exception 'FAIL: pending review missing'; end if;
  perform public.khipu_moderate_commerce('product',test_product,'hide','Motivo de prueba');
  perform set_config('request.jwt.claim.sub',test_artisan::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_artisan,'role','authenticated')::text,true);
  update public.productos set publicado=true where id=test_product;
  payload:=public.khipu_public_catalog();
  if exists(select 1 from jsonb_array_elements(payload->'products')p where p->>'id'=test_product::text) then raise exception 'FAIL: administrative hold bypassed'; end if;
  payload:=public.khipu_my_product_status();
  if not exists(select 1 from jsonb_array_elements(payload)p where p->>'id'=test_product::text and (p->>'hidden')::boolean) then raise exception 'FAIL: owner status missing'; end if;

  perform set_config('request.jwt.claim.sub',test_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_admin,'role','authenticated')::text,true);
  perform public.khipu_moderate_commerce('product',test_product,'restore','Correcciones revisadas');
  if exists(select 1 from public.productos where id=test_product and publicado) then raise exception 'FAIL: restoration published automatically'; end if;
  perform public.khipu_moderate_commerce('review',test_review,'approve','Comentario revisado');
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{}',true);
  if not exists(select 1 from public.valoraciones where id=test_review) then raise exception 'FAIL: approved review not public'; end if;
  begin
   perform public.khipu_admin_commerce();raise exception 'FAIL: anonymous admin access';
  exception when insufficient_privilege then null; end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',test_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_admin,'role','authenticated')::text,true);
  perform public.khipu_moderate_commerce('review',test_review,'hide','Retirada tras revisión');
  begin
   perform public.khipu_moderate_commerce('product',test_product,'hide','');raise exception 'FAIL: missing reason accepted';
  exception when invalid_parameter_value then null; end;
  execute format('set local role %I',original_role);
  if (select count(*) from public.khipu_admin_events where actor_id=test_admin and target_id in (test_product,test_review) and detail ? 'reason')<>4 then raise exception 'FAIL: moderation audit missing'; end if;
  if exists(select 1 from public.valoraciones where id=test_review and aprobada) then raise exception 'FAIL: review not hidden'; end if;
  raise exception using errcode='PZ002',message='commerce_smoke_rollback';
 exception when sqlstate 'PZ002' then
  if sqlerrm<>'commerce_smoke_rollback' then raise; end if;
 end;
 if exists(select 1 from auth.users where id in (test_admin,test_artisan)) then raise exception 'FAIL: fixture accounts persisted'; end if;
 if exists(select 1 from public.productos where id=test_product) then raise exception 'FAIL: fixture product persisted'; end if;
end;
$$;
select jsonb_build_object('passed',true,'temporary_data_rolled_back',true,
 'checks',jsonb_build_array('admin_only','closed_moderation_table','pending_review_read','durable_product_hold','owner_status','restore_without_publication','review_approval','review_hiding','required_reason','audit','rollback')) as commerce_smoke;
