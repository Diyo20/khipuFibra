// Local visual QA only. No Supabase client, credentials, paid calls, or writes.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'.taste-skill');fs.mkdirSync(directory,{recursive:true});
const deny="async()=>{throw Error('Verificación local: esta acción no escribe ni utiliza servicios externos.');}";
const stub=`window.khipuCloud={enabled:true,approved:false,user:null,membership:null,authLinkError:false,init:async()=>({user:null,approved:false}),authSettings:async()=>({google:true,email:true}),list:async()=>({products:[],profiles:[],reviews:[]}),clearPrivate(){},login:${deny},loginWithPassword:${deny},requestAccount:${deny},recoverPassword:${deny},updatePassword:${deny},logout:${deny},sendReview:${deny},generateDescription:${deny}};`;
const cases=[['inicio','index',''],['catalogo','catalogo',''],['producto','producto','?id=d1'],['producto-inexistente','producto','?id=no-existe'],['artesanas','artesanas',''],['artesana','artesana',''],['perfil-inexistente','artesana','?nombre=no-existe'],['favoritos','favoritos',''],['favoritos-llenos','favoritos',''],['acceso','acceso',''],['registro','acceso',''],['pendiente','acceso',''],['recuperar','recuperar',''],['restablecer','restablecer',''],['enlace-vencido','restablecer',''],['creditos','creditos',''],['catalogo-vacio','catalogo','']];
for(const [name,page,search] of cases){
 let html=fs.readFileSync(path.join(root,page+'.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('<head>','<head><base href="/">').replace(/(href|src)="assets\//g,'$1="/assets/');
 let setup=stub+`window.history.replaceState(null,'',window.location.pathname+${JSON.stringify(search)});localStorage.removeItem('khipuFibra_v2');`;
 if(name==='favoritos-llenos')setup+="localStorage.setItem('khipuFibra_v2',JSON.stringify({favorites:['d1','d2']}));";
 if(name==='pendiente')setup+="window.khipuCloud.init=async()=>({user:{id:'qa-pending',email:'prueba@example.test'},membership:{role:'artisan',status:'pending'}});";
 if(name==='restablecer')setup+="window.khipuCloud.init=async()=>({user:{id:'qa-reset',identities:[{provider:'email'}]}});";
 if(name==='enlace-vencido')setup+='window.khipuCloud.authLinkError=true;';
 const account=['acceso','recuperar','restablecer'].includes(page),scripts=account?['auth-ui.js']:page==='creditos'?[]:['storefront.js','app.js'];
 let action=name==='registro'?"document.getElementById('showRegistration')?.click();":name==='catalogo-vacio'?"const input=document.getElementById('search');if(input){input.value='búsqueda sin resultados';input.oninput();}":'';
 html=html.replace(/(<body[^>]*>)/,'$1<div class="qa-fixture-label" style="padding:8px 16px;background:#292521;color:#F6EEDF;font:12px sans-serif">Verificación local · ejemplos y datos sintéticos · sin conexión a Supabase</div>');
 html=html.replace('</body>',`<script>${setup}</script>${scripts.map(file=>`<script src="/assets/${file}"></script>`).join('')}${page==='creditos'?'':`<script type="module" src="/assets/${account?'motion/motion.js':'storefront-motion.js'}"></script>`}<script>window.addEventListener('load',()=>{setTimeout(()=>{${action}},100)});</script></body>`);
 fs.writeFileSync(path.join(directory,'integral-'+name+'.html'),html);
}
console.log('Wrote '+cases.length+' public/account fixtures; use --root . with the visual tools.');
