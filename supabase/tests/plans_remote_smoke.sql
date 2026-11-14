-- SQL permissions/workflow only. No payment or upload is performed; fixtures roll back.
do $$
declare original_role name:=current_user;u uuid:=gen_random_uuid();a uuid:=gen_random_uuid();q text;request jsonb;
begin
 begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(u,'plan-artisan-'||u||'@example.invalid',now(),'{}'),(a,'plan-admin-'||a||'@example.invalid',now(),'{}');
  insert into public.khipu_memberships(user_id,email,role,status) values(u,'plan-artisan-'||u||'@example.invalid','artisan','active'),(a,'plan-admin-'||a||'@example.invalid','admin','active');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',u::text,true);execute 'set local role authenticated';
  begin perform public.khipu_plan_admin();raise exception 'FAIL: artisan admin access';exception when insufficient_privilege then null;end;
  begin perform 1 from public.khipu_plan_payments;raise exception 'FAIL: browser read payment table';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',a::text,true);
  q:=a||'/smoke-qr.png';insert into storage.objects(bucket_id,name) values('plan-qr',q);
  perform public.khipu_plan_config(19,'Titular sintético','Configuración sintética para comprobar permisos.',q,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',u::text,true);
  request:=public.khipu_plan_submit('Referencia sintética',null,19);
  if public.khipu_plan_my()->>'plan'<>'basic' then raise exception 'FAIL: pending payment activated Pro';end if;
  begin perform public.khipu_plan_decide((request->>'id')::uuid,'approve','Comprobación de prueba','smoke-'||u,true);raise exception 'FAIL: artisan approved payment';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',a::text,true);
  begin perform public.khipu_plan_decide((request->>'id')::uuid,'approve','Comprobación de prueba','smoke-'||u,false);raise exception 'FAIL: unverified approval';exception when invalid_parameter_value then null;end;
  perform public.khipu_plan_decide((request->>'id')::uuid,'approve','Abono sintético verificado','smoke-'||u,true);
  begin perform public.khipu_plan_decide((request->>'id')::uuid,'approve','Repetición de prueba','smoke-'||u,true);raise exception 'FAIL: duplicate approval';exception when invalid_parameter_value then null;end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',u::text,true);
  if public.khipu_plan_my()->>'plan'<>'pro' then raise exception 'FAIL: approved Pro not active';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.khipu_plan_adjust(u,now()-interval '1 minute','Vencimiento sintético para verificación');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',u::text,true);
  if public.khipu_plan_my()->>'plan'<>'basic' then raise exception 'FAIL: expired Pro stayed active';end if;
  execute format('set local role %I',original_role);
  if (select count(*) from public.khipu_admin_events where actor_id=a and action='plan_approve')<>1 then raise exception 'FAIL: approval audit missing';end if;
  raise exception using errcode='PZ004',message='plans_smoke_rollback';
 exception when sqlstate 'PZ004' then if sqlerrm<>'plans_smoke_rollback' then raise;end if;
 end;
 if exists(select 1 from auth.users where id in(u,a)) or exists(select 1 from public.khipu_plan_payments where user_id=u) or exists(select 1 from storage.objects where bucket_id='plan-qr' and name=q) then raise exception 'FAIL: synthetic records persisted';end if;
end;$$;
select jsonb_build_object('passed',true,'temporary_data_rolled_back',true,'real_payments',0,'file_uploads',0) as plans_smoke;
