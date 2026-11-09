const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const front='https://storage.example/a/front.jpg',side='data:image/jpeg;base64,YWJj',detail='data:image/jpeg;base64,ZGVm';
function setup({images=[front],resize=async file=>file.photo}={}){
 const {document}=parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');const window={history:{replaceState(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/artisan-workspace.js'),'utf8'),{window,document});
 const draft={name:'Bolso',category:'Bolsos',price:85,material:'Algodón',dimensions:'',care:'',stock:'Disponible',story:'Hecho a mano',photos:[...images],ai:{text:'Hecho a mano',image:'',textOK:true,imageOK:true}},calls=[];
 document.getElementById('app').innerHTML=window.khipuWorkspace.editor({draft});
 const form=document.getElementById('productForm');form.reportValidity=()=>true;
 for(const select of form.querySelectorAll('select'))Object.defineProperty(select,'value',{writable:true,value:select.querySelector('option[selected]')?.textContent||select.querySelector('option').textContent});
 const cloud={saveProduct:async(p,options)=>{calls.push({p:structuredClone(p),options});return {id:'saved',imageUrl:'https://storage.example/a/saved-front.jpg',photos:p.photos.map((_,i)=>'https://storage.example/a/saved-'+i+'.jpg')};}};
 window.khipuWorkspace.mountEditor({cloud,draft,store(){},toast(){},resize});
 const upload=(id,files)=>{const input=document.getElementById(id);Object.defineProperty(input,'files',{configurable:true,value:files});return input.onchange();};
 const click=(attribute,index)=>{const list=document.getElementById('galleryEditor');list.onclick({target:list.querySelector(`[${attribute}="${index}"]`)});};
 return {document,draft,calls,upload,click,cloud};
}
const file=photo=>({type:'image/jpeg',size:200,name:'foto.jpg',photo});
test('adding, replacing and removing photographs preserves the other selections and resets approval',async()=>{
 const app=setup();await app.upload('galleryPhoto',[file(side),file(detail)]);
 assert.deepEqual(Array.from(app.draft.photos),[front,side,detail]);assert.equal(app.draft.ai.imageOK,false);assert.equal(app.document.getElementById('galleryPhoto').disabled,true);
 app.document.getElementById('approveImage').onclick();assert.equal(app.document.getElementById('publishProduct').disabled,false);
 await app.upload('productPhoto',[file('data:image/jpeg;base64,Z2hp')]);assert.deepEqual(Array.from(app.draft.photos),['data:image/jpeg;base64,Z2hp',side,detail]);assert.equal(app.draft.ai.imageOK,false);
 app.click('data-photo-remove',0);assert.deepEqual(Array.from(app.draft.photos),[side,detail]);assert.equal(app.document.getElementById('galleryPhoto').disabled,false);assert.equal(app.document.querySelector('#imagePreview img').src,side);
});
test('selection limit and invalid files leave the previous gallery untouched',async()=>{
 let resizes=0;const app=setup({images:[front,side],resize:async file=>{resizes++;return file.photo;}});
 await app.upload('galleryPhoto',[file(detail),file(side)]);assert.equal(resizes,0);assert.deepEqual(app.draft.photos,[front,side]);assert.match(app.document.getElementById('saveStatus').textContent,/hasta tres/);
 await app.upload('galleryPhoto',[{type:'image/svg+xml',size:20}]);assert.equal(resizes,0);assert.deepEqual(app.draft.photos,[front,side]);
});
test('an image processing error cannot add only part of the selected batch',async()=>{
 const app=setup({resize:async file=>{if(file.photo===detail)throw Error('No se pudo leer la foto');return file.photo;}});
 await app.upload('galleryPhoto',[file(side),file(detail)]);assert.deepEqual(app.draft.photos,[front]);assert.match(app.document.getElementById('saveStatus').textContent,/No se pudo leer/);
});
test('publishing submits the whole approved gallery and replaces local images with confirmed URLs',async()=>{
 const app=setup({images:[front,side,detail]});app.click('data-photo-main',2);
 assert.equal(app.document.getElementById('publishProduct').disabled,true);app.document.getElementById('approveImage').onclick();
 await app.document.getElementById('publishProduct').onclick();assert.equal(app.calls.length,1);assert.equal(app.calls[0].p.img,detail);assert.deepEqual(Array.from(app.calls[0].p.photos),[front,side]);assert.equal(app.calls[0].options.published,true);assert.equal(app.draft.photos.length,3);assert.ok(app.draft.photos.every(photo=>photo.startsWith('https://')));assert.equal(app.document.querySelectorAll('#galleryEditor img').length,3);
});

test('AI actions and successful generated text are marked, while local photo preparation is not labeled as AI',async()=>{
 const app=setup();assert.match(app.document.querySelector('#generateText .ai-mark').textContent,/IA/);assert.equal(app.document.querySelector('#generateImage .ai-mark'),null);assert.equal(app.document.getElementById('textOrigin').hidden,true);
 app.cloud.generateDescription=async()=> 'Una descripción generada para revisar';await app.document.getElementById('generateText').onclick();assert.equal(app.document.getElementById('textOrigin').hidden,false);assert.equal(app.draft.ai.textGenerated,true);assert.equal(app.draft.ai.textOK,false);assert.match(app.document.getElementById('approveTextArea').value,/generada/);
});
