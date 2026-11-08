// Local visual QA only. These synthetic pages never enter the frontend build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),window={};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/artisan-workspace.js'),'utf8'),{window});
const draft={name:'Bolso tejido',category:'Bolsos',material:'Algodón',price:'85',dimensions:'30 × 25 cm',stock:'Disponible',care:'Lavar a mano',photos:[],story:'',ai:{text:'Tejido a mano, punto por punto.',image:'',textOK:false,imageOK:false}};
const products=[{id:'local-fixture',name:'Bolso tejido',category:'Bolsos',price:85,img:'',published:true,stock:'Disponible'}];
fs.mkdirSync(path.join(root,'.taste-skill'),{recursive:true});
for(const [name,body] of [['editor',window.khipuWorkspace.editor({draft})],['panel',window.khipuWorkspace.panel({artisan:{name:'Artesana de prueba'},products})]]){
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verificación local · ${name}</title><link rel="stylesheet" href="../assets/styles.css"><link rel="stylesheet" href="../assets/design-system.css"><link rel="stylesheet" href="../assets/artisan-workspace.css"></head><body><main class="container section">${body}</main></body></html>`;
 fs.writeFileSync(path.join(root,'.taste-skill','qa-'+name+'.html'),html);
}
console.log('Synthetic visual fixtures written to .taste-skill/qa-{editor,panel}.html');
