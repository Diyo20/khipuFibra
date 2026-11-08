const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(page,auth,{enabled=true,google=null,authLinkError=false}={}){
 const html=fs.readFileSync(path.join(__dirname,'..',page+'.html'),'utf8');
 const {document,HTMLInputElement,HTMLFormElement}=parseHTML(html);
 HTMLInputElement.prototype.setCustomValidity=function(message){this.validationMessage=message;};
 HTMLInputElement.prototype.reportValidity=function(){return !this.validationMessage;};
 document.createElement('form').constructor.prototype.reset=function(){for(const input of this.querySelectorAll('input'))input.value='';};
 const calls=[],listeners={};
 let current=auth;
 const window={addEventListener:(type,fn)=>{listeners[type]=fn;}};
 const location={href:'https://preview.example/'+page+'.html',replace:url=>calls.push(['redirect',url])};
 const cloud={enabled,authLinkError,init:async()=>current,authSettings:async()=>google===null?null:{google},login:async()=>calls.push(['google']),loginWithPassword:async(email,password)=>calls.push(['password',email,password]),requestAccount:async(...values)=>calls.push(['signup',...values]),recoverPassword:async email=>calls.push(['recover',email]),updatePassword:async password=>calls.push(['update',password]),logout:async()=>{calls.push(['logout']);setImmediate(()=>listeners['khipu:auth-change']?.({detail:{event:'SIGNED_OUT'}}));}};
 window.khipuCloud=cloud;
 class FormData {constructor(form){this.values=new Map([...form.querySelectorAll('input')].map(input=>[input.name,input.value]));}get(key){return this.values.get(key)??null;}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/auth-ui.js'),'utf8'),{window,document,location,FormData,console});
 await tick();
 return {document,cloud,calls,setAuth:value=>{current=value;},emit:event=>listeners['khipu:auth-change']?.(event)};
}
const anonymous={user:null,membership:null};
test('Google is unavailable in the UI when disabled in Supabase',async()=>{
 const {document}=await setup('acceso',anonymous,{google:false});
 assert.equal(document.getElementById('googleLogin').disabled,true);
 assert.match(document.getElementById('googleNotice').textContent,/entra con tu correo/);
 assert.ok(document.getElementById('loginForm'));
});
test('unconfigured access never offers a one-click mock login',async()=>{
 const {document}=await setup('acceso',anonymous,{enabled:false});
 assert.match(document.querySelector('h1').textContent,/preparación/);
 assert.equal(document.getElementById('demoLogin'),null);assert.equal(document.getElementById('loginForm'),null);
});
test('login form exposes Google, email, password and recovery with associated labels',async()=>{
 const {document,calls}=await setup('acceso',anonymous);
 assert.ok(document.querySelector('label[for="email"]'));assert.ok(document.querySelector('label[for="password"]'));
 assert.ok(document.querySelector('a[href="recuperar.html"]'));
 document.getElementById('googleLogin').onclick();await tick();assert.equal(calls[0][0],'google');
 document.getElementById('email').value='ana@example.test';document.getElementById('password').value='a long password';
 document.getElementById('loginForm').onsubmit({preventDefault(){},currentTarget:document.getElementById('loginForm')});await tick();
 assert.deepEqual(calls[1],['password','ana@example.test','a long password']);
});
test('incorrect password gives a readable error and restores submit controls',async()=>{
 const {document,cloud}=await setup('acceso',anonymous);cloud.loginWithPassword=async()=>{throw Error('Invalid login credentials');};
 const form=document.getElementById('loginForm');form.onsubmit({preventDefault(){},currentTarget:form});await tick();
 assert.match(document.getElementById('accountMessage').textContent,/no coinciden/);assert.equal(form.querySelector('button').disabled,false);
});
test('active roles route to separate experiences; pending and suspended accounts cannot enter',async()=>{
 for(const [role,status,destination] of [['artisan','active','panel.html'],['admin','active','admin.html'],['artisan','pending',null],['artisan','suspended',null]]){
  const {document,calls}=await setup('acceso',{user:{id:'a',email:'ana@example.test'},membership:{role,status}});
  if(destination)assert.deepEqual(calls[0],['redirect',destination]);else{assert.equal(calls.length,0);assert.ok(document.getElementById('refreshAccess'));assert.equal(document.getElementById('loginForm'),null);}
 }
});
test('registration requires matching passwords and sends no role or approval',async()=>{
 const {document,calls}=await setup('acceso',anonymous);document.getElementById('showRegistration').onclick();
 document.getElementById('fullName').value='Ana';document.getElementById('email').value='ana@example.test';document.getElementById('password').value='a long password';document.getElementById('passwordConfirm').value='different';
 const form=document.getElementById('registerForm');const event={preventDefault(){},currentTarget:form};form.onsubmit(event);assert.equal(calls.length,0);
 document.getElementById('passwordConfirm').value='a long password';form.onsubmit(event);await tick();
 assert.deepEqual(calls[0],['signup','ana@example.test','a long password','Ana']);assert.match(document.getElementById('accountMessage').textContent,/confirmarlo/);
});
test('recovery responds generically without revealing account existence',async()=>{
 const {document,calls}=await setup('recuperar',anonymous);document.getElementById('email').value='ana@example.test';const form=document.getElementById('recoveryForm');form.onsubmit({preventDefault(){},currentTarget:form});await tick();
 assert.deepEqual(calls[0],['recover','ana@example.test']);assert.match(document.getElementById('accountMessage').textContent,/Si existe una cuenta/);
});
test('reset rejects a missing session and preserves success after the asynchronous sign-out event',async()=>{
 const invalid=await setup('restablecer',anonymous);assert.equal(invalid.document.getElementById('resetForm'),null);
 const {document,calls}=await setup('restablecer',{user:{id:'a'},membership:{role:'artisan',status:'pending'}});
 document.getElementById('password').value='a long password';document.getElementById('passwordConfirm').value='a long password';const form=document.getElementById('resetForm');form.onsubmit({preventDefault(){},currentTarget:form});await tick();await tick();
 assert.deepEqual(calls,[['update','a long password'],['logout']]);assert.equal(document.querySelector('h1').textContent,'Contraseña guardada');
});
test('rapid login clicks only send one request',async()=>{
 const {document,cloud}=await setup('acceso',anonymous);let count=0,release;cloud.loginWithPassword=()=>{count++;return new Promise(resolve=>{release=resolve;});};
 const form=document.getElementById('loginForm');const event={preventDefault(){},currentTarget:form};form.onsubmit(event);form.onsubmit(event);assert.equal(count,1);release();await tick();
});

test('a reset link error is not bypassed by an existing session; Google-only users get no password form',async()=>{
 const context=await setup('restablecer',{user:{id:'a',identities:[{provider:'google'}]}});assert.equal(context.document.getElementById('resetForm'),null);assert.match(context.document.querySelector('main').textContent,/Google/);
 const other=await setup('restablecer',{user:{id:'a',identities:[{provider:'email'}]}},{authLinkError:true});
 assert.equal(other.document.getElementById('resetForm'),null);assert.match(other.document.querySelector('h1').textContent,/ya no/);
});
