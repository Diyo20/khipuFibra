-- Role-backed smoke checks. All temporary users, products, objects and audit rows
-- live in a subtransaction that is deliberately rolled back. No email is sent.
do $$
declare
 original_role text:=current_user;
 test_admin uuid:=gen_random_uuid();
 test_a uuid:=gen_random_uuid();
 test_b uuid:=gen_random_uuid();
 profile_a uuid:=gen_random_uuid();
 profile_b uuid:=gen_random_uuid();
 product_a uuid:=gen_random_uuid();
 product_b uuid:=gen_random_uuid();
 member jsonb;
 catalog jsonb;
 affected integer;
begin
 begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
   (test_admin,'khipu-test-admin-'||test_admin||'@example.invalid',now(),'{}'),
   (test_a,'khipu-test-a-'||test_a||'@example.invalid',now(),'{"role":"admin","status":"active"}'),
   (test_b,'khipu-test-b-'||test_b||'@example.invalid',now(),'{}');

  -- A synthetic administrator is confined to this rolled-back test context.
  insert into public.khipu_memberships(user_id,email,role,status)
   values(test_admin,'khipu-test-admin-'||test_admin||'@example.invalid','admin','active');

  perform set_config('request.jwt.claim.sub',test_a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  member:=public.khipu_request_access();
  if member->>'role'<>'artisan' or member->>'status'<>'pending' then raise exception 'FAIL: metadata granted access'; end if;
  begin
   update public.khipu_memberships set role='admin' where user_id=test_a;
   raise exception 'FAIL: direct role change succeeded';
  exception when insufficient_privilege then null; end;
  begin
   perform public.khipu_admin_dashboard();
   raise exception 'FAIL: pending account accessed administration';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',test_b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_b,'role','authenticated')::text,true);
  perform public.khipu_request_access();

  perform set_config('request.jwt.claim.sub',test_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_admin,'role','authenticated')::text,true);
  perform public.khipu_manage_member(test_a,'approve');
  perform public.khipu_manage_member(test_b,'approve');

  perform set_config('request.jwt.claim.sub',test_a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_a,'role','authenticated')::text,true);
  insert into public.artesanas_perfiles(id,user_id,name) values(profile_a,test_a,'Smoke A '||test_a);
  insert into public.productos(id,owner_id,artisan_id,name,publicado) values(product_a,test_a,profile_a,'Smoke product A',true);
  insert into storage.objects(bucket_id,name) values('productos',test_a||'/probe.jpg');
  begin
   insert into storage.objects(bucket_id,name) values('productos',test_b||'/intrusion.jpg');
   raise exception 'FAIL: cross-owner file insert succeeded';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',test_b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_b,'role','authenticated')::text,true);
  insert into public.artesanas_perfiles(id,user_id,name) values(profile_b,test_b,'Smoke B '||test_b);
  insert into public.productos(id,owner_id,artisan_id,name,publicado) values(product_b,test_b,profile_b,'Smoke product B',true);

  perform set_config('request.jwt.claim.sub',test_a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_a,'role','authenticated')::text,true);
  if exists(select 1 from public.productos where id=product_b) then raise exception 'FAIL: private cross-owner read'; end if;
  update public.productos set name='intrusion' where id=product_b;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'FAIL: cross-owner update'; end if;
  delete from public.productos where id=product_b;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'FAIL: cross-owner delete'; end if;
  begin
   update public.productos set artisan_id=profile_b where id=product_a;
   raise exception 'FAIL: cross-owner attribution';
  exception when insufficient_privilege then null; end;

  -- The owner can preserve and reorder all three photographs. Cross-account
  -- writes and oversized galleries still fail under the existing policies.
  update public.productos set image_url='https://example.invalid/front.jpg',
   gallery_urls=array['https://example.invalid/side.jpg','https://example.invalid/detail.jpg'] where id=product_a;
  if not exists(select 1 from public.productos where id=product_a and cardinality(gallery_urls)=2) then raise exception 'FAIL: gallery persistence'; end if;
  begin
   update public.productos set gallery_urls=array['one','two','three'] where id=product_a;
   raise exception 'FAIL: gallery limit bypassed';
  exception when check_violation then null; end;
  update public.productos set image_url=gallery_urls[2],gallery_urls=array[image_url,gallery_urls[1]] where id=product_a;
  if not exists(select 1 from public.productos where id=product_a and image_url='https://example.invalid/detail.jpg' and gallery_urls[1]='https://example.invalid/front.jpg') then raise exception 'FAIL: gallery reorder'; end if;
  update public.productos set gallery_urls='{}' where id=product_b;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'FAIL: cross-owner gallery write'; end if;

  -- Reopen a saved draft, publish an edit, and delete a duplicate. This entire
  -- block is rolled back, so it cannot leave products or accounts behind.
  update public.productos set publicado=false,price=0,story='Persisted draft',care='Keep dry',dimensions='30 cm' where id=product_a;
  if not exists(select 1 from public.productos where id=product_a and not publicado and price=0 and story='Persisted draft' and care='Keep dry' and dimensions='30 cm') then raise exception 'FAIL: draft persistence'; end if;
  catalog:=public.khipu_public_catalog();
  if exists(select 1 from jsonb_array_elements(catalog->'products') p where p->>'id'=product_a::text) then raise exception 'FAIL: draft is public'; end if;
  update public.productos set publicado=true,price=null,stock='Agotado' where id=product_a;
  catalog:=public.khipu_public_catalog();
  if not exists(select 1 from jsonb_array_elements(catalog->'products') p where p->>'id'=product_a::text and p->>'stock'='Agotado' and p->'price'='null'::jsonb) then raise exception 'FAIL: published edit missing'; end if;
  if not exists(select 1 from jsonb_array_elements(catalog->'products') p where p->>'id'=product_a::text and jsonb_array_length(p->'photos')=2 and p->>'image_url'='https://example.invalid/detail.jpg') then raise exception 'FAIL: public gallery missing'; end if;
  insert into public.productos(owner_id,artisan_id,name,publicado) values(test_a,profile_a,'Smoke duplicate',false);
  delete from public.productos where owner_id=test_a and name='Smoke duplicate' and not publicado;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'FAIL: duplicate delete'; end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  catalog:=public.khipu_public_catalog();
  if not exists(select 1 from jsonb_array_elements(catalog->'products') p where p->>'id'=product_a::text) then raise exception 'FAIL: published product missing'; end if;
  if catalog::text like '%"owner_id"%' or catalog::text like '%"user_id"%' or catalog::text like '%"email"%' then raise exception 'FAIL: public catalog leaks private fields'; end if;
  begin
   perform 1 from public.khipu_memberships;
   raise exception 'FAIL: anonymous membership access';
  exception when insufficient_privilege then null; end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',test_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_admin,'role','authenticated')::text,true);
  perform public.khipu_manage_member(test_a,'suspend');
  perform set_config('request.jwt.claim.sub',test_a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_a,'role','authenticated')::text,true);
  if public.soy_artesana_autorizada() then raise exception 'FAIL: suspension did not revoke access'; end if;
  begin
   insert into storage.objects(bucket_id,name) values('productos',test_a||'/suspended.jpg');
   raise exception 'FAIL: suspended file upload';
  exception when insufficient_privilege then null; end;
  catalog:=public.khipu_public_catalog();
  if exists(select 1 from jsonb_array_elements(catalog->'products') p where p->>'id'=product_a::text) then raise exception 'FAIL: suspended product remains public'; end if;

  perform set_config('request.jwt.claim.sub',test_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_admin,'role','authenticated')::text,true);
  perform public.khipu_manage_member(test_a,'reactivate');
  execute format('set local role %I',original_role);
  if not exists(select 1 from public.productos where id=product_a) then raise exception 'FAIL: suspension removed product'; end if;
  if not exists(select 1 from public.khipu_admin_events where actor_id=test_admin and target_id=test_a and action='suspend') then raise exception 'FAIL: audit missing'; end if;

  -- An exception rolls back this entire inner block, including SET LOCAL ROLE.
  raise exception using errcode='PZ001',message='phase1_smoke_rollback';
 exception when sqlstate 'PZ001' then
  if sqlerrm<>'phase1_smoke_rollback' then raise; end if;
 end;
 if exists(select 1 from auth.users where id in (test_admin,test_a,test_b)) then raise exception 'FAIL: test users persisted'; end if;
 if exists(select 1 from public.productos where id in (product_a,product_b)) then raise exception 'FAIL: test products persisted'; end if;
end;
$$;
select jsonb_build_object('passed',true,'temporary_data_rolled_back',true,
 'checks',jsonb_build_array('pending_access','role_escalation_denied','admin_approval','own_product_and_storage','gallery_persistence','gallery_reorder','gallery_limit','public_gallery','draft_persistence','published_edit','duplicate_delete','cross_owner_denied','public_catalog_privacy','suspension','reactivation','audit','rollback')) as phase1_smoke;
