// Synthetic, local-only private UI fixtures. Never authenticate or write to a server.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),destination=path.join(root,'.taste-skill');
fs.mkdirSync(destination,{recursive:true});
const img='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets/img/photo-f77718068-500.jpg')).toString('base64');
const profile={name:'Artesana de prueba',city:'Lambayeque',specialty:'Tejido',bio:'Historia de prueba para comprobar la distribución.',story:'Contenido sintético exclusivo de la revisión local.',whatsapp:'',facebook:'',instagram:'',youtube:'',tiktok:'',avatar:'',experience:'',fair:'',video:''};
const products=[{id:'local-product',name:'Creación de prueba',category:'Bolsos',material:'Algodón',price:85,img,photos:[],dimensions:'30 × 25 cm',stock:'Disponible',care:'Lavar a mano',story:'Descripción sintética para comprobar la revisión de un producto.',published:false}];
const accounts={counts:{pending:2,active:8,suspended:1},members:[{user_id:'qa-admin',display_name:'Administración de prueba',email:'admin@example.test',role:'admin',status:'active'},{user_id:'qa-artisan',display_name:'Artesana de prueba',email:'artesana@example.test',role:'artisan',status:'pending'},{user_id:'qa-active',display_name:'Cuenta activa de prueba',email:'activa@example.test',role:'artisan',status:'active'},{user_id:'qa-suspended',display_name:'Cuenta suspendida de prueba',email:'suspendida@example.test',role:'artisan',status:'suspended'}],invitations:[{id:'local-invite',email:'invitacion@example.test',status:'pending',expires_at:'2099-11-18T12:00:00Z',delivered_at:null}],events:[{action:'approve',actor_id:'qa-admin',target_id:'qa-active',created_at:'2026-11-11T14:00:00Z',detail:{}},{action:'suspend',actor_id:'qa-admin',target_id:'qa-suspended',created_at:'2026-11-11T12:00:00Z',detail:{}}]};
const commerce={available:true,products:[{id:'local-product',name:'Creación de prueba',artisan_name:profile.name,category:'Bolsos',material:'Algodón',price:85,image_url:'',publicado:false,stock:'Disponible',story:'Información sintética para revisar la distribución.'}],reviews:[{id:'local-review',kind:'product',target_name:'Creación de prueba',nombre:'Visitante de prueba',comentario:'Valoración sintética para revisar la distribución.',estrellas:5,aprobada:false}]};
const stub=`const qaProfile=${JSON.stringify(profile)},qaProducts=${JSON.stringify(products)},qaAccounts=${JSON.stringify(accounts)},qaCommerce=${JSON.stringify(commerce)};
const qaUser={id:'qa-local',user_metadata:{}};window.khipuCloud={enabled:true,approved:true,user:qaUser,membership:{role:'artisan',status:'active'},galleryEnabled:true,init:async()=>({user:qaUser,approved:true,membership:window.khipuCloud.membership}),myProfile:async()=>qaProfile,myProducts:async()=>qaProducts,list:async()=>({products:[],profiles:[],reviews:[]}),clearPrivate(){},adminData:async()=>qaAccounts,adminCommerce:async()=>qaCommerce,accountSecurity:async()=>({email:'cuenta@example.test',userId:qaUser.id,passwordIdentity:true}),authSettings:async()=>({}),generateDescription:async()=>{throw Error('Verificación local: IA deshabilitada.');},saveProduct:async()=>{throw Error('Verificación local: sin guardados.');},saveProfile:async()=>{throw Error('Verificación local: sin guardados.');},logout:async()=>{throw Error('Verificación local: sin sesión real.');}};
`;
const cases=[['panel','panel'],['perfil-primero','panel'],['editor','nuevo'],['perfil','mi-perfil'],['promocionar','difusion'],['admin-resumen','admin'],['admin-accesos','admin'],['admin-comercio','admin'],['admin-historial','admin'],['admin-seguridad','admin'],['editor-fotos','nuevo'],['editor-descripcion','nuevo'],['editor-revision','nuevo'],['admin-confirmar','admin'],['admin-moderar','admin'],['editor-voz','nuevo'],['editor-sin-voz','nuevo']];
cases.push(['editor-foto-ia','nuevo'],['editor-publicado','nuevo'],['mis-productos','panel'],['perfil-historia','mi-perfil']);
for(const [name,page] of cases){
 let html=fs.readFileSync(path.join(root,page+'.html'),'utf8');
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('<head>','<head><base href="/">').replace(/(href|src)="assets\//g,'$1="/assets/');
 const admin=page==='admin';let init=stub;
 if(admin)init+=`window.khipuCloud.membership={role:'admin',status:'active'};`;
 if(name==='perfil-primero')init+='window.khipuCloud.myProfile=async()=>null;window.khipuCloud.myProducts=async()=>[];';
 if(name==='mis-productos')init+="window.history.replaceState(null,'',location.pathname+'#mis-productos');";
 if(page==='difusion')init+='qaProducts[0].published=true;';
 if(name==='perfil-historia')init+="qaProfile.experience='12 años creando';";
 if(page==='nuevo')init+=`sessionStorage.setItem('khipuFibra_private_qa-local',JSON.stringify({draft:{...qaProducts[0],id:null,photos:[qaProducts[0].img],ai:{text:qaProducts[0].story,textOK:false,imageOK:false,textGenerated:false}}}));`;
 if(name==='editor-publicado')init+=`qaProducts[0].published=true;window.history.replaceState(null,'',location.pathname+'?editar=local-product');`;
 if(name==='editor-voz')init+=`// Synthetic recognition events only; this fixture never opens a microphone.
 window.SpeechRecognition=class{start(){this.onstart?.();this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:'Frase parcial de prueba'}],{isFinal:false})]});}stop(){this.onend?.();}abort(){}};`;
 if(name==='editor-sin-voz')init+=`window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;`;
 html=html.replace('<body ', '<body ').replace(/(<body[^>]*>)/,'$1<div class="qa-fixture-label" style="padding:8px 16px;background:#29251F;color:#F7F3EB;font:12px sans-serif">Verificación local · datos sintéticos · sin conexión al servidor</div>');
 const scripts=admin?['account-security.js','writing-fields.js','voice-input.js','text-assist.js','ai-settings.js','admin-commerce.js','admin.js']:['account-security.js','storefront.js','artisan-workspace.js','writing-fields.js','voice-input.js','text-assist.js','app.js'];
 const view={'admin-accesos':'access','admin-comercio':'commerce','admin-historial':'history','admin-seguridad':'security','admin-confirmar':'access','admin-moderar':'commerce'}[name];
 const step={'editor-fotos':1,'editor-descripcion':2,'editor-revision':3,'editor-voz':2,'editor-sin-voz':2}[name];
 let navigate='';if(view)navigate+=`document.querySelector('[data-admin-view="${view}"]')?.click();`;
 if(step===1)navigate+=`document.getElementById('photoTools').open=true;`;
 if(step===3)navigate+=`document.getElementById('productReviewDetails').open=true;`;
 if(name==='perfil-historia')navigate+=`document.getElementById('profileExperience').closest('details').open=true;`;
 if(name==='editor-foto-ia')navigate+=`window.khipuCloud.aiQuota=async()=>({remaining:2});window.khipuCloud.improvePhoto=async()=>({image:qaProducts[0].img,quota:{remaining:1}});document.getElementById('photoTools').open=true;document.getElementById('photoAIGenerate').click();`;
 if(name==='admin-confirmar')navigate+=`document.querySelector('[data-action="approve"]')?.click();`;
 if(name==='admin-moderar')navigate+=`setTimeout(()=>document.querySelector('[data-moderate-kind="review"]')?.click(),80);`;
 if(name==='editor-voz')navigate+=`setTimeout(()=>document.querySelector('.voice-input button')?.click(),80);`;
 html=html.replace('</body>',`<script>${init}</script>${scripts.map(file=>`<script src="/assets/${file}"></script>`).join('')}<script>window.addEventListener('load',()=>{setTimeout(()=>{${navigate}},80)});</script></body>`);
 fs.writeFileSync(path.join(destination,'panels-'+name+'.html'),html);
}
console.log('Wrote '+cases.length+' local-only panel fixtures in .taste-skill/.');
