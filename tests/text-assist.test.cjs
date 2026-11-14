const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path'),{parseHTML}=require('linkedom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({remaining=2,pending,error,quotaPending}={}){
 const dom=parseHTML('<html><body data-page="nuevo"><textarea id="approveTextArea">texto dicho por mi.</textarea><input id="prodName"><input id="search" type="search"><input id="password" type="password"><input id="email" type="email"><input id="profileWhatsapp"><input id="prodPrice" type="number"><input id="nonce"><input type="url" id="facebook"><div id="dynamic"></div></body></html>');
 const document=dom.document,calls=[],listeners={};let used=0;
 const budget=()=>({plan:'basic',used,limit:remaining,remaining:remaining-used,monthlyUsed:used,monthlyLimit:20});
 const window={addEventListener:(name,fn)=>listeners[name]=fn,khipuCloud:{aiQuota:async()=>{if(quotaPending)await quotaPending;return budget();},improveText:async payload=>{calls.push(payload);if(pending)await pending;used++;if(error){const e=Error(error);e.quota=budget();throw e;}return {text:'Propuesta '+used,quota:budget()};}}};
 const context=vm.createContext({window,document,location:{search:''},URLSearchParams,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,setTimeout,clearTimeout});
 for(const file of ['writing-fields.js','voice-input.js','text-assist.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);
 const target=document.getElementById('approveTextArea'),box=document.querySelector('.text-assist');
 return {document,window,target,box,calls,listeners,buttons:()=>[...box.querySelectorAll('button')]};
}
test('all safe short fields and future dynamic fields receive dictation, sensitive fields never do',async()=>{
 const app=setup();for(const id of ['prodName','search'])assert.equal(app.document.getElementById(id).nextElementSibling.className,'voice-input voice-compact');
 for(const id of ['password','email','profileWhatsapp','prodPrice','nonce','facebook'])assert.notEqual(app.document.getElementById(id).nextElementSibling?.classList.contains('voice-input'),true);
 const field=app.document.createElement('textarea');app.document.getElementById('dynamic').append(field);await tick();assert.ok(field.id);assert.equal(field.nextElementSibling.className,'voice-input');
 assert.equal(app.document.querySelectorAll('.text-comparison .voice-input').length,0);
});
test('proposals compare without replacing original and regeneration always uses the initial text until quota is exhausted',async()=>{
 const app=setup();await app.buttons()[0].onclick();assert.equal(app.target.value,'texto dicho por mi.');assert.equal(app.box.querySelector('.text-comparison').hidden,false);
 await app.buttons()[2].onclick();assert.equal(app.calls.length,2);assert.equal(app.calls[0].source,app.calls[1].source);assert.equal(app.buttons()[2].disabled,true);assert.match(app.box.textContent,/0 disponibles/);
 let edits=0;app.target.addEventListener('input',()=>edits++);app.buttons()[1].onclick();assert.equal(app.target.value,'Propuesta 2');assert.equal(edits,1);
});
test('keep original and stale proposals never overwrite manual edits or another selected context',async()=>{
 const app=setup();await app.buttons()[0].onclick();app.target.value='Una corrección manual.';app.buttons()[1].onclick();assert.equal(app.target.value,'Una corrección manual.');assert.match(app.box.textContent,/cambió/);
 app.buttons()[3].onclick();assert.equal(app.target.value,'Una corrección manual.');assert.equal(app.calls.length,1);
});
test('failed generation keeps the original and honors remaining attempts from the server',async()=>{
 const app=setup({remaining:1,error:'Proveedor no disponible'});await app.buttons()[0].onclick();assert.equal(app.target.value,'texto dicho por mi.');assert.match(app.box.textContent,/Proveedor no disponible/);assert.match(app.box.textContent,/0 disponibles/);assert.equal(app.buttons()[2].disabled,true);
});
test('an exhausted account sends no generation, and accepting, dictating and keeping text do not call AI',async()=>{
 const app=setup({remaining:0});await app.buttons()[0].onclick();assert.equal(app.calls.length,0);assert.match(app.box.textContent,/límite/);
});
test('signing out while checking quota never sends the old private text for generation',async()=>{
 let resolve;const quotaPending=new Promise(yes=>resolve=yes),app=setup({quotaPending});const first=app.buttons()[0].onclick();
 app.listeners['khipu:auth-change']();resolve();await first;assert.equal(app.calls.length,0);assert.equal(app.target.value,'texto dicho por mi.');
});
test('repeated clicks during a pending improvement send one request and late responses are ignored after sign-out',async()=>{
 let resolve;const pending=new Promise(yes=>resolve=yes),app=setup({pending});const first=app.buttons()[0].onclick();await tick();await app.buttons()[0].onclick();assert.equal(app.calls.length,1);
 app.listeners['khipu:auth-change']();resolve();await first;assert.equal(app.box.querySelector('.text-comparison').hidden,true);assert.equal(app.target.value,'texto dicho por mi.');
});
