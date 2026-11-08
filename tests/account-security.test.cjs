const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({passwordIdentity=true,googleIdentity=false}={}){
 const {document,HTMLInputElement}=parseHTML('<html><body><section id="security"></section></body></html>');
 HTMLInputElement.prototype.setCustomValidity=function(value){this.validationMessage=value;};
 HTMLInputElement.prototype.reportValidity=function(){return !this.validationMessage;};
 document.createElement('form').constructor.prototype.reset=function(){this.querySelectorAll('input').forEach(input=>input.value='');};
 const calls=[],listeners={};let account={userId:'a',email:'ana@example.test',passwordIdentity,googleIdentity};
 const cloud={enabled:true,accountSecurity:async()=>account,updatePassword:async(...args)=>calls.push(['password',...args]),reauthenticate:async()=>calls.push(['reauthenticate']),logout:async()=>calls.push(['logout'])};
 const window={khipuCloud:cloud,addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:name=>delete listeners[name]};
 class FormData{constructor(form){this.values=new Map([...form.querySelectorAll('input')].map(input=>[input.name,input.value]));}get(key){return this.values.get(key)??null;}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/account-security.js'),'utf8'),{window,document,location:{replace:url=>calls.push(['redirect',url])},FormData});
 await window.khipuSecurity.mount(document.getElementById('security'));
 const form=document.querySelector('form');
 if(form){form.querySelector('[name=currentPassword]').value='old password';form.querySelector('[name=password]').value='a new long password';form.querySelector('[name=confirmation]').value='a new long password';}
 return {document,form,cloud,calls,setAccount:value=>account=value,submit:()=>form.onsubmit({preventDefault(){}}),emit:event=>listeners['khipu:auth-change']?.(event)};
}
test('password change validates confirmation and forwards current password without account mutation',async()=>{
 const context=await setup();context.form.querySelector('[name=confirmation]').value='different';context.submit();await tick();assert.equal(context.calls.length,0);
 context.form.querySelector('[name=confirmation]').value='a new long password';context.submit();await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(context.calls)),[['password','a new long password',{currentPassword:'old password',nonce:''}]]);
 assert.match(context.document.querySelector('[data-security-message]').textContent,/actualizada/);assert.equal(context.form.querySelector('[name=password]').value,'');
});
test('Google-only accounts get no conventional password form',async()=>{
 const {document,form}=await setup({passwordIdentity:false,googleIdentity:true});assert.equal(form,null);assert.match(document.getElementById('security').textContent,/desde tu cuenta de Google/);
});
test('reauthentication sends a code only when Auth requires it and retries with the nonce',async()=>{
 const context=await setup();let attempts=0;context.cloud.updatePassword=async(...args)=>{context.calls.push(['password',...args]);if(!attempts++)throw Object.assign(Error('recent login needed'),{code:'reauthentication_needed'});};
 context.submit();await tick();assert.ok(context.calls.some(call=>call[0]==='reauthenticate'));assert.equal(context.form.querySelector('[data-nonce-field]').hidden,false);
 context.form.querySelector('[name=nonce]').value='123456';context.submit();await tick();assert.equal(context.calls.at(-1)[2].nonce,'123456');assert.match(context.document.querySelector('[data-security-message]').textContent,/actualizada/);
});
test('failed and duplicate requests never report success or send concurrent changes',async()=>{
 const context=await setup();let release;context.cloud.updatePassword=()=>new Promise((resolve,reject)=>release=()=>reject(Object.assign(Error('incorrect current password'),{code:'invalid_credentials'})));
 context.submit();context.submit();await tick();assert.equal(context.form.querySelector('button[type=submit]').disabled,true);release();await tick();
 assert.match(context.document.querySelector('[data-security-message]').textContent,/actual no coincide/);assert.equal(context.form.querySelector('button[type=submit]').disabled,false);
});
test('account switching prevents a password update and sign-out removes private fields',async()=>{
 const context=await setup();context.setAccount({userId:'b'});context.submit();await tick();assert.equal(context.calls.some(call=>call[0]==='password'),false);assert.equal(context.document.querySelector('form'),null);
 const other=await setup();other.emit({detail:{event:'SIGNED_OUT'}});assert.equal(other.document.querySelector('form'),null);
});
