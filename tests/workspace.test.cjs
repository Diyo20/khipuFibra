const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function setup(page,{search='',rows=[],overrides={},wait=true}={}){
 const dom=parseHTML(fs.readFileSync(path.join(__dirname,'..',page+'.html'),'utf8')),document=dom.document,calls=[];
 const auth={approved:true,user:{id:'a',user_metadata:{}},membership:{role:'artisan',status:'active'}};
 const cloud={enabled:true,...auth,init:async()=>auth,myProfile:async()=>({name:'Ana',whatsapp:'999999999'}),myProducts:async()=>structuredClone(rows),list:async options=>{calls.push(['list',options]);return {products:rows.filter(p=>p.published),profiles:[],reviews:[]};},clearPrivate(){},saveProduct:async(p,options)=>{calls.push(['save',structuredClone(p),options]);const id=p.id||'p-new';const product={...p,id,published:options.published};const i=rows.findIndex(p=>p.id===id);if(i<0)rows.push(product);else rows[i]=product;return {id,imageUrl:p.img};},...overrides};
 const location={search,href:'https://preview.example/'+page+'.html'+search,replace:url=>calls.push(['redirect',url]),reload:()=>calls.push(['reload'])};
 const window={khipuCloud:cloud,addEventListener(){},innerWidth:390,confirm:()=>false,history:{replaceState:(a,b,url)=>calls.push(['history',url])}};
 const context=vm.createContext({window,document,location,localStorage:storage(),sessionStorage:storage(),structuredClone,URLSearchParams,URL,console:{...console,error(){}},setTimeout:()=>0,Intl});
 for(const file of ['storefront.js','artisan-workspace.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);
 const configure=()=>{for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{writable:true,configurable:true,value:select.querySelector('option[selected]')?.textContent||select.querySelector('option')?.textContent||''});const form=document.getElementById('productForm');if(form)form.reportValidity=()=>true;};
 if(wait){await tick();configure();}
 return {document,cloud,calls,rows,window,location,configure,input:(id,value)=>{const input=document.getElementById(id);input.value=value;input.dispatchEvent(new dom.window.Event('input'));},submit:()=>document.getElementById('productForm').onsubmit({preventDefault(){}})};
}
test('new editor saves a durable draft, reuses its ID and publishes only after explicit approvals',async()=>{
 const app=await setup('nuevo'),{document,input,submit,rows,calls}=app;
 input('prodName','Mi bolso');input('prodMaterial','Algodón');input('approveTextArea','Una pieza hecha a mano.');
 await submit();assert.equal(rows.length,1);assert.equal(rows[0].published,false);assert.equal(rows[0].story,'Una pieza hecha a mano.');assert.match(document.getElementById('saveStatus').textContent,/Borrador guardado/);
 await submit();assert.equal(rows.length,1);assert.equal(calls.filter(c=>c[0]==='save')[1][1].id,'p-new');
 assert.equal(document.getElementById('publishProduct').disabled,true);
 const image='https://storage.example/a/photo.jpg';rows[0].img=image;
 const edit=await setup('nuevo',{search:'?editar=p-new',rows});
 edit.document.getElementById('approveText').onclick();edit.document.getElementById('approveImage').onclick();assert.equal(edit.document.getElementById('publishProduct').disabled,false);
 await edit.document.getElementById('publishProduct').onclick();assert.equal(rows.length,1);assert.equal(rows[0].published,true);
 edit.input('approveTextArea','Cambio pendiente de revisión');assert.equal(edit.document.getElementById('publishProduct').disabled,true);
});
test('pending saves are not duplicated and failures preserve user input without success messages',async()=>{
 const request=deferred();let count=0;
 const app=await setup('nuevo',{overrides:{saveProduct:()=>{count++;return request.promise;}}});app.input('prodName','Mi producto');
 const first=app.submit();await app.submit();assert.equal(count,1);request.reject(Error('Sin conexión'));await first;
 assert.equal(app.document.getElementById('prodName').value,'Mi producto');assert.match(app.document.getElementById('saveStatus').textContent,/No se guardó: Sin conexión/);assert.equal(app.document.getElementById('productFields').disabled,false);
});
test('panel shows only server-owned records and requires confirmation before deletion',async()=>{
 const rows=[{id:'own',name:'Mi producto',published:false,price:0,category:'Bolsos',stock:'Disponible'}];let deletions=0;
 const app=await setup('panel',{rows,overrides:{deleteProduct:async()=>{deletions++;}}});
 assert.equal(app.document.querySelectorAll('[data-owned-product]').length,1);assert.equal(app.document.querySelectorAll('.workspace-actions>a').length,4);assert.doesNotMatch(app.document.getElementById('app').textContent,/Bolso Amanecer/);
 await app.document.querySelector('[data-product-action=delete]').onclick();assert.equal(deletions,0);
});
test('private editor rejects a missing or foreign product ID instead of creating an accidental copy',async()=>{
 const app=await setup('nuevo',{search:'?editar=foreign'});assert.equal(app.document.getElementById('productForm'),null);assert.match(app.document.getElementById('app').textContent,/No se encontró este producto en tu cuenta/);
});
test('public catalog completes while Auth is unresolved and never requests a private profile',async()=>{
 const auth=deferred();let privateReads=0;
 const app=await setup('catalogo',{overrides:{init:()=>auth.promise,myProfile:async()=>{privateReads++;throw Error('Must not run');}}});
 assert.equal(privateReads,0);assert.equal(app.document.querySelectorAll('[data-product-id]').length,6);assert.equal(app.calls[0][1].reviews,false);assert.equal(app.document.getElementById('search').disabled,false);
});
test('home renders the client title before catalog or Auth resolve; unknown real products stay in a loading state',async()=>{
 const data=deferred(),auth=deferred();const overrides={init:()=>auth.promise,list:()=>data.promise};
 const home=await setup('index',{overrides,wait:false});assert.match(home.document.getElementById('homeTitle').textContent,/Hecho a mano/);assert.equal(home.document.querySelector('.hero-accent').textContent,'Compartido con el mundo.');
 const product=await setup('producto',{overrides,search:'?id=real',wait:false});assert.match(product.document.getElementById('app').textContent,/Cargando información/);assert.doesNotMatch(product.document.getElementById('app').textContent,/No encontramos/);
});
test('profile failure keeps entered data and re-enables saving, with associated labels',async()=>{
 const app=await setup('mi-perfil',{overrides:{saveProfile:async()=>{throw Error('Sin conexión');}}});
 const form=app.document.getElementById('profileForm');app.document.getElementById('profileName').value='Nuevo nombre';
 assert.ok(app.document.querySelector('label[for=profileName]'));
 await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(app.document.getElementById('profileName').value,'Nuevo nombre');assert.match(app.document.querySelector('.toast').textContent,/No se guardó/);assert.equal(app.location.href,'https://preview.example/mi-perfil.html');assert.equal(form.querySelector('button[type=submit]').disabled,false);
});

test('profile save sends every field and optional photo to the server before navigating',async()=>{
 let saved,uploads=0;const app=await setup('mi-perfil',{overrides:{uploadAvatar:async()=>{uploads++;return 'https://storage.example/profile.jpg';},saveProfile:async value=>{saved=structuredClone(value);}}});
 const values={profileName:'Ana Artesana',profileCity:'Lambayeque',profileSpecialty:'Tejido',profileBio:'Mi historia',profileStory:'Mi oficio',profileWhatsapp:'999999999',profileExperience:'10 años',profileFair:'Feria local',profileVideo:'https://youtube.com/watch?v=abcdefghijk',facebook:'https://facebook.com/ana',instagram:'https://instagram.com/ana',youtube:'https://youtube.com/@ana',tiktok:'https://tiktok.com/@ana'};
 for(const [id,value] of Object.entries(values))app.document.getElementById(id).value=value;
 Object.defineProperty(app.document.getElementById('profileAvatar'),'files',{value:[{name:'foto.jpg'}]});
 const form=app.document.getElementById('profileForm');await form.onsubmit({preventDefault(){},currentTarget:form});
 assert.equal(uploads,1);assert.equal(saved.name,'Ana Artesana');assert.equal(saved.city,'Lambayeque');assert.equal(saved.bio,'Mi historia');assert.equal(saved.story,'Mi oficio');assert.equal(saved.experience,'10 años');assert.equal(saved.fair,'Feria local');assert.equal(saved.avatar,'https://storage.example/profile.jpg');assert.equal(saved.tiktok,values.tiktok);assert.match(app.location.href,/artesana.html\?nombre=Ana%20Artesana/);
});
