const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function setup(page,{search='',rows=[],overrides={},wait=true,voice=false,imageOps}={}){
 const html=fs.readFileSync(path.join(__dirname,'..',page+'.html'),'utf8'),dom=parseHTML(html),document=dom.document,calls=[];
 const auth={approved:true,user:{id:'a',user_metadata:{}},membership:{role:'artisan',status:'active'}};
 const cloud={enabled:true,...auth,init:async()=>auth,myProfile:async()=>({name:'Ana',whatsapp:'999999999'}),myProducts:async()=>structuredClone(rows),list:async options=>{calls.push(['list',options]);return {products:rows.filter(p=>p.published),profiles:[],reviews:[]};},clearPrivate(){},saveProduct:async(p,options)=>{calls.push(['save',structuredClone(p),options]);const id=p.id||'p-new';const product={...p,id,published:options.published};const i=rows.findIndex(p=>p.id===id);if(i<0)rows.push(product);else rows[i]=product;return {id,imageUrl:p.img,photos:p.photos||[]};},...overrides};
 const location={search,href:'https://preview.example/'+page+'.html'+search,replace:url=>calls.push(['redirect',url]),reload:()=>calls.push(['reload'])};
 const window={khipuCloud:cloud,addEventListener(){},innerWidth:390,confirm:()=>false,history:{replaceState:(a,b,url)=>calls.push(['history',url])}};
 const recordings=[];if(voice)window.SpeechRecognition=class{constructor(){recordings.push(this);}start(){}stop(){}abort(){}};
 const Image=class{constructor(){this.width=800;this.height=600;}set src(value){imageOps?.push(['source',value]);this.onload();}};
 if(imageOps){const create=document.createElement.bind(document);document.createElement=tag=>{if(tag!=='canvas')return create(tag);const ctx={fillRect(){},save(){},restore(){},translate(){},rotate(angle){imageOps.push(['rotate',angle]);},drawImage(){imageOps.push(['draw',this.filter]);}};return {getContext:()=>ctx,toDataURL:()=>{imageOps.push(['render']);return 'data:image/jpeg;base64,cHJlcGFyZWQ=';}};};}
 const context=vm.createContext({window,document,location,Image,localStorage:storage(),sessionStorage:storage(),structuredClone,URLSearchParams,URL,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,console:{...console,error(){}},setTimeout:()=>0,clearTimeout(){},Intl});
 cloud.aiQuota||=async()=>({remaining:2});cloud.improveText||=async payload=>({text:payload.source+' mejorado',quota:{remaining:1}});
 // Load the real page entry points; the authenticated client is the only substituted dependency.
 for(const match of html.matchAll(/<script\b[^>]*src="assets\/([^"]+\.js)"[^>]*>/g)){const file=match[1];if(['cloud.js','supabase-config.js','storefront-motion.js'].includes(file))continue;vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);}
 const configure=()=>{for(const select of document.querySelectorAll('select')){const option=select.querySelector('option[selected]')||select.querySelector('option');Object.defineProperty(select,'value',{writable:true,configurable:true,value:option?.getAttribute('value')??option?.textContent??''});}const form=document.getElementById('productForm');if(form)form.reportValidity=()=>true;};
 if(wait){await tick();configure();}
 return {document,cloud,calls,rows,window,location,configure,recordings,input:(id,value)=>{const input=document.getElementById(id);input.value=value;input.dispatchEvent(new dom.window.Event('input'));},submit:()=>document.getElementById('productForm').onsubmit({preventDefault(){}})};
}
test('one-screen editor saves drafts and publishes after a direct deliberate click',async()=>{
 const app=await setup('nuevo'),{document,input,submit,rows,calls}=app;
 input('prodName','Mi bolso');input('prodMaterial','Algodón');input('approveTextArea','Una pieza hecha a mano.');
 await submit();assert.equal(rows.length,1);assert.equal(rows[0].published,false);assert.equal(rows[0].story,'Una pieza hecha a mano.');assert.match(document.getElementById('saveStatus').textContent,/Borrador guardado/);
 await submit();assert.equal(rows.length,1);assert.equal(calls.filter(c=>c[0]==='save')[1][1].id,'p-new');
 assert.equal(document.getElementById('publishProduct').disabled,false);
 const image='https://storage.example/a/photo.jpg';rows[0].img=image;
 const edit=await setup('nuevo',{search:'?editar=p-new',rows});
 edit.document.getElementById('approveText').onclick();edit.document.getElementById('approveImage').onclick();assert.equal(edit.document.getElementById('publishProduct').disabled,false);
 await edit.document.getElementById('publishProduct').onclick();assert.equal(rows.length,1);assert.equal(rows[0].published,true);
 edit.input('approveTextArea','Cambio pendiente de revisión');assert.equal(edit.document.getElementById('publishProduct').disabled,false); // editing a published product no longer repeats the first-publication approvals
});
test('local photo adjustments always use the original, invalidate approval, and can be restored before saving',async()=>{
 const imageOps=[],original='https://storage.example/original.jpg',rows=[{id:'photo',name:'Mi bolso',category:'Bolsos',material:'Algodón',img:original,photos:[],story:'Mi pieza',stock:'Disponible'}];
 const app=await setup('nuevo',{search:'?editar=photo',rows,imageOps}),el=id=>app.document.getElementById(id);
 el('approveImage').onclick();assert.match(el('photoStatus').textContent,/aprobadas/);
 el('photoBrightness').value='115';el('photoContrast').value='110';el('photoRotation').value='90';await el('generateImage').onclick();
 assert.match(el('photoStatus').textContent,/pendientes/);assert.equal(el('restoreImage').disabled,false);assert.ok(imageOps.some(x=>x[0]==='draw'&&x[1]==='brightness(115%) contrast(110%)'));
 await el('generateImage').onclick();assert.deepEqual(imageOps.filter(x=>x[0]==='source').map(x=>x[1]),[original,original]);assert.equal(app.calls.filter(x=>x[0]==='save').length,0);
 el('restoreImage').onclick();assert.equal(app.document.querySelector('#imagePreview img').src,original);assert.equal(el('photoBrightness').value,'100');assert.equal(el('restoreImage').disabled,true);await app.submit();assert.equal(rows[0].img,original);
 await el('generateImage').onclick();await app.submit();assert.equal(rows[0].img,'data:image/jpeg;base64,cHJlcGFyZWQ=');
});

test('Pollinations proposals require acceptance, stay tied to the original and save only after review',async()=>{
 const original='https://storage.example/original.jpg',rows=[{id:'photo',name:'Mi bolso',img:original,photos:[],story:'Mi pieza'}],edited='data:image/jpeg;base64,/9j/2Q==';let requests=0;
 const app=await setup('nuevo',{search:'?editar=photo',rows,imageOps:[],overrides:{aiQuota:async()=>({remaining:2}),improvePhoto:async()=>{requests++;return {image:edited,quota:{remaining:1}};}}}),el=id=>app.document.getElementById(id);
 await el('photoAIGenerate').onclick();assert.equal(requests,1);assert.equal(app.document.querySelector('#imagePreview img').src,original);assert.equal(el('photoAICompare').hidden,false);assert.equal(app.calls.filter(x=>x[0]==='save').length,0);
 el('photoAIKeep').onclick();assert.equal(app.document.querySelector('#imagePreview img').src,original);
 await el('photoAIGenerate').onclick();el('photoAIAccept').onclick();assert.equal(app.document.querySelector('#imagePreview img').src,edited);assert.match(el('photoStatus').textContent,/pendientes/);await app.submit();assert.equal(rows[0].img,edited);
});

test('one-screen editor updates published changes and retains all photos without a wizard',async()=>{
 const rows=[{id:'published',name:'Aretes',category:'Accesorios',material:'Algodón',img:'https://storage.example/front.jpg',photos:['https://storage.example/side.jpg'],story:'Mi pieza',published:true}],app=await setup('nuevo',{search:'?editar=published',rows}),doc=app.document;
 assert.equal(doc.querySelectorAll('[data-editor-panel]').length,0);assert.equal(doc.querySelectorAll('[data-editor-step]').length,0);
 for(let change=0;change<3;change++){app.input('approveTextArea','Cambio '+change);app.input('prodPrice',String(10+change));await doc.getElementById('publishProduct').onclick();assert.equal(rows[0].published,true);assert.equal(rows[0].story,'Cambio '+change);assert.equal(rows[0].price,String(10+change));assert.equal(rows[0].photos[0],'https://storage.example/side.jpg');}
});

test('direct draft saves keep drafts and moderated products unpublished',async()=>{
 for(const moderated of [false,true]){const app=await setup('nuevo',{rows:moderated?[{id:'held',name:'Aretes',published:true,moderationHidden:true,img:'https://storage.example/front.jpg',story:'Mi pieza'}]:[],search:moderated?'?editar=held':''});app.input('prodName','Aretes');await app.submit();assert.equal(app.rows[0].published,false);assert.match(app.document.getElementById('saveStatus').textContent,/Borrador guardado/);}
});

test('duplicate and failed direct saves preserve edits and publication status',async()=>{
 const pending=deferred();let count=0;const rows=[{id:'p',name:'Aretes',material:'Hilo',published:true,img:'https://storage.example/front.jpg',story:'Original'}],app=await setup('nuevo',{search:'?editar=p',rows,overrides:{saveProduct:()=>{count++;return pending.promise;}}});app.input('approveTextArea','Cambio pendiente');const button=app.document.getElementById('publishProduct'),request=button.onclick();await button.onclick();assert.equal(count,1);pending.reject(Error('Sin conexión'));await request;assert.equal(app.rows[0].published,true);assert.equal(app.document.getElementById('approveTextArea').value,'Cambio pendiente');assert.match(app.document.getElementById('saveStatus').textContent,/Sin conexión/);
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
 const values={profileName:'Ana Artesana',profileCity:'Lambayeque',profileSpecialty:'Tejido',profileBio:'Mi historia',profileStory:'Mi oficio',profileWhatsapp:'999999999',profileExperience:'10',profileFair:'Feria local',profileVideo:'https://youtube.com/watch?v=abcdefghijk',facebook:'https://facebook.com/ana',instagram:'https://instagram.com/ana',youtube:'https://youtube.com/@ana',tiktok:'https://tiktok.com/@ana'};
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

test('a database without extra gallery support still offers the principal photo and draft saving',async()=>{
 const app=await setup('nuevo',{overrides:{galleryEnabled:false}});assert.equal(app.document.getElementById('galleryPhoto').disabled,false);assert.match(app.document.getElementById('photosTitle').textContent,/hasta 1/);app.input('prodName','Mi creación');await app.submit();assert.equal(app.rows.length,1);
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

test('promotion generates into a comparison and only accepts after an explicit click',async()=>{
 const rows=[{id:'p1',name:'Bolso',artisan:'Ana',published:true,img:'https://storage.example/a/photo.jpg'}];const app=await setup('difusion',{rows,overrides:{generateDescription:async()=> 'Texto social generado para revisar'}}),doc=app.document;
 doc.getElementById('shareProduct').value='p1';doc.getElementById('shareChannel').value='facebook';await doc.getElementById('generateSocial').onclick();assert.equal(doc.getElementById('socialPreview').value,'');assert.equal(doc.getElementById('shareNative').disabled,true);assert.equal(doc.querySelector('.text-comparison').hidden,false);doc.querySelector('.text-comparison button').onclick();assert.equal(doc.getElementById('socialPreview').value,'Texto social generado para revisar');assert.equal(doc.getElementById('shareNative').disabled,false);
});

test('an administrative hold remains visible and publishing stays disabled after review',async()=>{
 const rows=[{id:'held',name:'Pieza',material:'Algodón',img:'https://storage.example/front.jpg',photos:[],story:'Hecha a mano',category:'Textiles',moderationHidden:true,moderationReason:'Revisar información',published:false}];const app=await setup('nuevo',{search:'?editar=held',rows});
 assert.match(app.document.querySelector('.profile-first-notice').textContent,/Oculto por administración/);app.document.getElementById('approveImage').onclick();app.document.getElementById('approveText').onclick();assert.equal(app.document.getElementById('publishProduct').disabled,true);
 await app.submit();assert.equal(app.rows[0].published,false);
});

test('promotion serializes requests and ignores proposals after changing the selected network',async()=>{
 const pending=deferred();let calls=0;const rows=[{id:'p1',name:'Bolso',published:true,img:'https://storage.example/front.jpg'}];const app=await setup('difusion',{rows,overrides:{generateDescription:()=>{calls++;return pending.promise;}}}),doc=app.document;doc.getElementById('shareProduct').value='p1';doc.getElementById('shareChannel').value='facebook';
 const first=doc.getElementById('generateSocial').onclick();await tick();await doc.getElementById('retrySocial').onclick();assert.equal(calls,1);doc.getElementById('shareChannel').value='instagram';pending.resolve('Texto generado');await first;assert.equal(doc.getElementById('socialPreview').value,'');assert.equal(doc.querySelector('.text-comparison').hidden,true);
});

test('essential fields are visible together, optional details stay accessible without saving or generating',async()=>{
 let generations=0;const app=await setup('nuevo',{overrides:{generateDescription:async()=>{generations++;return 'Texto';}}});const doc=app.document;
 for(const id of ['prodName','prodCategory','prodPrice','prodMaterial','approveTextArea'])assert.equal(doc.getElementById(id).closest('details,[hidden]'),null);
 assert.equal(doc.getElementById('moreDetails').hasAttribute('open'),false);assert.ok(doc.getElementById('prodDim').closest('#moreDetails'));assert.equal(doc.querySelectorAll('#galleryEditor>li').length,3);
 app.input('prodName','Bolso');app.input('prodMaterial','Algodón');app.input('approveTextArea','Una historia');app.input('prodPrice','0');await app.submit();assert.equal(app.rows[0].price,'0');assert.equal(app.rows[0].published,false);assert.equal(generations,0);
});

test('publishing reveals a clear missing material error without hiding the required field',async()=>{
 const app=await setup('nuevo');app.input('prodName','Aretes');app.input('approveTextArea','Unos aretes');await app.document.getElementById('publishProduct').onclick();assert.equal(app.rows.length,0);assert.match(app.document.getElementById('saveStatus').textContent,/materiales/);assert.equal(app.document.getElementById('prodMaterial').closest('details'),null);
});

test('every artisan page exposes the existing sign-out action through its private menu',async()=>{
 for(const page of ['panel','nuevo','mi-perfil','difusion']){let count=0;const app=await setup(page,{overrides:{logout:async()=>{count++;}}});assert.equal(app.document.querySelectorAll('#logout').length,1);await app.document.getElementById('logout').onclick();assert.equal(count,1);assert.ok(app.calls.some(call=>call[0]==='redirect'&&call[1]==='index.html'));}
});

test('dictated product text invalidates approval and persists through the existing save operation',async()=>{
 const rows=[{id:'p1',name:'Pieza',material:'Algodón',img:'https://storage.example/front.jpg',photos:[],story:'Historia original.',published:false}];
 const app=await setup('nuevo',{search:'?editar=p1',rows,voice:true}),doc=app.document;
 await tick();doc.getElementById('approveImage').onclick();doc.getElementById('approveText').onclick();assert.equal(doc.getElementById('publishProduct').disabled,false);
 doc.getElementById('approveTextArea').nextElementSibling.querySelector('button').onclick();const recognition=app.recordings[0];recognition.onstart();
 recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'Tejida en mi taller.'}],{isFinal:true})]});
 assert.equal(doc.getElementById('publishProduct').disabled,false);assert.match(doc.getElementById('approveTextArea').value,/Historia original\. Tejida en mi taller\./);
 app.window.khipuVoice.cancel();doc.getElementById('approveText').onclick();await app.submit();assert.equal(rows[0].story,'Historia original. Tejida en mi taller.');assert.equal(rows[0].published,false);
});

test('dictation in promotion keeps direct sharing available and never invokes generation',async()=>{
 let generations=0;const app=await setup('difusion',{voice:true,rows:[{id:'p1',name:'Bolso',published:true,img:'https://storage.example/front.jpg'}],overrides:{generateDescription:async()=>{generations++;return 'Texto';}}});
 const preview=app.document.getElementById('socialPreview');
 // Linkedom does not dispatch DOM oninput properties; bridge the existing native handler.
 preview.addEventListener('input',()=>preview.oninput());
 preview.value='Texto para compartir.';preview.oninput();app.document.getElementById('approveSocial').onclick();assert.equal(app.document.getElementById('shareNative').disabled,false);
 preview.nextElementSibling.querySelector('button').onclick();app.recordings[0].onresult({resultIndex:0,results:[Object.assign([{transcript:'Consulta colores.'}],{isFinal:true})]});
 assert.equal(app.document.getElementById('shareNative').disabled,false);assert.equal(generations,0);assert.equal(preview.value,'Texto para compartir. Consulta colores.');
 app.window.khipuVoice.cancel();
});

test('dictated profile history is included in the existing explicit profile save',async()=>{
 let saved;const app=await setup('mi-perfil',{voice:true,overrides:{saveProfile:async value=>saved=structuredClone(value)}});
 for(const [id,text] of [['profileBio','Soy artesana de Lambayeque.'],['profileStory','Comparto mi oficio.']]){
  app.document.getElementById(id).closest('details').setAttribute('open','');await tick();
  const target=app.document.getElementById(id);target.value='';target.nextElementSibling.querySelector('button').onclick();
  app.recordings.at(-1).onresult({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:true})]});
 }
 assert.equal(saved,undefined);app.window.khipuVoice.cancel();const form=app.document.getElementById('profileForm');await form.onsubmit({preventDefault(){},currentTarget:form});
 assert.equal(saved.bio,'Soy artesana de Lambayeque.');assert.equal(saved.story,'Comparto mi oficio.');
});
test('Mi plan is a protected workspace route and does not fetch the product editor data',async()=>{
 const result={settings:{enabled:false,price:19},plan:'basic',limits:[{plan:'basic',per_content:2,per_month:20},{plan:'pro',per_content:6,per_month:100}],monthly_used:0,requests:[]};
 const app=await setup('mi-plan',{overrides:{planMine:async()=>result,planQR:()=>'',myProducts:async()=>{throw Error('Products should not load');}}});
 assert.match(app.document.getElementById('myPlanContent').textContent,/Khipu Básico/);assert.equal(app.document.querySelector('.side a[href="mi-plan.html"]').getAttribute('aria-current'),'page');
 const blocked=await setup('mi-plan',{overrides:{approved:false,user:null,init:async()=>({approved:false,user:null}),planMine:async()=>{throw Error('Must not load');}}});assert.ok(blocked.calls.some(x=>x[0]==='redirect'&&x[1]==='acceso.html'));assert.equal(blocked.document.getElementById('planRequestForm'),null);
});
test('public plan comparison remains usable without waiting for authentication',async()=>{
 const app=await setup('planes',{overrides:{init:async()=>{throw Error('No Auth dependency');},planPublic:async()=>({available:false})}});
 assert.match(app.document.querySelector('h1').textContent,/Planes para tu taller/);assert.match(app.document.getElementById('planComparison').textContent,/Precio por confirmar/);assert.ok(app.document.querySelector('a[href="mi-plan.html"]'));
});

test('profile fields, plan and security remain accessible in separate groups without losing stored values',async()=>{
 const app=await setup('mi-perfil'),doc=app.document;
 for(const [id,title] of [['profileName','Mis datos'],['profileBio','Mi historia'],['profileWhatsapp','Mis redes'],['profileVideo','Mis redes']])assert.equal(doc.getElementById(id).closest('details').querySelector('summary').textContent,title);
 assert.equal(doc.getElementById('accountSecurity').closest('details').querySelector('summary').textContent,'Seguridad y contraseña');assert.ok(doc.querySelector('a[href="mi-plan.html"]'));assert.equal(doc.querySelector('#profileForm>details').open,true);
});

test('product text generation compares first and marks accepted AI text without autosaving',async()=>{
 const app=await setup('nuevo',{overrides:{generateDescription:async()=> 'Descripción comercial'}}),doc=app.document;app.input('prodName','Aretes');app.input('prodMaterial','Hilo');app.input('approveTextArea','');await doc.querySelector('.description-field .text-assist>button').onclick();assert.equal(doc.getElementById('approveTextArea').value,'');assert.equal(app.calls.filter(x=>x[0]==='save').length,0);doc.querySelector('.description-field .text-comparison button').onclick();assert.equal(doc.getElementById('approveTextArea').value,'Descripción comercial');assert.equal(doc.getElementById('textOrigin').hidden,false);
});

test('Enter in a product field never implicitly hides a published product',async()=>{
 const app=await setup('nuevo',{search:'?editar=p',rows:[{id:'p',name:'Aretes',published:true,img:'https://storage.example/photo.jpg',material:'Hilo',story:'Mi pieza'}]}),input=app.document.getElementById('prodName'),event=new app.document.defaultView.Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(event,'key',{value:'Enter'});input.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(app.calls.filter(x=>x[0]==='save').length,0);
});

test('experience is chosen as years, restores previous values and saves the public number-and-years label',async()=>{
 for(const [previous,chosen,expected] of [['12 años creando','25','25 años'],['1 año de experiencia','1','1 año'],['','0','0 años']]){
  let saved;const app=await setup('mi-perfil',{overrides:{myProfile:async()=>({name:'Ana',experience:previous}),saveProfile:async value=>{saved=structuredClone(value);}}}),select=app.document.getElementById('profileExperience');
  assert.equal(select.tagName,'SELECT');assert.equal(select.value,previous.startsWith('12')?'12':previous.startsWith('1')?'1':'');assert.equal(app.document.getElementById('profileExperienceVoiceStatus'),null);
  select.value=chosen;const form=app.document.getElementById('profileForm');await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(saved.experience,expected);
  const publicPage=await setup('artesana',{search:'?nombre=Ana',overrides:{list:async()=>({products:[],profiles:[saved],reviews:[]})}});assert.match(publicPage.document.querySelector('.surface').textContent,new RegExp(expected));
 }
});

test('experience legacy text is preserved until a number is chosen, and public numeric history is formatted',async()=>{
 let saved;const app=await setup('mi-perfil',{overrides:{myProfile:async()=>({name:'Ana',experience:'Desde niña'}),saveProfile:async value=>{saved=value;}}}),select=app.document.getElementById('profileExperience');assert.equal(select.value,'Desde niña');const form=app.document.getElementById('profileForm');await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(saved.experience,'Desde niña');
 const publicPage=await setup('artesanas',{overrides:{list:async()=>({products:[],profiles:[{name:'Ana',experience:'18 años creando'}],reviews:[]})}});assert.ok([...publicPage.document.querySelectorAll('.tag')].some(tag=>tag.textContent==='18 años'));assert.doesNotMatch(publicPage.document.getElementById('app').textContent,/18 años creando/);
});
