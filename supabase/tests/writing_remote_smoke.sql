-- No provider calls. Synthetic records are rolled back before this block finishes.
do $$
declare original_role name:=current_user; u uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); budget jsonb; reservation jsonb; n integer;
begin
 begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(u,'writing-'||u||'@example.invalid',now(),'{}');
  insert into public.khipu_memberships(user_id,email,role,status) values(u,'writing-'||u||'@example.invalid','artisan','active');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',u::text,true);
  execute 'set local role authenticated';
  budget:=public.khipu_ai_quota('product_story',null);
  if (budget->>'used')::integer<>0 then raise exception 'FAIL: unexpected initial usage';end if;
  begin perform public.khipu_ai_reserve(u,'product_story',null);raise exception 'FAIL: browser reserved credits';exception when insufficient_privilege then null;end;
  begin perform 1 from public.khipu_ai_requests;raise exception 'FAIL: browser read private usage';exception when insufficient_privilege then null;end;
  execute 'set local role service_role';
  n:=(budget->>'remaining')::integer;
  if n>0 then
   for i in 1..n loop reservation:=public.khipu_ai_reserve(u,'product_story',null);if not (reservation->>'allowed')::boolean then raise exception 'FAIL: reservation rejected';end if;end loop;
  end if;
  reservation:=public.khipu_ai_reserve(u,'product_story',null);
  if (reservation->>'allowed')::boolean then raise exception 'FAIL: limit bypassed';end if;
  execute 'set local role authenticated';
  insert into public.artesanas_perfiles(id,user_id,name) values(a,u,'Writing fixture '||u);
  insert into public.productos(id,owner_id,artisan_id,name) values(p,u,a,'Writing fixture');
  budget:=public.khipu_ai_quota('product_story',p);
  if (budget->>'remaining')::integer<>0 then raise exception 'FAIL: saving draft reset quota';end if;
  execute format('set local role %I',original_role);
  raise exception using errcode='PZ003',message='writing_smoke_rollback';
 exception when sqlstate 'PZ003' then if sqlerrm<>'writing_smoke_rollback' then raise;end if;end;
 if exists(select 1 from auth.users where id=u) or exists(select 1 from public.khipu_ai_requests where user_id=u) then raise exception 'FAIL: synthetic data persisted';end if;
end;$$;
select jsonb_build_object('passed',true,'temporary_data_rolled_back',true,'provider_calls',0) as writing_smoke;
