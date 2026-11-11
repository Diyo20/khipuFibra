const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function setup(page,{search='',rows=[],overrides={},wait=true}={}){
 const dom=parseHTML(fs.readFileSync(path.join(__dirname,'..',page+'.html'),'utf8')),document=dom.document,calls=[];
 const auth={approved:true,user:{id:'a',user_metadata:{}},membership:{role:'artisan',status:'active'}};
 const cloud={enabled:true,...auth,init:async()=>auth,myProfile:async()=>({name:'Ana',whatsapp:'999999999'}),myProducts:async()=>structuredClone(rows),list:async options=>{calls.push(['list',options]);return {products:rows.filter(p=>p.published),profiles:[],reviews:[]};},clearPrivate(){},saveProduct:async(p,options)=>{calls.push(['save',structuredClone(p),options]);const id=p.id||'p-new';const product={...p,id,published:options.published};const i=rows.findIndex(p=>p.id===id);if(i<0)rows.push(product);else rows[i]=product;return {id,imageUrl:p.img,photos:p.photos||[]};},...overrides};
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

test('private editor reopens every photo and keeps the selected main photo across saves',async()=>{
 const photos=['https://storage.example/a/front.jpg','https://storage.example/a/side.jpg','https://storage.example/a/detail.jpg'];
 const rows=[{id:'p-gallery',name:'Mi bolso',category:'Bolsos',material:'Algodón',price:85,img:photos[0],photos:photos.slice(1),story:'Creado a mano',stock:'Disponible',published:false}];
 const app=await setup('nuevo',{search:'?editar=p-gallery',rows});const editor=app.document.getElementById('galleryEditor');
 assert.equal(editor.querySelectorAll('img').length,3);assert.equal(app.document.getElementById('galleryPhoto').disabled,true);
 editor.onclick({target:editor.querySelector('[data-photo-main="2"]')});
 assert.equal(app.document.querySelector('#imagePreview img').src,photos[2]);
 await app.submit();assert.equal(rows.length,1);assert.equal(rows[0].img,photos[2]);assert.deepEqual(Array.from(rows[0].photos),[photos[0],photos[1]]);
 const reopened=await setup('nuevo',{search:'?editar=p-gallery',rows});assert.equal(reopened.document.querySelector('#imagePreview img').src,photos[2]);assert.equal(reopened.document.querySelectorAll('#galleryEditor img').length,3);
});

test('an older database keeps the additional photo control disabled while draft saving still works',async()=>{
 const app=await setup('nuevo',{overrides:{galleryEnabled:false}});assert.equal(app.document.getElementById('galleryPhoto').disabled,true);assert.match(app.document.getElementById('app').textContent,/galería ampliada aún no está activa/);
 app.input('prodName','Mi creación');await app.submit();assert.equal(app.rows.length,1);assert.match(app.document.getElementById('saveStatus').textContent,/Borrador guardado/);
});

test('missing profiles redirect before product fields or uploads are available',async()=>{
 let reads=0;const app=await setup('nuevo',{overrides:{myProfile:async()=>null,myProducts:async()=>{reads++;return [];}}});
 assert.ok(app.calls.some(call=>call[0]==='redirect'&&call[1]==='mi-perfil.html?primero=1'));assert.equal(app.document.getElementById('productForm'),null);assert.equal(reads,0);assert.equal(app.calls.filter(call=>call[0]==='save').length,0);
});

test('profile is the first workspace action and add-product links point to the prerequisite when missing',async()=>{
 const app=await setup('panel',{overrides:{myProfile:async()=>null}});const first=app.document.querySelector('.workspace-actions a');assert.equal(first.getAttribute('href'),'mi-perfil.html');assert.match(first.textContent,/Crear mi perfil/);
 assert.equal(app.document.querySelector('.side nav a:nth-child(2)').getAttribute('href'),'mi-perfil.html');assert.ok(app.document.getElementById('profileFirstNotice'));
 assert.equal(app.document.querySelectorAll('a[href="nuevo.html?crear=1"]').length,0);
});

test('saving the prerequisite profile continues to the product form only after the server confirms',async()=>{
 const app=await setup('mi-perfil',{search:'?primero=1',overrides:{myProfile:async()=>null,saveProfile:async()=>{}}});
 assert.match(app.document.querySelector('h1').textContent,/Crear mi perfil/);assert.match(app.document.querySelector('.profile-first-notice').textContent,/Primero guarda/);
 app.document.getElementById('profileName').value='Ana real';const form=app.document.getElementById('profileForm');await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(app.location.href,'nuevo.html?crear=1');
});

test('social generation and regeneration are both marked as AI and successful text remains editable',async()=>{
 const rows=[{id:'p1',name:'Bolso',artisan:'Ana',published:true,img:'https://storage.example/a/photo.jpg'}];const app=await setup('difusion',{rows,overrides:{generateDescription:async()=> 'Texto social generado para revisar'}});
 assert.match(app.document.querySelector('#generateSocial .ai-mark').textContent,/IA/);assert.match(app.document.querySelector('#retrySocial .ai-mark').textContent,/IA/);
 app.document.getElementById('shareProduct').value='p1';app.document.getElementById('shareChannel').value='facebook';await app.document.getElementById('generateSocial').onclick();assert.equal(app.document.getElementById('socialOrigin').hidden,false);assert.equal(app.document.getElementById('socialPreview').value,'Texto social generado para revisar');assert.equal(app.document.getElementById('shareNative').disabled,true);
});

test('an administrative hold remains visible and publishing stays disabled after review',async()=>{
 const rows=[{id:'held',name:'Pieza',material:'Algodón',img:'https://storage.example/front.jpg',photos:[],story:'Hecha a mano',category:'Textiles',moderationHidden:true,moderationReason:'Revisar información',published:false}];const app=await setup('nuevo',{search:'?editar=held',rows});
 assert.match(app.document.querySelector('.profile-first-notice').textContent,/Oculto por administración/);app.document.getElementById('approveImage').onclick();app.document.getElementById('approveText').onclick();assert.equal(app.document.getElementById('publishProduct').disabled,true);
 await app.submit();assert.equal(app.rows[0].published,false);
});

test('social regeneration prevents simultaneous requests and never approves a generated result automatically',async()=>{
 const pending=deferred();let calls=0;const rows=[{id:'p1',name:'Bolso',published:true,img:'https://storage.example/front.jpg'}];
 const app=await setup('difusion',{rows,overrides:{generateDescription:()=>{calls++;return pending.promise;}}});app.document.getElementById('shareProduct').value='p1';app.document.getElementById('shareChannel').value='facebook';
 const first=app.document.getElementById('generateSocial').onclick();await app.document.getElementById('retrySocial').onclick();assert.equal(calls,1);assert.equal(app.document.getElementById('shareProduct').disabled,true);
 pending.resolve('Texto generado');await first;assert.equal(app.document.getElementById('shareProduct').disabled,false);assert.equal(app.document.getElementById('approveSocial').disabled,false);assert.equal(app.document.getElementById('shareNative').disabled,true);
});

test('wizard navigation keeps the same controls and values without saving or generating',async()=>{
 let generations=0;const app=await setup('nuevo',{overrides:{generateDescription:async()=>{generations++;return 'Texto';}}});
 const {document}=app,name=document.getElementById('prodName'),description=document.getElementById('approveTextArea');
 app.input('prodName','Bolso <artesanal>');app.input('prodMaterial','Algodón');app.input('prodPrice','0');app.input('approveTextArea','Una historia escrita por mí.');
 assert.equal(document.getElementById('editorStep0').hidden,false);
 for(let step=1;step<4;step++){document.getElementById('editorNext').onclick();assert.equal(document.getElementById('editorStep'+step).hidden,false);assert.equal(document.querySelectorAll('[data-editor-panel]:not([hidden])').length,1);}
 assert.equal(document.getElementById('prodName'),name);assert.equal(document.getElementById('approveTextArea'),description);
 const review=document.getElementById('productReview');assert.match(review.textContent,/Bolso <artesanal>/);assert.equal(review.querySelector('artesanal'),null);assert.match(review.textContent,/S\/ 0/);assert.match(review.textContent,/Una historia escrita por mí/);
 assert.equal(document.getElementById('publishProduct').disabled,true);assert.equal(app.calls.filter(call=>call[0]==='save').length,0);assert.equal(generations,0);
 document.querySelector('[data-editor-step="0"]').onclick();assert.equal(name.value,'Bolso <artesanal>');assert.equal(description.value,'Una historia escrita por mí.');
 await app.submit();assert.equal(app.rows.length,1);assert.equal(app.rows[0].published,false);assert.equal(app.rows[0].price,'0');
});

test('wizard cannot navigate during a pending save and review reflects revised approvals',async()=>{
 const pending=deferred();const app=await setup('nuevo',{overrides:{saveProduct:()=>pending.promise}});app.input('prodName','Producto');app.input('approveTextArea','Texto');
 app.document.querySelector('[data-editor-step="3"]').onclick();app.document.getElementById('approveText').onclick();assert.match(app.document.getElementById('productReview').textContent,/Descripción aprobada/);
 app.input('approveTextArea','Nueva descripción');assert.match(app.document.getElementById('productReview').textContent,/Descripción pendiente/);
 const request=app.submit();app.document.querySelector('[data-editor-step="0"]').onclick();assert.equal(app.document.getElementById('editorStep3').hidden,false);
 pending.reject(Error('Sin conexión'));await request;assert.match(app.document.getElementById('saveStatus').textContent,/Sin conexión/);assert.equal(app.document.getElementById('approveTextArea').value,'Nueva descripción');
});

test('every artisan page exposes the existing sign-out action through its private menu',async()=>{
 for(const page of ['panel','nuevo','mi-perfil','difusion']){let count=0;const app=await setup(page,{overrides:{logout:async()=>{count++;}}});assert.equal(app.document.querySelectorAll('#logout').length,1);await app.document.getElementById('logout').onclick();assert.equal(count,1);assert.ok(app.calls.some(call=>call[0]==='redirect'&&call[1]==='index.html'));}
});
