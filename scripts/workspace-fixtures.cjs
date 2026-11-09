// Local visual QA only. These synthetic pages never enter the frontend build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),window={};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/artisan-workspace.js'),'utf8'),{window});
const draft={name:'Bolso tejido',category:'Bolsos',material:'Algodón',price:'85',dimensions:'30 × 25 cm',stock:'Disponible',care:'Lavar a mano',photos:[],story:'',ai:{text:'Tejido a mano, punto por punto.',image:'',textOK:false,imageOK:false}};
const products=[{id:'local-fixture',name:'Bolso tejido',category:'Bolsos',price:85,img:'',published:true,stock:'Disponible'}];
// Reuse the licensed editorial reference at three sizes for layout QA only.
// These fixtures do not authenticate, upload, or create products.
const galleryDraft={...draft,photos:[500,960,1280].map(size=>'data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets/img',`photo-f77718068-${size}.jpg`)).toString('base64'))};
fs.mkdirSync(path.join(root,'.taste-skill'),{recursive:true});
for(const [name,body] of [['editor',window.khipuWorkspace.editor({draft})],['gallery',window.khipuWorkspace.editor({draft:galleryDraft})],['panel',window.khipuWorkspace.panel({artisan:{name:'Artesana de prueba'},products})]]){
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verificación local · ${name}</title><link rel="stylesheet" href="../assets/styles.css"><link rel="stylesheet" href="../assets/design-system.css"><link rel="stylesheet" href="../assets/artisan-workspace.css"></head><body><main class="container section">${body}</main></body></html>`;
 fs.writeFileSync(path.join(root,'.taste-skill','qa-'+name+'.html'),html);
}
const prerequisite=window.khipuWorkspace.panel({artisan:{name:'Nueva artesana'},products:[],hasProfile:false});
fs.writeFileSync(path.join(root,'.taste-skill','qa-profile-first.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verificación local · Perfil primero</title><link rel="stylesheet" href="../assets/styles.css"><link rel="stylesheet" href="../assets/design-system.css"><link rel="stylesheet" href="../assets/artisan-workspace.css"><body><main class="container section">${prerequisite}</main></body></html>`);
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/admin-commerce.js'),'utf8'),{window});
const {parseHTML}=require('linkedom');const dom=parseHTML('<html><body><main id="fixture"></main></body></html>');
const commerce={products:[{id:'fixture-only',name:'Registro de prueba para verificar la distribución',artisan_name:'Artesana de prueba',category:'Textiles',material:'Algodón',price:85,stock:'Disponible',publicado:true,public_visible:false}],reviews:[{id:'fixture-review',kind:'product',target_name:'Registro de prueba',nombre:'Visitante de prueba',comentario:'Comentario sintético para comprobar la distribución del formulario.',estrellas:5,aprobada:false}]};
const fixture=dom.document.getElementById('fixture');fixture.innerHTML=window.khipuCommerce.render(commerce);fixture.querySelector('#commerceProductList').innerHTML=window.khipuCommerce.productRows(commerce.products);fixture.querySelector('#commerceReviewList').innerHTML=window.khipuCommerce.reviewRows(commerce.reviews);
fs.writeFileSync(path.join(root,'.taste-skill','qa-admin-commerce.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verificación local · Administración</title><link rel="stylesheet" href="../assets/styles.css"><link rel="stylesheet" href="../assets/design-system.css"><link rel="stylesheet" href="../assets/access.css"><link rel="stylesheet" href="../assets/admin-commerce.css"><body><main class="container section">${fixture.innerHTML}</main></body></html>`);
console.log('Synthetic visual fixtures written to .taste-skill/qa-{editor,gallery,panel}.html');
