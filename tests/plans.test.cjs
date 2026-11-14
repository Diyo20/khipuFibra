const {test}=require('node:test'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom'),vm=require('vm'),fs=require('fs'),path=require('path');
const data=()=>({settings:{price:19,enabled:true,recipient:'Titular del proyecto',instructions:'Verifica el titular y el importe.',qr_path:'qr.png'},limits:[{plan:'basic',per_content:2,per_month:20},{plan:'pro',per_content:6,per_month:100}],plan:'basic',expires_at:null,monthly_used:1,requests:[],subscriptions:[]});
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};}
async function setup({admin=false,overrides={}}={}){
 const dom=parseHTML('<html><body><div id="root"></div></body></html>'),document=dom.document,root=document.getElementById('root'),calls=[],payload=data();
 const cloud={user:{id:'a'},planQR:()=> 'https://storage.example/qr.png',planMine:async()=>structuredClone(payload),planPublic:async()=>structuredClone(payload),planAdmin:async()=>structuredClone(payload),planSubmit:async(...args)=>{calls.push(['submit',...args]);payload.requests.push({id:'r1',reference:args[0],status:'pending',amount:19,created_at:'2026-11-13T00:00:00Z'});return {id:'r1'};},planConfigure:async args=>{calls.push(['config',args]);return null;},planDecide:async args=>{calls.push(['decide',args]);payload.requests[0].status=args.p_action==='approve'?'approved':'rejected';return null;},planUpload:async()=>{calls.push(['upload']);return 'a/proof.png';},...overrides};
 const window={khipuCloud:cloud};for(const file of ['plans.js',...(admin?['plan-admin.js']:[])])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),{window,document,Event:dom.window.Event});
 const mount=()=>admin?window.khipuPlanAdmin.mount(root,{cloud}):window.khipuPlans.mountMine(root,{cloud});await mount();
 if(admin){const dialog=document.getElementById('planDecisionDialog');if(dialog){dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;}}
 return {window,document,root,cloud,payload,calls,mount,submit:()=>document.getElementById('planRequestForm').onsubmit({preventDefault(){}})};
}
test('public plans use server quotas and never promise unavailable image or auto-publication tools',async()=>{
 const app=await setup();const html=app.window.khipuPlans.comparison(data());assert.match(html,/20/);assert.match(html,/100/);assert.match(html,/19/);assert.doesNotMatch(html,/mejora fotográfica|publicación automática|ilimitad/);
 const unavailable=app.window.khipuPlans.comparison({available:false});assert.match(unavailable,/Precio por confirmar/);assert.match(unavailable,/todavía no están habilitadas/);
});
test('sending a plan request never activates Pro and double submissions are blocked',async()=>{
 const wait=deferred();let submitted=0;const app=await setup({overrides:{planSubmit:async()=>{submitted++;await wait.promise;return {id:'r1'};}}});app.document.getElementById('paymentReference').value='operación 123';
 const first=app.submit();await app.submit();assert.equal(submitted,1);assert.match(app.root.textContent,/Khipu Básico/);wait.resolve();await first;assert.match(app.root.textContent,/Pro seguirá pendiente/);
});
test('failed submissions keep reference and reuse an uploaded proof on explicit retry',async()=>{
 const app=await setup({overrides:{planSubmit:async()=>{throw Error('Sin conexión');}}});const file={type:'image/png',size:50};app.document.getElementById('paymentReference').value='Mi referencia';Object.defineProperty(app.document.getElementById('paymentProof'),'files',{value:[file]});
 await app.submit();assert.equal(app.document.getElementById('paymentReference').value,'Mi referencia');assert.match(app.root.textContent,/Sin conexión/);assert.equal(app.document.querySelector('button[type=submit]').disabled,false);
 await app.submit();assert.equal(app.calls.filter(x=>x[0]==='upload').length,1);
});
test('a changed account never receives delayed private plan information',async()=>{
 const app=await setup(),wait=deferred();app.cloud.planMine=()=>wait.promise;const loading=app.mount();app.cloud.user={id:'b'};wait.resolve(data());await loading;assert.doesNotMatch(app.root.textContent,/Khipu Básico|Titular del proyecto/);
});
test('admin approval requires a real-payment confirmation and a reason before calling the server',async()=>{
 const d=data();d.requests=[{id:'r1',email:'a@example.test',display_name:'Ana <script>',amount:19,status:'pending',reference:'pago',created_at:'2026-11-13T00:00:00Z'}];
 const app=await setup({admin:true,overrides:{planAdmin:async()=>structuredClone(d),planDecide:async args=>{app.calls.push(['decide',args]);}}});
 app.document.querySelector('[data-plan-review][data-action=approve]').onclick();const form=app.document.getElementById('planDecisionForm');app.document.getElementById('planDecisionReason').value='Abono revisado';await form.onsubmit({preventDefault(){}});assert.equal(app.calls.length,0);assert.match(app.root.textContent,/Confirma el abono/);
 app.document.getElementById('verifiedPaymentReference').value='real-001';app.document.getElementById('planPaymentConfirmed').checked=true;await form.onsubmit({preventDefault(){}});assert.equal(app.calls[0][1].p_confirmed,true);assert.equal(app.root.querySelector('script'),null);
});
