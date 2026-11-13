const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function setup({available=true,mutate=async()=>{},read,reload}={}){
 const {document}=parseHTML('<html><body><section id="root"></section></body></html>'),root=document.getElementById('root'),window={},calls=[];
 const dataset={available,products:[{id:'a',name:'Bolso algodón',artisan_name:'Ana',category:'Bolsos',material:'Algodón',price:0,publicado:true,stock:'Disponible'},{id:'b',name:'Cesto <img src=x onerror=alert(1)>',artisan_name:'Rosa',category:'Decoración',material:'Fibra',publicado:false,moderation_hidden:true}],reviews:[{id:'r1',kind:'product',target:'a',target_name:'Bolso',nombre:'Visitante',comentario:'<script>alert(1)</script>',estrellas:5,aprobada:false},{id:'r2',kind:'artisan',target:'Ana',nombre:'Cliente',comentario:'Trabajo artesanal excelente',estrellas:4,aprobada:true}]};
 let reads=0;
 const cloud={adminCommerce:read||(async()=>{if(reads++&&reload)await reload();return structuredClone(dataset);}),moderateCommerce:async(...args)=>{calls.push(args);await mutate(...args);if(args[0]==='product')dataset.products.find(p=>p.id===args[1]).moderation_hidden=args[2]==='hide';}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/admin-commerce.js'),'utf8'),{window,document});let saved=0;
 const mounted=window.khipuCommerce.mount(root,{cloud,onSaved:async()=>{saved++;}});if(!read)await mounted;
 const dialog=document.getElementById('commerceConfirm');if(dialog){dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;}
 for(const [id,value] of [['commerceStatus','all'],['commerceReviewFilter','pending']]){const select=document.getElementById(id);if(select)Object.defineProperty(select,'value',{writable:true,value});}
 return {root,document,calls,dataset,mounted,saved:()=>saved,submit:()=>document.getElementById('commerceConfirmForm').onsubmit({preventDefault(){}})};
}
test('commerce filters combine accent-insensitive search with state and escape all user content',async()=>{
 const app=await setup();assert.equal(app.document.querySelectorAll('.commerce-row').length,2);assert.equal(app.document.querySelector('img[src=x]'),null);assert.equal(app.document.querySelector('script'),null);
 app.document.getElementById('commerceSearch').value='algodon';app.document.getElementById('commerceSearch').oninput();assert.equal(app.document.querySelectorAll('.commerce-row').length,1);assert.match(app.document.querySelector('.commerce-row').textContent,/S\/ 0/);
 app.document.getElementById('commerceStatus').value='hidden';app.document.getElementById('commerceStatus').onchange();assert.equal(app.document.querySelectorAll('.commerce-row').length,0);
 app.document.getElementById('commerceReviewFilter').value='approved';app.document.getElementById('commerceReviewFilter').onchange();assert.equal(app.document.querySelectorAll('.commerce-review').length,1);assert.match(app.document.querySelector('.commerce-review').textContent,/Cliente/);
});
test('moderation requires a reason and sends only one request while the first is pending',async()=>{
 const pending=deferred(),app=await setup({mutate:()=>pending.promise});
 app.document.querySelector('[data-id="a"]').onclick();assert.equal(app.calls.length,0);await app.submit();assert.equal(app.calls.length,0);assert.match(app.document.getElementById('commerceConfirmError').textContent,/motivo/);
 app.document.getElementById('commerceReason').value='Revisar información del producto';const first=app.submit();await app.submit();assert.equal(app.calls.length,1);pending.resolve();await first;
 assert.deepEqual(app.calls[0],['product','a','hide','Revisar información del producto']);assert.equal(app.saved(),1);assert.match(app.document.getElementById('commerceMessage').textContent,/Cambio guardado/);
});
test('a failed write keeps the reason, restores controls and never reports success',async()=>{
 const app=await setup({mutate:async()=>{throw Error('Sin conexión');}});app.document.querySelector('[data-id="r1"]').onclick();app.document.getElementById('commerceReason').value='Comentario válido para publicar';await app.submit();
 assert.match(app.document.getElementById('commerceConfirmError').textContent,/Sin conexión/);assert.equal(app.document.getElementById('commerceReason').value,'Comentario válido para publicar');assert.equal(app.saved(),0);assert.equal(app.document.querySelector('#commerceConfirmForm button').disabled,false);
});
test('unactivated moderation shows an explanation without operational controls or private data after detachment',async()=>{
 const unavailable=await setup({available:false});assert.match(unavailable.root.textContent,/pendiente de activación/);assert.equal(unavailable.document.querySelector('[data-moderate-kind]'),null);
 const pending=deferred(),app=await setup({read:()=>pending.promise});app.root.remove();pending.resolve({available:true,products:[],reviews:[]});await app.mounted;assert.equal(app.root.textContent,'Cargando productos y valoraciones…');
});

test('saved moderation with a failed reload can refresh without replaying the decision or losing filters',async()=>{
 let failures=2;const app=await setup({reload:async()=>{if(failures-->0)throw Error('Sin conexión');}});
 const search=app.document.getElementById('commerceSearch');search.value='algodon';search.oninput();
 app.document.querySelector('[data-id="a"]').onclick();app.document.getElementById('commerceReason').value='Revisar información del producto';await app.submit();
 assert.equal(app.calls.length,1);assert.equal(app.document.getElementById('commerceConfirm').open,false);
 assert.match(app.document.getElementById('commerceMessage').textContent,/cambio quedó guardado/i);
 assert.equal(app.document.querySelector('[data-id="a"]').disabled,true);
 search.oninput();assert.equal(app.document.querySelector('[data-id="a"]').disabled,true);
 await app.submit();assert.equal(app.calls.length,1);
 await app.document.getElementById('commerceRefresh').onclick();
 assert.match(app.document.getElementById('commerceMessage').textContent,/Sin conexión/);
 await app.document.getElementById('commerceRefresh').onclick();
 assert.equal(app.calls.length,1);assert.equal(search.value,'algodon');assert.equal(app.document.querySelectorAll('.commerce-row').length,1);
 assert.equal(app.document.querySelector('[data-id="a"]').dataset.action,'restore');assert.equal(app.document.querySelector('[data-id="a"]').disabled,false);
 assert.equal(app.saved(),1);assert.equal(app.document.getElementById('commerceRefresh'),null);
});
