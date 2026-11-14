-- Local proposal; remote activation requires explicit authorization.
create table public.khipu_ai_limits (
 plan text primary key check(plan in ('basic','pro')),
 per_content integer not null check(per_content between 1 and 30),
 per_month integer not null check(per_month between 1 and 1000)
);
insert into public.khipu_ai_limits values('basic',2,20),('pro',6,100);
create table public.khipu_ai_plans (
 user_id uuid primary key references public.khipu_memberships(user_id) on delete cascade,
 plan text not null references public.khipu_ai_limits(plan),expires_at timestamptz not null
);
create table public.khipu_ai_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null,
 scope text not null,tool text not null,created_at timestamptz not null default now(),
 status text not null default 'reserved' check(status in ('reserved','succeeded','failed')),
 input_tokens integer,output_tokens integer
);
create index khipu_ai_requests_owner on public.khipu_ai_requests(user_id,scope,tool);
create index khipu_ai_requests_date on public.khipu_ai_requests(created_at);
alter table public.khipu_ai_limits enable row level security;
alter table public.khipu_ai_plans enable row level security;
alter table public.khipu_ai_requests enable row level security;
revoke all on public.khipu_ai_limits,public.khipu_ai_plans,public.khipu_ai_requests from public,anon,authenticated;

create function khipu_private.khipu_ai_scope(p_user uuid,p_tool text,p_entity uuid) returns text
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.khipu_memberships where user_id=p_user and status='active' and role in ('artisan','admin')) then raise exception 'Cuenta no autorizada.' using errcode='42501'; end if;
 if p_tool not in ('generate_product','generate_social_facebook','generate_social_instagram','generate_social_tiktok','generate_social_whatsapp','product_story','product_care','profile_bio','profile_story','profile_fair','social_facebook','social_instagram','social_tiktok','social_whatsapp','moderation','review','message') then raise exception 'Herramienta no válida.' using errcode='22023'; end if;
 if p_tool='moderation' and not exists(select 1 from public.khipu_memberships where user_id=p_user and status='active' and role='admin') then raise exception 'Administración requerida.' using errcode='42501'; end if;
 if p_tool like 'product_%' or p_tool like 'generate_%' or p_tool like 'social_%' then
  if p_entity is null then return 'product:draft'; end if;
  if not exists(select 1 from public.productos where id=p_entity and owner_id=p_user) then raise exception 'Este producto no pertenece a tu cuenta.' using errcode='42501'; end if;
  return 'product:'||p_entity;
 end if;
 return 'account';
end; $$;

create function khipu_private.khipu_ai_budget(p_user uuid,p_tool text,p_entity uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s text; chosen text; cap public.khipu_ai_limits; used_count integer; monthly integer;
begin
 if p_user is distinct from (select auth.uid()) and current_setting('role')<>'service_role' then raise exception 'No puedes consultar otra cuenta.' using errcode='42501';end if;
 s:=khipu_private.khipu_ai_scope(p_user,p_tool,p_entity);
 select plan into chosen from public.khipu_ai_plans where user_id=p_user and expires_at>now();chosen:=coalesce(chosen,'basic');
 select * into cap from public.khipu_ai_limits where plan=chosen;
 select count(*) into used_count from public.khipu_ai_requests where user_id=p_user and scope=s and tool=p_tool;
 select count(*) into monthly from public.khipu_ai_requests where user_id=p_user and created_at>=date_trunc('month',now());
 return jsonb_build_object('plan',chosen,'used',used_count,'limit',cap.per_content,'remaining',greatest(0,least(cap.per_content-used_count,cap.per_month-monthly)),'monthlyUsed',monthly,'monthlyLimit',cap.per_month);
end; $$;
create function public.khipu_ai_quota(p_tool text,p_entity uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select khipu_private.khipu_ai_budget((select auth.uid()),p_tool,p_entity);$$;

-- A reservation is consumed even if the upstream fails: it may already have incurred cost.
-- Only the verified Edge Function can reserve attempts, never the browser.
create function khipu_private.khipu_ai_reserve(p_user uuid,p_tool text,p_entity uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare budget jsonb; request_id uuid; s text;
begin
 perform pg_advisory_xact_lock(719843001);
 budget:=khipu_private.khipu_ai_budget(p_user,p_tool,p_entity);
 if (budget->>'remaining')::integer<=0 then return jsonb_build_object('allowed',false,'quota',budget,'error','Alcanzaste el límite de intentos de tu plan.'); end if;
 if (select count(*) from public.khipu_ai_requests where created_at>=date_trunc('day',now()))>=200 then return jsonb_build_object('allowed',false,'quota',budget,'error','Se alcanzó el límite diario de la plataforma.'); end if;
 s:=khipu_private.khipu_ai_scope(p_user,p_tool,p_entity);
 insert into public.khipu_ai_requests(user_id,scope,tool) values(p_user,s,p_tool) returning id into request_id;
 return jsonb_build_object('allowed',true,'requestId',request_id,'quota',khipu_private.khipu_ai_budget(p_user,p_tool,p_entity));
end; $$;
create function public.khipu_ai_reserve(p_user uuid,p_tool text,p_entity uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select khipu_private.khipu_ai_reserve(p_user,p_tool,p_entity);$$;
create function khipu_private.khipu_ai_finish(p_request uuid,p_success boolean,p_input integer,p_output integer) returns void
language sql security definer set search_path='' as $$update public.khipu_ai_requests set status=case when p_success then 'succeeded' else 'failed' end,input_tokens=p_input,output_tokens=p_output where id=p_request and status='reserved';$$;
create function public.khipu_ai_finish(p_request uuid,p_success boolean,p_input integer default null,p_output integer default null) returns void
language sql security invoker set search_path='' as $$select khipu_private.khipu_ai_finish(p_request,p_success,p_input,p_output);$$;

create function khipu_private.khipu_ai_settings(p_plan text default null,p_content integer default null,p_month integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 if (select auth.uid()) is null or not khipu_private.khipu_is_admin() then raise exception 'Administración requerida.' using errcode='42501';end if;
 if p_plan is not null then
  if p_plan not in ('basic','pro') or p_content is null or p_month is null then raise exception 'Configuración no válida.' using errcode='22023';end if;
  update public.khipu_ai_limits set per_content=p_content,per_month=p_month where plan=p_plan;
  insert into public.khipu_admin_events(actor_id,action,detail) values((select auth.uid()),'ai_limits_updated',jsonb_build_object('plan',p_plan,'per_content',p_content,'per_month',p_month));
 end if;
 return jsonb_build_object('plans',(select jsonb_agg(to_jsonb(l) order by plan) from public.khipu_ai_limits l));
end;$$;
create function public.khipu_ai_settings(p_plan text default null,p_content integer default null,p_month integer default null) returns jsonb
language sql security invoker set search_path='' as $$select khipu_private.khipu_ai_settings(p_plan,p_content,p_month);$$;

revoke all on function khipu_private.khipu_ai_scope(uuid,text,uuid),khipu_private.khipu_ai_budget(uuid,text,uuid),khipu_private.khipu_ai_reserve(uuid,text,uuid),khipu_private.khipu_ai_finish(uuid,boolean,integer,integer),khipu_private.khipu_ai_settings(text,integer,integer),public.khipu_ai_quota(text,uuid),public.khipu_ai_reserve(uuid,text,uuid),public.khipu_ai_finish(uuid,boolean,integer,integer),public.khipu_ai_settings(text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function khipu_private.khipu_ai_budget(uuid,text,uuid),public.khipu_ai_quota(text,uuid),khipu_private.khipu_ai_settings(text,integer,integer),public.khipu_ai_settings(text,integer,integer) to authenticated;
grant execute on function khipu_private.khipu_ai_reserve(uuid,text,uuid),public.khipu_ai_reserve(uuid,text,uuid),khipu_private.khipu_ai_finish(uuid,boolean,integer,integer),public.khipu_ai_finish(uuid,boolean,integer,integer) to service_role;
grant usage on schema khipu_private to service_role;

-- Saving the first draft must not grant a fresh set of AI attempts.
create function khipu_private.khipu_ai_adopt_draft() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.khipu_ai_requests set scope='product:'||new.id where user_id=new.owner_id and scope='product:draft';
 return new;
end;$$;
revoke all on function khipu_private.khipu_ai_adopt_draft() from public,anon,authenticated,service_role;
create trigger khipu_ai_adopt_draft after insert on public.productos for each row execute function khipu_private.khipu_ai_adopt_draft();
