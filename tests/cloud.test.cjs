const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function storage(initial={}){const values=new Map(Object.entries(initial));return {get length(){return values.size;},getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),key:index=>[...values.keys()][index]};}
function setup(){
 const calls=[],sessionStorage=storage({'khipuFibra_private_a':'private draft','unrelated':'keep'}),localStorage=storage({khipuFibra_v2:JSON.stringify({artisan:{name:'private'},draft:{story:'private'},favorites:['d1']})});
 let callback;
 const auth={onAuthStateChange:fn=>{callback=fn;},getUser:async()=>({data:{user:{id:'a',email:'a@example.test'}},error:null}),signOut:async()=>({error:null})};
 for(const name of ['signInWithPassword','signUp','resetPasswordForEmail','updateUser','signInWithOAuth'])auth[name]=async(...args)=>{calls.push([name,...args]);return {data:{},error:null};};
 const api={auth,rpc:async name=>({data:name==='khipu_request_access'?{role:'artisan',status:'pending'}:null,error:null})};
 const events=[];
 const window={KHIPU_CONFIG:{supabaseUrl:'https://project.example',supabasePublishableKey:'public'},supabase:{createClient:()=>api},dispatchEvent:event=>events.push(event)};
 const context={window,location:{href:'https://preview.example/acceso.html',hash:''},sessionStorage,localStorage,URL,URLSearchParams,console,setTimeout,CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/cloud.js'),'utf8'),context);
 return {cloud:window.khipuCloud,api,calls,sessionStorage,localStorage,events,emit:(...args)=>callback(...args)};
}
test('cloud only approves active artisan memberships from server',async()=>{
 const {cloud,api}=setup();assert.equal((await cloud.init()).approved,false);
 api.rpc=async()=>({data:{role:'admin',status:'active'},error:null});assert.equal((await cloud.init()).approved,false);
 api.rpc=async()=>({data:{role:'artisan',status:'active'},error:null});assert.equal((await cloud.init()).approved,true);
 api.rpc=async()=>({data:{role:'artisan',status:'suspended'},error:null});assert.equal((await cloud.init()).approved,false);
});
test('sign-up and recovery only send expected fields and current-origin redirect',async()=>{
 const {cloud,calls}=setup();await cloud.requestAccount(' a@example.test ','a long password',' Ana ');await cloud.recoverPassword(' a@example.test ');
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),['signUp',{email:'a@example.test',password:'a long password',options:{emailRedirectTo:'https://preview.example/acceso.html',data:{full_name:'Ana'}}}]);
 assert.equal(calls[1][2].redirectTo,'https://preview.example/restablecer.html');
});
test('failed sign-out is reported; successful sign-out clears only private local data',async()=>{
 const {cloud,api,sessionStorage,localStorage}=setup();await cloud.init();
 api.auth.signOut=async()=>({error:{message:'Network failure'}});await assert.rejects(cloud.logout(),/Network failure/);assert.ok(cloud.user);
 api.auth.signOut=async()=>({error:null});await cloud.logout();assert.equal(cloud.user,null);assert.equal(sessionStorage.getItem('khipuFibra_private_a'),null);assert.equal(sessionStorage.getItem('unrelated'),'keep');assert.deepEqual(JSON.parse(localStorage.getItem('khipuFibra_v2')),{favorites:['d1']});
});
test('cross-tab sign-out clears data and dispatches outside the Auth callback',async()=>{
 const {cloud,emit,events,sessionStorage}=setup();await cloud.init();emit('SIGNED_OUT',null);
 assert.equal(cloud.user,null);assert.equal(events.length,0);assert.equal(sessionStorage.getItem('khipuFibra_private_a'),null);
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(events[0].detail.event,'SIGNED_OUT');
});
test('invitation errors show the server explanation without claiming a sent email',async()=>{
 const {cloud,api}=setup();api.functions={invoke:async()=>({error:{context:{json:async()=>({error:'Espera un minuto antes de reenviar la invitación.'})}}})};
 await assert.rejects(cloud.inviteArtisan('ana@example.test'),/Espera un minuto/);
 api.functions.invoke=async()=>({error:{message:'Network error'}});
 await assert.rejects(cloud.inviteArtisan('ana@example.test'),/No se pudo enviar/);
});

test('password updates validate length, preserve Auth codes and use SDK currentPassword and nonce',async()=>{
 const {cloud,api,calls}=setup();await assert.rejects(cloud.updatePassword('short'),/12/);assert.equal(calls.length,0);
 await cloud.updatePassword('a new long password',{currentPassword:'old password',nonce:'123456'});
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),['updateUser',{password:'a new long password',currentPassword:'old password',nonce:'123456'}]);
 api.auth.updateUser=async()=>({error:{message:'Reauthentication needed',code:'reauthentication_needed'}});
 await assert.rejects(cloud.updatePassword('a new long password'),error=>error.code==='reauthentication_needed');
});
test('security methods use verified user identities and Auth reauthentication',async()=>{
 const {cloud,api}=setup();api.auth.getUser=async()=>({data:{user:{id:'a',email:'ana@example.test',identities:[{provider:'google'}]}},error:null});
 assert.deepEqual(JSON.parse(JSON.stringify(await cloud.accountSecurity())),{userId:'a',email:'ana@example.test',passwordIdentity:false,googleIdentity:true});
 let sent=false;api.auth.reauthenticate=async()=>{sent=true;return {error:null};};await cloud.reauthenticate();assert.equal(sent,true);
});

test('commerce methods distinguish an undeployed migration and use only the audited RPC arguments',async()=>{
 const {cloud,api}=setup();api.rpc=async()=>({error:{code:'PGRST202',message:'Missing function'}});assert.equal((await cloud.adminCommerce()).available,false);
 let received;api.rpc=async(...args)=>{received=args;return {data:null,error:null};};await cloud.moderateCommerce('review','review-id','approve','  Motivo documentado  ');
 assert.deepEqual(JSON.parse(JSON.stringify(received)),['khipu_moderate_commerce',{record_kind:'review',record_id:'review-id',operation:'approve',reason_text:'Motivo documentado'}]);
 api.rpc=async()=>({error:{code:'42501',message:'Acceso exclusivo'}});await assert.rejects(cloud.adminCommerce(),error=>error.code==='42501');
});
