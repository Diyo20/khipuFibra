const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..');

test('Phase 1 migrations enforce real PostgreSQL permissions and account transitions',async t=>{
 const db=new PGlite();
 t.after(()=>db.close());
 const ids={admin:'10000000-0000-0000-0000-000000000001',a:'10000000-0000-0000-0000-000000000002',b:'10000000-0000-0000-0000-000000000003',pending:'10000000-0000-0000-0000-000000000004',unverified:'10000000-0000-0000-0000-000000000005',invite:'10000000-0000-0000-0000-000000000006',expired:'10000000-0000-0000-0000-000000000007',legacySuspended:'10000000-0000-0000-0000-000000000008',legacyInvite:'10000000-0000-0000-0000-000000000009'};
 // Minimal Supabase platform contracts. SQL policies/migrations are unmodified.
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
 create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema auth,storage,public to anon,authenticated,service_role;
 grant execute on function auth.uid(),auth.jwt(),storage.foldername(text) to anon,authenticated,service_role;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 `);
 for(const [name,id] of Object.entries(ids))await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)',[id,name+'@example.test',name==='unverified'?null:new Date().toISOString(),JSON.stringify({full_name:name,role:'admin',status:'active'})]);
 // The connected project already has this partial schema. Preserve its data.
 await db.exec("create table public.artesanas_autorizadas(id uuid primary key default gen_random_uuid(),correo text not null unique,nombre text,activa boolean not null default true,creada_en timestamptz not null default now());");
 await db.query("insert into public.artesanas_autorizadas(correo,activa) values('a@example.test',true),('legacysuspended@example.test',false),('legacyinvite@example.test',true)");
 const migrationFiles=fs.readdirSync(path.join(root,'supabase/migrations'));
 const migration=suffix=>fs.readFileSync(path.join(root,'supabase/migrations',migrationFiles.find(file=>file.endsWith(suffix))),'utf8');
 await db.exec(migration('_legacy_baseline.sql'));
 assert.equal((await db.query('select count(*)::int n from public.artesanas_autorizadas')).rows[0].n,3);
 await db.exec(migration('_phase1_access.sql'));
 async function as(user,sql,params=[]){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[user?JSON.stringify({sub:ids[user],email:user+'@example.test',role:'authenticated'}):'{}']);
  await db.exec('set role '+(user?'authenticated':'anon'));
  try{return await db.query(sql,params);}finally{await db.exec('reset role');}
 }
 const rpc=(user,name,args=[],params=[])=>as(user,`select public.${name}(${args.join(',')}) as value`,params).then(result=>result.rows[0].value);
 async function denied(user,sql,params=[]){await assert.rejects(as(user,sql,params));}
 const profileA='20000000-0000-0000-0000-000000000001',profileB='20000000-0000-0000-0000-000000000002';
 const productA='30000000-0000-0000-0000-000000000001',productB='30000000-0000-0000-0000-000000000002';

 await t.test('anonymous callers cannot request or manage accounts',async()=>{
  await denied(null,'select public.khipu_request_access()');
  await denied(null,'select * from public.khipu_memberships');
  await denied(null,'select public.khipu_admin_dashboard()');
 });
 await t.test('public API wrappers never run as definer; private implementations enforce privileges',async()=>{
  const exposed=await db.query("select proname from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and prosecdef");
  assert.deepEqual(exposed.rows,[]);
  await denied(null,'select khipu_private.khipu_request_access()');
  await denied('pending','select khipu_private.khipu_bootstrap_admin($1)',[ids.pending]);
 });
 await t.test('legacy authorization and suspension survive migration',async()=>{
  assert.equal((await rpc('a','khipu_request_access')).status,'active');
  assert.equal((await rpc('legacySuspended','khipu_request_access')).status,'suspended');
  assert.equal((await rpc('legacyInvite','khipu_request_access')).status,'active');
 });
 await t.test('user-controlled admin metadata never grants an administrator role',async()=>{
  const member=await rpc('pending','khipu_request_access');
  assert.equal(member.role,'artisan');assert.equal(member.status,'pending');
  assert.equal(await rpc('pending','soy_artesana_autorizada'),false);
  assert.deepEqual(await rpc('pending','khipu_request_access'),member);
  await denied('pending',"update public.khipu_memberships set role='admin',status='active'");
  await denied('pending',"select public.khipu_manage_member($1,'approve')",[ids.pending]);
  await denied('pending','select public.khipu_bootstrap_admin($1)',[ids.pending]);
 });
 await t.test('unconfirmed email cannot create an access request',async()=>{
  await denied('unverified','select public.khipu_request_access()');
 });
 await t.test('bootstrap is SQL-owner-only and cannot be replayed',async()=>{
  await db.query('select public.khipu_bootstrap_admin($1)',[ids.admin]);
  assert.equal((await rpc('admin','khipu_request_access')).role,'admin');
  await assert.rejects(db.query('select public.khipu_bootstrap_admin($1)',[ids.a]));
  await denied('admin','select public.khipu_bootstrap_admin($1)',[ids.a]);
 });
 await t.test('only admin can approve; duplicate and admin-target actions fail',async()=>{
  await rpc('b','khipu_request_access');
  await rpc('admin','khipu_manage_member',['$1',"'approve'"],[ids.b]);
  assert.equal(await rpc('b','soy_artesana_autorizada'),true);
  await denied('admin',"select public.khipu_manage_member($1,'approve')",[ids.b]);
  await denied('admin',"select public.khipu_manage_member($1,'suspend')",[ids.admin]);
  await denied('a','select public.khipu_admin_dashboard()');
 });
 await t.test('active artisans create own profiles and products',async()=>{
  await as('a','insert into public.artesanas_perfiles(id,user_id,name,whatsapp) values($1,$2,$3,$4)',[profileA,ids.a,'Artesana A','999999991']);
  await as('b','insert into public.artesanas_perfiles(id,user_id,name,whatsapp) values($1,$2,$3,$4)',[profileB,ids.b,'Artesana B','999999992']);
  for(const [user,profile,product] of [['a',profileA,productA],['b',profileB,productB]])await as(user,'insert into public.productos(id,owner_id,artisan_id,name,publicado) values($1,$2,$3,$4,true)',[product,ids[user],profile,'Producto '+user]);
 });
 await t.test('pending accounts cannot create products or upload files',async()=>{
  await denied('pending','insert into public.artesanas_perfiles(user_id,name) values($1,$2)',[ids.pending,'Pendiente']);
  await denied('pending',"insert into storage.objects(bucket_id,name) values('productos',$1)",[ids.pending+'/foto.jpg']);
 });
 await t.test('cross-account reads, writes, deletes and ownership changes are blocked',async()=>{
  assert.equal((await as('a','select * from public.artesanas_perfiles where user_id=$1',[ids.b])).rows.length,0);
  assert.equal((await as('a',"update public.artesanas_perfiles set name='intrusion' where user_id=$1 returning id",[ids.b])).rows.length,0);
  assert.equal((await as('a','select * from public.productos where id=$1',[productB])).rows.length,0);
  assert.equal((await as('a',"update public.productos set name='intrusion' where id=$1 returning id",[productB])).rows.length,0);
  assert.equal((await as('a','delete from public.productos where id=$1 returning id',[productB])).rows.length,0);
  await denied('a','update public.productos set owner_id=$1 where id=$2',[ids.b,productA]);
  await denied('a','insert into public.productos(owner_id,artisan_id,name) values($1,$2,$3)',[ids.a,profileB,'Atribución falsa']);
  await denied('a','update public.productos set artisan_id=$1 where id=$2',[profileB,productA]);
  await denied('a',"insert into storage.objects(bucket_id,name) values('productos',$1)",[ids.b+'/foto.jpg']);
  await as('a',"insert into storage.objects(bucket_id,name) values('productos',$1)",[ids.a+'/foto.jpg']);
 });
 await t.test('public catalog includes published work without private account identifiers',async()=>{
  const catalog=await rpc(null,'khipu_public_catalog');
  assert.equal(catalog.profiles.length,2);assert.equal(catalog.products.length,2);
  const serialized=JSON.stringify(catalog);
  for(const privateKey of ['owner_id','user_id','email'])assert.equal(serialized.includes('"'+privateKey+'"'),false);
  await denied(null,'select * from public.artesanas_perfiles');
  await denied(null,'select * from public.productos');
 });
 await t.test('gallery preserves main images, limits extra photographs and keeps ownership checks',async()=>{
  await db.exec(migration('_product_gallery.sql'));
  await as('a','update public.productos set gallery_urls=$1 where id=$2',[['https://storage.example/a/detail.jpg'],productA]);
  const product=(await rpc(null,'khipu_public_catalog')).products.find(p=>p.id===productA);
  assert.deepEqual(product.photos,['https://storage.example/a/detail.jpg']);
  assert.equal((await as('b',"update public.productos set gallery_urls='{}' where id=$1 returning id",[productA])).rows.length,0);
  await denied('a',"update public.productos set gallery_urls=array['one','two','three'] where id=$1",[productA]);
  await denied('a',"update public.productos set gallery_urls=array[null::text] where id=$1",[productA]);
  await as('a',"update public.productos set gallery_urls='{}' where id=$1",[productA]);
 });
 await t.test('commerce moderation is admin-only, keeps durable holds and audits product and review decisions',async()=>{
  await db.exec(migration('_admin_commerce.sql'));
  const moderate=(user,kind,id,action,reason='Motivo documentado de prueba')=>rpc(user,'khipu_moderate_commerce',['$1','$2','$3','$4'],[kind,id,action,reason]);
  for(const user of [null,'a','pending']){
   await denied(user,'select public.khipu_admin_commerce()');
   await assert.rejects(moderate(user,'product',productA,'hide'));
  }
  for(const user of ['admin','a',null])await denied(user,'select * from public.khipu_product_moderation');
  const reviewId='40000000-0000-0000-0000-000000000001';
  await db.query("insert into public.valoraciones(id,kind,target,nombre,comentario,estrellas) values($1,'product',$2,'Visitante','Comentario pendiente de revisión',5)",[reviewId,productA]);
  const commerce=await rpc('admin','khipu_admin_commerce');assert.equal(commerce.products.length,2);assert.equal(commerce.reviews.length,1);assert.equal(commerce.reviews[0].aprobada,false);
  await moderate('admin','product',productA,'hide');
  await as('a','update public.productos set publicado=true where id=$1',[productA]);
  assert.equal((await rpc(null,'khipu_public_catalog')).products.some(p=>p.id===productA),false);
  const mine=await rpc('a','khipu_my_product_status');assert.equal(mine[0].hidden,true);assert.equal(mine[0].id,productA);assert.equal((await rpc('b','khipu_my_product_status')).length,0);
  assert.equal(JSON.stringify(await rpc(null,'khipu_public_catalog')).includes('Motivo documentado'),false);
  await moderate('admin','product',productA,'restore');
  assert.equal((await as('a','select publicado from public.productos where id=$1',[productA])).rows[0].publicado,false);
  await as('a','update public.productos set publicado=true where id=$1',[productA]);assert.equal((await rpc(null,'khipu_public_catalog')).products.length,2);
  await moderate('admin','review',reviewId,'approve');assert.equal((await as(null,'select id from public.valoraciones where id=$1',[reviewId])).rows.length,1);
  await denied('a','update public.valoraciones set aprobada=true where id=$1',[reviewId]);
  await moderate('admin','review',reviewId,'hide');assert.equal((await as(null,'select id from public.valoraciones where id=$1',[reviewId])).rows.length,0);
  const events=(await db.query("select * from public.khipu_admin_events where action in ('product_hide','product_restore','review_approve','review_hide')")).rows;
  assert.equal(events.length,4);assert.ok(events.every(event=>event.actor_id===ids.admin&&event.detail.reason==='Motivo documentado de prueba'));
  await assert.rejects(moderate('admin','product',productA,'hide',''));await assert.rejects(moderate('admin','product',productA,'approve'));
  assert.equal((await db.query("select count(*)::int n from public.khipu_admin_events where action in ('product_hide','product_restore','review_approve','review_hide')")).rows[0].n,4);
  const privileged=(await db.query("select proname from pg_proc where pronamespace='public'::regnamespace and proname in ('khipu_admin_commerce','khipu_my_product_status','khipu_moderate_commerce') and prosecdef")).rows;assert.equal(privileged.length,0);
 });
 await t.test('suspension revokes access with an existing JWT and hides catalog without deleting',async()=>{
  await rpc('admin','khipu_manage_member',['$1',"'suspend'"],[ids.a]);
  assert.equal(await rpc('a','soy_artesana_autorizada'),false);
  await denied('a','insert into public.productos(owner_id,artisan_id,name) values($1,$2,$3)',[ids.a,profileA,'Bloqueado']);
  await denied('a',"insert into storage.objects(bucket_id,name) values('productos',$1)",[ids.a+'/bloqueado.jpg']);
  assert.equal((await rpc(null,'khipu_public_catalog')).products.length,1);
  assert.equal((await db.query('select count(*)::int n from public.productos')).rows[0].n,2);
  await rpc('admin','khipu_manage_member',['$1',"'reactivate'"],[ids.a]);
  assert.equal((await rpc(null,'khipu_public_catalog')).products.length,2);
 });
 await t.test('hidden profiles and unpublished products stay out of the public catalog',async()=>{
  await as('a','update public.artesanas_perfiles set visible=false where id=$1',[profileA]);
  assert.equal((await rpc(null,'khipu_public_catalog')).products.length,1);
  await as('a','update public.artesanas_perfiles set visible=true where id=$1',[profileA]);
  await as('a','update public.productos set publicado=false where id=$1',[productA]);
  assert.equal((await rpc(null,'khipu_public_catalog')).products.length,1);
 });
 await t.test('rejection is durable across logins and can only be changed by admin',async()=>{
  await rpc('admin','khipu_manage_member',['$1',"'reject'"],[ids.pending]);
  assert.equal((await rpc('pending','khipu_request_access')).status,'rejected');
  await rpc('admin','khipu_manage_member',['$1',"'reactivate'"],[ids.pending]);
  assert.equal((await rpc('pending','khipu_request_access')).status,'active');
 });
 await t.test('invitation requires admin, confirmed email and a non-expired authorization',async()=>{
  await denied('a',"select public.khipu_prepare_invitation('invite@example.test')");
  const invitation=await rpc('admin','khipu_prepare_invitation',['$1'],['invite@example.test']);
  assert.ok(invitation.id);
  await denied('admin',"select public.khipu_prepare_invitation('invite@example.test')");
  assert.equal((await rpc('invite','khipu_request_access')).status,'active');
  assert.equal((await db.query('select status from public.khipu_invitations where id=$1',[invitation.id])).rows[0].status,'claimed');
  await db.query("insert into public.khipu_invitations(email,expires_at) values('expired@example.test',now()-interval '1 hour')");
  assert.equal((await rpc('expired','khipu_request_access')).status,'pending');
  await denied('admin',"select public.khipu_prepare_invitation('a@example.test')");
 });
 await t.test('revoked invitations cannot activate accounts and browser cannot forge delivery',async()=>{
  const invitation=await rpc('admin','khipu_prepare_invitation',['$1'],['revoked@example.test']);
  await rpc('admin','khipu_revoke_invitation',['$1'],[invitation.id]);
  await denied('admin','select public.khipu_invitation_delivery($1,true)',[invitation.id]);
  const revoked='10000000-0000-0000-0000-000000000099';
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'revoked@example.test',now())",[revoked]);ids.revoked=revoked;
  assert.equal((await rpc('revoked','khipu_request_access')).status,'pending');
 });
 await t.test('audit is private and immutable from every browser account',async()=>{
  const dashboard=await rpc('admin','khipu_admin_dashboard');
  assert.ok(dashboard.events.some(event=>event.action==='suspend'&&event.target_id===ids.a));
  assert.ok(dashboard.events.some(event=>event.action==='approve'&&event.actor_id===ids.admin));
  for(const user of ['admin','a',null]){
   await denied(user,'delete from public.khipu_admin_events');
   await denied(user,"insert into public.khipu_admin_events(action) values('forged')");
  }
 });
 await t.test('invitation quota is enforced in SQL even when bypassing the interface',async()=>{
  const prepared=(await db.query("select count(*)::int n from public.khipu_admin_events where action='invitation_prepared' and actor_id=$1",[ids.admin])).rows[0].n;
  for(let i=prepared;i<10;i++)await rpc('admin','khipu_prepare_invitation',['$1'],[`quota${i}@example.test`]);
  await denied('admin',"select public.khipu_prepare_invitation('over-quota@example.test')");
 });
 await t.test('hosted smoke script succeeds and rolls back its synthetic accounts',async()=>{
  const before=(await db.query('select count(*)::int n from auth.users')).rows[0].n;
  await db.exec(fs.readFileSync(path.join(root,'supabase/tests/phase1_remote_smoke.sql'),'utf8'));
  const after=(await db.query('select count(*)::int n from auth.users')).rows[0].n;
  assert.equal(after,before);
 });
 await t.test('commerce smoke script validates moderation and rolls back all fixtures',async()=>{
  const before=(await db.query('select count(*)::int n from auth.users')).rows[0].n;
  await db.exec(fs.readFileSync(path.join(root,'supabase/tests/commerce_remote_smoke.sql'),'utf8'));
  assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,before);
 });
 await t.test('AI attempts are reserved only by the server, persist across saves, and honor plans and expiry',async()=>{
  await db.exec(migration('_writing_assistance.sql'));
  const reserve=async(tool,entity=null,user=ids.a)=>{await db.exec('set role service_role');try{return (await db.query('select public.khipu_ai_reserve($1,$2,$3) as value',[user,tool,entity])).rows[0].value;}finally{await db.exec('reset role');}};
  await denied('a','select * from public.khipu_ai_requests');
  await denied('a','select public.khipu_ai_reserve($1,$2,null)',[ids.a,'product_story']);
  await denied('a','select khipu_private.khipu_ai_budget($1,$2,null)',[ids.b,'profile_bio']);
  await denied(null,"select public.khipu_ai_quota('product_story',null)");
  await denied('a',"select public.khipu_ai_settings('basic',30,1000)");
  const before=await rpc('a','khipu_ai_quota',["'product_story'",'null']);assert.equal(before.remaining,2);
  assert.equal((await reserve('product_story')).quota.remaining,1);
  assert.equal((await reserve('product_story')).quota.remaining,0);
  assert.equal((await reserve('product_story')).allowed,false);
  // A saved draft adopts its reservations instead of resetting attempts.
  const saved='30000000-0000-0000-0000-000000000077';
  await as('a','insert into public.productos(id,owner_id,artisan_id,name) values($1,$2,$3,$4)',[saved,ids.a,profileA,'Borrador con voz']);
  assert.equal((await rpc('a','khipu_ai_quota',["'product_story'",'$1'],[saved])).remaining,0);
  await assert.rejects(reserve('product_story',productB));
  await assert.rejects(reserve('moderation'));
  await assert.rejects(reserve('profile_bio',null,ids.unverified));
  await db.query("insert into public.khipu_ai_plans(user_id,plan,expires_at) values($1,'pro',now()+interval '1 day')",[ids.a]);
  assert.equal((await rpc('a','khipu_ai_quota',["'product_story'",'$1'],[saved])).remaining,4);
  await db.query("update public.khipu_ai_plans set expires_at=now()-interval '1 day' where user_id=$1",[ids.a]);
  assert.equal((await rpc('a','khipu_ai_quota',["'product_story'",'$1'],[saved])).plan,'basic');
  await rpc('admin','khipu_ai_settings',["'basic'",'3','2']);
  assert.equal((await reserve('profile_bio')).allowed,false); // account monthly limit is shared across tools
  assert.equal((await db.query("select count(*)::int n from public.khipu_admin_events where action='ai_limits_updated'")).rows[0].n,1);
  await db.exec(fs.readFileSync(path.join(root,'supabase/tests/writing_remote_smoke.sql'),'utf8'));
 });
   await t.test('image quotas preserve owner checks, server-only reservations and plan limits',async()=>{
    await db.exec(migration('_product_image_ai.sql'));
    await denied(null,"select public.khipu_ai_quota('generate_image',null)");
    await denied('a','select public.khipu_ai_reserve($1,$2,null)',[ids.a,'generate_image']);
    await assert.rejects(rpc('a','khipu_ai_quota',["'generate_image'",'$1'],[productB]));
    const quota=await rpc('a','khipu_ai_quota',["'generate_image'",'null']);assert.equal(quota.plan,'basic');assert.equal(quota.remaining,0); // monthly cap already used in previous test
    await db.exec('set role service_role');try{const denied=await db.query("select public.khipu_ai_reserve($1,'generate_image',null) as value",[ids.a]);assert.equal(denied.rows[0].value.allowed,false);}finally{await db.exec('reset role');}
    await db.exec(fs.readFileSync(path.join(root,'supabase/tests/images_remote_smoke.sql'),'utf8'));
   });
   await t.test('Yape requests require private ownership and verified payments before activating or renewing Pro',async()=>{
  await db.exec(migration('_plans_yape.sql'));
  const pub=await rpc(null,'khipu_plan_public');assert.equal(pub.settings.enabled,false);assert.equal(pub.requests,undefined);
  await denied(null,'select public.khipu_plan_my()');await denied('a','select public.khipu_plan_admin()');
  await denied('a','select * from public.khipu_plan_payments');
  await assert.rejects(rpc('a','khipu_plan_submit',['$1','null','19'],['primera referencia']));
  await assert.rejects(rpc('admin','khipu_plan_config',['19',"'Titular'","'Pagar el importe exacto'","''",'true']));
  const qr=ids.admin+'/qr.png',proof=ids.a+'/proof.png';
  await as('admin',"insert into storage.objects(bucket_id,name) values('plan-qr',$1)",[qr]);
  await denied('a',"insert into storage.objects(bucket_id,name) values('plan-qr',$1)",[ids.a+'/fake.png']);
  await as('a',"insert into storage.objects(bucket_id,name) values('plan-proofs',$1)",[proof]);
  assert.equal((await as('b',"select * from storage.objects where bucket_id='plan-proofs'")).rows.length,0);
  assert.equal((await as(null,"select * from storage.objects where bucket_id='plan-proofs'")).rows.length,0);
  await denied('b',"insert into storage.objects(bucket_id,name) values('plan-proofs',$1)",[proof]);
  assert.equal((await as('admin',"select * from storage.objects where bucket_id='plan-proofs'")).rows.length,1);
  await rpc('admin','khipu_plan_config',['19',"'Titular real'","'Comprobar el titular y pagar 19 soles'",'$1','true'],[qr]);
  await assert.rejects(rpc('b','khipu_plan_submit',["'captura ajena'",'$1','19'],[proof]));
  await assert.rejects(rpc('a','khipu_plan_submit',["'precio falso'",'null','1']));
  const pending=await rpc('a','khipu_plan_submit',["'pago uno'",'$1','19'],[proof]);
  assert.equal(pending.status,'pending');assert.equal((await rpc('a','khipu_plan_my')).plan,'basic');
  await assert.rejects(rpc('a','khipu_plan_submit',["'duplicado'",'null','19']));
  await denied('a','select public.khipu_plan_decide($1,$2,$3,$4,true)',[pending.id,'approve','Motivo suficiente','real-001']);
  await assert.rejects(rpc('admin','khipu_plan_decide',['$1',"'approve'","'Revisado'","'real-001'",'false'],[pending.id]));
  await rpc('admin','khipu_plan_decide',['$1',"'approve'","'Abono comprobado en cuenta'","'real-001'",'true'],[pending.id]);
  const first=await rpc('a','khipu_plan_my');assert.equal(first.plan,'pro');
  await assert.rejects(rpc('admin','khipu_plan_decide',['$1',"'approve'","'Repetir'","'real-001'",'true'],[pending.id]));
  const renewal=await rpc('a','khipu_plan_submit',["'pago dos'",'null','19']);
  await assert.rejects(rpc('admin','khipu_plan_decide',['$1',"'approve'","'Misma referencia'","'real-001'",'true'],[renewal.id]));
  assert.equal((await rpc('a','khipu_plan_my')).expires_at,first.expires_at);
  await rpc('admin','khipu_plan_decide',['$1',"'approve'","'Renovación comprobada'","'real-002'",'true'],[renewal.id]);
  assert.ok(new Date((await rpc('a','khipu_plan_my')).expires_at)>new Date(first.expires_at));
  await rpc('admin','khipu_plan_adjust',['$1',"now()-interval '1 minute'","'Finalización solicitada'"],[ids.a]);
  assert.equal((await rpc('a','khipu_plan_my')).plan,'basic');
  assert.equal((await as('b','select public.khipu_plan_my() as value')).rows[0].value.requests.length,0);
  assert.equal((await db.query("select count(*)::int n from public.khipu_admin_events where action='plan_approve'")).rows[0].n,2);
  await db.exec(fs.readFileSync(path.join(root,'supabase/tests/plans_remote_smoke.sql'),'utf8'));
 });
});
