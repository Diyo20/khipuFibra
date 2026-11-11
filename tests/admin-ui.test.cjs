const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const admin={user:{id:'admin'},membership:{role:'admin',status:'active'}};
async function setup(auth=admin){
 const {document}=parseHTML(fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8'));
 const calls=[],listeners={};let current=auth;
 const dataset={counts:{pending:1,active:1,suspended:0},members:[{user_id:'admin',role:'admin',status:'active',email:'admin@example.test',display_name:'Admin'},{user_id:'artisan',role:'artisan',status:'pending',email:'ana@example.test',display_name:'<img src=x onerror=alert(1)>'}],invitations:[],events:[]};
 const window={addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const cloud={enabled:true,init:async()=>current,adminData:async()=>{calls.push(['dashboard']);return dataset;},manageMember:async(...args)=>calls.push(['manage',...args]),inviteArtisan:async()=>({delivered:false,message:'Autorización guardada, correo no enviado.'})};window.khipuCloud=cloud;
 const location={replace:url=>calls.push(['redirect',url])};
 class FormData{constructor(form){this.form=form;}get(){return this.form.querySelector('input').value;}}
 const context=vm.createContext({window,document,location,FormData,Date,console});
 for(const file of ['admin-commerce.js','admin.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);
 await tick();
 // LinkeDOM has no dialog top layer or native select default selection.
 const select=document.getElementById('memberFilter');if(select)Object.defineProperty(select,'value',{writable:true,value:'all'});
 document.getElementById('refreshMembers')?.onclick();await tick();
 const select2=document.getElementById('memberFilter');if(select2)Object.defineProperty(select2,'value',{writable:true,value:'all'});
 // Re-render the list with the native default the browser would provide.
 if(select2)select2.onchange();
 const dialog=document.getElementById('adminConfirm');if(dialog){dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};}
 return {document,calls,cloud,setAuth:value=>{current=value;},emit:event=>listeners['khipu:auth-change'](event)};
}
test('unauthenticated and artisan accounts cannot load administrator data',async()=>{
 for(const auth of [{user:null},{user:{id:'a'},membership:{role:'artisan',status:'active'}}]){const {calls}=await setup(auth);assert.equal(calls.some(call=>call[0]==='dashboard'),false);}
});
test('administrator screen escapes names and requires confirmation before changing access',async()=>{
 const {document,calls}=await setup();assert.equal(document.querySelector('#memberList img'),null);assert.match(document.getElementById('memberList').textContent,/<img src=x/);
 document.querySelector('[data-action="approve"]').onclick();assert.equal(calls.some(call=>call[0]==='manage'),false);
 assert.equal(document.getElementById('adminConfirm').open,true);document.getElementById('confirmAction').onclick();await tick();assert.ok(calls.some(call=>call[0]==='manage'&&call[1]==='artisan'&&call[2]==='approve'));
});
test('invitation provider failure is displayed instead of a sent confirmation',async()=>{
 const {document}=await setup();const form=document.getElementById('inviteForm');document.getElementById('inviteEmail').value='ana@example.test';form.onsubmit({preventDefault(){},currentTarget:form});await tick();assert.match(document.getElementById('adminMessage').textContent,/no enviado/);assert.equal(document.getElementById('adminMessage').className,'notice');
});
test('changing accounts in another tab clears administrator details immediately',async()=>{
 const {document,calls,emit}=await setup();emit({detail:{event:'SIGNED_IN',userId:'artisan'}});assert.equal(document.getElementById('adminContent').textContent,'');assert.deepEqual(calls.at(-1),['redirect','acceso.html']);
});

test('admin navigation shows one section at a time and preserves access tools before commerce activation',async()=>{
 const app=await setup();app.cloud.adminCommerce=async()=>({available:false});
 assert.equal(app.document.getElementById('adminOverviewPanel').hidden,false);assert.equal(app.document.getElementById('adminAccessPanel').hidden,true);assert.equal(app.document.getElementById('adminCommercePanel').hidden,true);
 app.document.querySelector('[data-admin-view="access"]').onclick();assert.equal(app.document.getElementById('adminAccessPanel').hidden,false);assert.equal(app.document.getElementById('adminOverviewPanel').hidden,true);
 app.document.querySelector('[data-admin-view="commerce"]').onclick();await tick();assert.equal(app.document.getElementById('adminAccessPanel').hidden,true);assert.match(app.document.getElementById('adminCommercePanel').textContent,/pendiente de activación/);
 app.document.querySelector('[data-admin-view="history"]').onclick();assert.equal(app.document.getElementById('adminHistoryPanel').hidden,false);assert.equal(app.document.getElementById('adminCommercePanel').hidden,true);
});

test('admin summary reuses server counts without requesting commerce data and keeps every access action',async()=>{
 const app=await setup();let commerceReads=0;app.cloud.adminCommerce=async()=>{commerceReads++;return {available:false};};
 assert.deepEqual([...app.document.querySelectorAll('.admin-counts strong')].map(node=>node.textContent),['1','1','0']);
 assert.equal(app.document.querySelectorAll('[data-admin-view]').length,5);assert.equal(app.document.querySelectorAll('#adminLogout').length,1);
 const reads=app.calls.length;app.document.querySelector('[data-admin-go="access"]').onclick();assert.equal(app.calls.length,reads);assert.equal(commerceReads,0);
 assert.ok(app.document.querySelector('.role-badge'));assert.ok(app.document.querySelector('.state-pending'));assert.ok(app.document.getElementById('inviteForm'));assert.ok(app.document.querySelector('[data-action="approve"]'));
 app.document.querySelector('[data-admin-view="overview"]').onclick();assert.equal(app.document.getElementById('adminOverviewPanel').hidden,false);assert.equal(app.document.getElementById('adminAccessPanel').hidden,true);
});
