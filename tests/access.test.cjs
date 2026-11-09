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
});
