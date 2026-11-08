const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
function storage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
async function setup({enabled=true,role='artisan',status='active'}={}){
 const {document}=parseHTML(fs.readFileSync(path.join(__dirname,'../panel.html'),'utf8'));
 const calls=[],listeners={};let auth={user:{id:'a',user_metadata:{}},membership:{role,status},approved:role==='artisan'&&status==='active'};
 const cloud={enabled,user:auth.user,membership:auth.membership,approved:auth.approved,init:async()=>auth,myProfile:async()=>({name:'Ana',bio:'',story:''}),myProducts:async()=>[],list:async()=>({profiles:[],products:[],reviews:[]}),clearPrivate:()=>calls.push(['clear'])};
 const window={khipuCloud:cloud,addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const location={search:'',replace:url=>calls.push(['redirect',url])};
 const localStorage=storage({khipuFibra_v2:JSON.stringify({logged:true,artisan:{name:'Old user'},favorites:['d1']})});
 class Image{set src(value){/* no real network in unit tests */}}
 const context=vm.createContext({window,document,location,localStorage,sessionStorage:storage(),structuredClone,URLSearchParams,Image,console,setTimeout});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/artisan-workspace.js'),'utf8'),context);
 vm.runInContext(source,context);await tick();
 return {document,calls,focus:()=>listeners.focus?.(),changeAccount:id=>{auth={...auth,user:{id}};cloud.user=auth.user;}};
}
test('private pages deny forged localStorage login when Supabase is unconfigured',async()=>{
 const {document,calls}=await setup({enabled:false});assert.deepEqual(calls,[['redirect','acceso.html']]);assert.equal(document.getElementById('app').textContent,'');
});
test('pending accounts and administrator use separate private routes',async()=>{
 const pending=await setup({status:'pending'});assert.ok(pending.calls.some(call=>call[1]==='acceso.html'));
 const admin=await setup({role:'admin'});assert.ok(admin.calls.some(call=>call[1]==='admin.html'));
});
test('switching accounts during focus revalidation removes the previous artisan panel',async()=>{
 const context=await setup();assert.match(context.document.getElementById('app').textContent,/Ana/);context.changeAccount('b');await context.focus();assert.equal(context.document.getElementById('app').textContent,'');assert.ok(context.calls.some(call=>call[1]==='acceso.html'));
});
