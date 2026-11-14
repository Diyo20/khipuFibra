/* Product management uses the existing owner-protected Supabase tables. */
(()=>{'use strict';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo=value=>/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(value||'')?escape(value):'';
const field=(id,label,value='',options='')=>`<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" value="${escape(value)}" ${options}></div>`;
const status=p=>p.moderationHidden?'Oculto por administración':!p.published?'Borrador / oculto':p.stock==='Agotado'?'Publicado · agotado':'Publicado';
function panel({artisan,products,hasProfile=true}){
 const add=hasProfile?'nuevo.html?crear=1':'mi-perfil.html?primero=1';
 const actions=[['＋','Agregar producto',add],['▦','Mis productos','panel.html#mis-productos'],['↗','Promocionar','difusion.html'],['◉',hasProfile?'Mi perfil':'Crear mi perfil','mi-perfil.html']];if(!hasProfile)actions.unshift(actions.pop());
 const list=location.hash==='#mis-productos';
 return `<div class="workspace simple-workspace"><div class="workspace-home" ${list?'hidden':''}><header class="workspace-welcome"><h1>¡Hola, ${escape(artisan.name.split(' ')[0]||'artesana')}!</h1><p>¿Qué deseas hacer hoy?</p></header>${!hasProfile?'<p class="profile-first-notice" id="profileFirstNotice">Primero guarda tu perfil para agregar productos.</p>':''}<div class="workspace-actions">${actions.map(([icon,label,url])=>`<a href="${url}"><span class="workspace-action-icon" aria-hidden="true">${icon}</span><b>${label}</b></a>`).join('')}</div></div><section id="mis-productos" class="workspace-list" ${list?'':'hidden'}><div class="section-head"><h1>Mis productos</h1><a class="btn" href="${add}">＋ Agregar producto</a></div><p id="managementStatus" role="status" aria-live="polite"></p><div class="owned-products">${products.map(p=>`<article class="owned-product" data-owned-product="${escape(p.id)}"><div class="owned-photo">${photo(p.img)?`<img src="${photo(p.img)}" alt="${escape(p.name)}" width="100" height="100" loading="lazy">`:'Sin foto'}</div><div class="owned-info"><h2>${escape(p.name)}</h2><p>${p.price===''||p.price==null?'Consultar precio':'S/ '+escape(p.price)}</p><span class="product-state">${status(p)}</span></div><div class="owned-controls"><a class="btn" href="nuevo.html?editar=${encodeURIComponent(p.id)}">Editar</a><details class="owned-menu"><summary aria-label="Más opciones de ${escape(p.name)}">⋯</summary><div>${p.moderationHidden?'<p>Oculto por administración</p>':p.published?`<button class="btn alt" data-product-action="visibility" data-id="${escape(p.id)}">Ocultar</button>`:`<a class="btn alt" href="nuevo.html?editar=${encodeURIComponent(p.id)}">Publicar</a>`}<button class="btn alt" data-product-action="duplicate" data-id="${escape(p.id)}">Duplicar</button><button class="btn alt" data-product-action="stock" data-id="${escape(p.id)}">${p.stock==='Agotado'?'Marcar disponible':'Marcar agotado'}</button>${p.published?`<a class="btn alt" href="producto.html?id=${encodeURIComponent(p.id)}">Ver publicación ↗</a>`:''}<button class="btn ghost" data-product-action="delete" data-id="${escape(p.id)}">Eliminar</button></div></details></div></article>`).join('')||`<div class="empty"><h2>Tu primera creación</h2><a class="btn" href="${add}">${hasProfile?'Agregar producto':'Crear mi perfil'}</a></div>`}</div></section></div>`;
}
const draftPhotos=d=>[d.ai?.image||d.photos?.[0]||'',...(d.photos||[]).slice(1)].filter(Boolean);
function galleryItems(d){const images=draftPhotos(d);return Array.from({length:3},(_,index)=>images[index]?
 `<li><details class="photo-slot"><summary aria-label="Foto ${index+1}. Abrir opciones"><img src="${photo(images[index])}" alt="Fotografía ${index+1}" width="160" height="160"><span>${index===0?'★ Principal':'Foto '+(index+1)}</span></summary><div class="photo-controls"><button type="button" class="btn alt smallbtn" data-photo-replace="${index}">Reemplazar</button>${index>0?`<button type="button" class="btn alt smallbtn" data-photo-main="${index}">Hacer principal</button>`:''}<button type="button" class="btn ghost smallbtn" data-photo-remove="${index}">Quitar</button></div></details></li>`:
 `<li class="photo-empty"><button class="photo-add" type="button" data-photo-add><span aria-hidden="true">＋</span> Añadir foto<span class="sr-only"> ${index+1}</span></button></li>`).join('');}
function photoEditor(d,enabled=true){return `<section class="simple-photos" aria-labelledby="photosTitle"><div class="section-head"><h2 id="photosTitle">Fotos <span class="muted">(hasta ${enabled?3:1})</span></h2><span id="galleryCount" class="small" role="status">${draftPhotos(d).length} de ${enabled?3:1}</span></div><input class="file-only" hidden id="productPhoto" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Reemplazar foto principal"><input class="file-only" hidden id="replacePhoto" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Reemplazar fotografía elegida"><input class="file-only" hidden id="galleryPhoto" type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Añadir fotografías"><ol class="editor-gallery" id="galleryEditor" aria-label="Tus fotografías">${galleryItems(d)}</ol><details id="photoTools" class="simple-disclosure"><summary>Mejorar fotografía</summary><p class="small">Se mejora la foto principal. Para usar otra, elige «Hacer principal».</p><div class="preview" id="imagePreview">${draftPhotos(d)[0]?`<img src="${photo(draftPhotos(d)[0])}" alt="Fotografía principal">`:''}</div><details><summary>Ajustes gratuitos</summary><div class="grid2"><div class="field"><label for="photoBrightness">Luz</label><select class="select" id="photoBrightness"><option value="80">Más oscura</option><option value="100" selected>Original</option><option value="115">Un poco más clara</option><option value="130">Más clara</option></select></div><div class="field"><label for="photoContrast">Contraste</label><select class="select" id="photoContrast"><option value="80">Suave</option><option value="100" selected>Original</option><option value="110">Un poco más definido</option><option value="120">Más definido</option></select></div></div><div class="field"><label for="photoRotation">Giro</label><select class="select" id="photoRotation"><option value="0">Original</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></div><button class="btn alt" id="generateImage" type="button">Aplicar ajustes</button><p class="small">Añade margen blanco; conserva el fondo de la foto.</p></details><button class="btn ghost" id="restoreImage" type="button">Restaurar original</button><p id="photoStatus" role="status" class="small"></p></details></section>`;}
function editor({draft:d,galleryEnabled=true}){return `<div class="workspace product-editor simple-editor"><a class="smalllinks" href="panel.html#mis-productos">← Mis productos</a><h1>${d.id?'Editar producto':'Agregar producto'}</h1><p class="editor-intro">Tu creación, lista para compartir.</p>${d.moderationHidden?`<p class="profile-first-notice" role="status">Oculto por administración: ${escape(d.moderationReason)}. Puedes guardar un borrador.</p>`:''}<form id="productForm" novalidate><fieldset id="productFields"><legend class="sr-only">Datos del producto</legend>${field('prodName','Nombre del producto *',d.name,'required minlength="2" maxlength="120" placeholder="Ej. Aretes tejidos"')}${photoEditor(d,galleryEnabled)}<div class="grid2"><div class="field"><label for="prodCategory">Categoría</label><select class="select" id="prodCategory">${['Bolsos','Textiles','Decoración','Accesorios','Otros'].map(x=>`<option ${d.category===x?'selected':''}>${x}</option>`).join('')}</select></div>${field('prodPrice','Precio en soles (opcional)',d.price,'type="number" min="0" max="99999999.99" step="0.01" placeholder="Dejar vacío para consultar"')}</div>${field('prodMaterial','Materiales *',d.material,'maxlength="500" placeholder="Ej. Hilo de algodón"')}<div class="field description-field"><label for="approveTextArea">Descripción *</label><textarea class="textarea" id="approveTextArea" rows="4" maxlength="5000" data-ai-generate="product" placeholder="Cuenta cómo es tu pieza…">${escape(d.ai?.text||d.story||'')}</textarea></div><p class="ai-origin small" id="textOrigin" ${d.ai?.textGenerated?'':'hidden'}>✦ Texto con IA · revisa los datos</p><details class="simple-disclosure" id="moreDetails"><summary>Más detalles</summary>${field('prodDim','Medidas',d.dimensions,'maxlength="500"')}${field('prodCare','Cuidados',d.care,'maxlength="1500"')}<div class="field"><label for="prodStock">Disponibilidad</label><select class="select" id="prodStock">${[...new Set(['Disponible','Por pedido','Agotado',d.stock].filter(Boolean))].map(x=>`<option ${d.stock===x?'selected':''}>${escape(x)}</option>`).join('')}</select></div></details><details class="simple-disclosure" id="productReviewDetails"><summary>Vista previa y revisión</summary><button id="generateText" class="btn alt" type="button">✦ Crear descripción desde los datos</button><div id="productReview" class="product-review"></div><div class="row"><button class="btn alt" id="approveImage" type="button">Aprobar fotografías</button><button class="btn alt" id="approveText" type="button">Aprobar descripción</button></div><p class="small" id="textStatus" role="status"></p></details><p id="publishHint" class="small" role="status"></p><div class="simple-save-actions"><button type="submit" id="saveDraft" class="btn alt">${d.published?'Guardar y ocultar':'Guardar borrador'}</button><button type="button" id="publishProduct" class="btn">${d.published?'Guardar cambios':'Publicar producto'}</button></div></fieldset><p class="editor-save-status" id="saveStatus" role="status" aria-live="polite"></p></form></div>`;}
function mountPanel({cloud,products,toast,reload}){
 let working=false;
 document.querySelectorAll('[data-product-action]').forEach(button=>button.onclick=async()=>{
  if(working)return;const p=products.find(p=>p.id===button.dataset.id);if(!p)return;
  const action=button.dataset.productAction;
  if(action==='delete'&&!window.confirm(`¿Eliminar definitivamente «${p.name}»? No podrás recuperar este registro.`))return;
  working=true;const buttons=[...document.querySelectorAll('[data-product-action]')];buttons.forEach(b=>b.disabled=true);
  const message=document.getElementById('managementStatus');message.textContent='Guardando en tu cuenta…';
  try{
   if(action==='visibility')await cloud.setProductPublished(p.id,!p.published);
   if(action==='stock')await cloud.setProductStock(p.id,p.stock==='Agotado'?'Disponible':'Agotado');
   if(action==='delete')await cloud.deleteProduct(p.id);
   if(action==='duplicate'){const id=await cloud.duplicateProduct(p.id);location.href='nuevo.html?editar='+encodeURIComponent(id);return;}
   await reload();toast('Cambio guardado en tu cuenta.');
  }catch(error){message.textContent='No se guardó: '+error.message;}
  finally{working=false;buttons.forEach(b=>b.disabled=false);}
 });
}
function mountEditor({cloud,draft:d,store,toast,resize,galleryEnabled=true}){
 const byId=id=>document.getElementById(id),form=byId('productForm'),fields=byId('productFields');let working=false;
 const saveMessage=message=>{byId('saveStatus').textContent=message;};
 const persist=()=>{store();saveMessage('Cambios sin guardar.');};
 byId('approveTextArea').addEventListener('khipu:ai-accepted',()=>{d.ai.textGenerated=true;persist();});
 const read=()=>{[['name','prodName'],['category','prodCategory'],['price','prodPrice'],['material','prodMaterial'],['dimensions','prodDim'],['care','prodCare'],['stock','prodStock']].forEach(([key,id])=>d[key]=byId(id).value);d.ai.text=byId('approveTextArea').value;d.story=d.ai.text;};
 const image=()=>d.ai.image||d.photos?.[0]||'';
 byId('approveTextArea').khipuGenerate=()=>{read();return !d.name.trim()||!d.material.trim()?{error:'Completa el nombre y los materiales para generar una descripción.'}:{kind:'producto',entity:d.id||null,product:{name:d.name,material:d.material,story:d.story,dimensions:d.dimensions,care:d.care}};};
 const review=()=>{const labels=[['Categoría',d.category],['Precio',d.price===''||d.price==null?'Por consultar':'S/ '+d.price],['Materiales',d.material],['Medidas',d.dimensions],['Disponibilidad',d.stock],['Cuidados',d.care]];byId('productReview').innerHTML='<div class="review-photo">'+(image()?'<img src="'+photo(image())+'" alt="Foto principal">':'Sin fotografía')+'</div><div><h3>'+escape(d.name||'Tu producto')+'</h3><p>'+escape(d.ai.text||d.story||'')+'</p><dl>'+labels.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+escape(value||'Sin indicar')+'</dd></div>').join('')+'</dl></div>';};
 form.addEventListener('invalid',event=>{const details=event.target.closest('details');if(details)details.open=true;},true);
 form.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName==='INPUT'&&event.target.type!=='file')event.preventDefault();});
 const refresh=()=>{
  review();
  byId('approveImage').disabled=working||!image();byId('approveText').disabled=working||!d.ai.text.trim();
  byId('approveImage').hidden=!!d.published;byId('approveText').hidden=!!d.published;
  byId('photoStatus').textContent=d.ai.imageOK?'Fotografías aprobadas':'Fotografías pendientes de revisión';byId('galleryPhoto').disabled=working||draftPhotos(d).length>=(galleryEnabled?3:1);byId('textStatus').textContent=d.ai.textOK?'Descripción aprobada':'Descripción pendiente de revisión';
  if(d.published){byId('photoStatus').textContent='Puedes actualizar las fotografías con Guardar cambios.';byId('textStatus').textContent='Puedes actualizar la descripción con Guardar cambios.';}
  byId('publishProduct').disabled=working||!!d.moderationHidden;
  byId('restoreImage').disabled=working||!d.ai.image;
  byId('publishHint').textContent=d.moderationHidden?'Solo puedes guardar un borrador.':d.published?'Guardar cambios actualiza tu publicación.':'Al publicar confirmas que revisaste las fotos y el texto.';
 };
 const busy=async task=>{if(working)return;working=true;fields.disabled=true;try{await task();}catch(error){if(form.isConnected){saveMessage('No se guardó: '+error.message);toast(error.message);}}finally{working=false;fields.disabled=false;if(form.isConnected)refresh();}};
 const preview=()=>{byId('imagePreview').innerHTML=photo(image())?`<img src="${photo(image())}" alt="Fotografía principal del producto">`:'<span>Aún no elegiste una fotografía</span>';byId('galleryEditor').innerHTML=galleryItems(d);byId('galleryCount').textContent=draftPhotos(d).length+' de '+(galleryEnabled?3:1)+' fotografías';};
 const changedPhotos=()=>{d.ai.imageOK=false;persist();preview();refresh();};
 const aiBox=document.createElement('section');aiBox.className='panel';aiBox.setAttribute('data-writing-ui','photo');
 aiBox.innerHTML='<h3>Foto de estudio con IA</h3><p class="muted small">Pollinations recibe tu fotografía para proponer un fondo blanco y mejorar la iluminación. Cada propuesta consume un intento de tu plan y créditos Pollen. Revisa colores, formas y bordados antes de aceptarla.</p><button class="btn alt smallbtn" type="button" id="photoAIGenerate">✦ Mejorar foto con IA</button><p class="small" id="photoAIStatus" role="status">La foto actual se conserva hasta que aceptes una propuesta.</p><div id="photoAICompare" hidden><div class="grid2"><div><h4>Foto actual</h4><img id="photoAIOriginal" alt="Fotografía antes de la edición" style="width:100%;max-height:320px;object-fit:contain"></div><div><h4>Propuesta · IA</h4><img id="photoAIProposal" alt="Propuesta de fotografía editada con IA" style="width:100%;max-height:320px;object-fit:contain"></div></div><div class="row"><button class="btn smallbtn" type="button" id="photoAIAccept">Usar esta foto</button><button class="btn ghost smallbtn" type="button" id="photoAIKeep">Conservar foto actual</button></div></div>';
 byId('photoTools').append(aiBox);
 let photoProposal=null;const photoStatus=byId('photoAIStatus'),compare=byId('photoAICompare');
 const clearProposal=()=>{photoProposal=null;compare.hidden=true;byId('photoAIGenerate').textContent='✦ Mejorar foto con IA';byId('photoAIOriginal').removeAttribute('src');byId('photoAIProposal').removeAttribute('src');};
 byId('photoAIKeep').onclick=()=>{clearProposal();photoStatus.textContent='Propuesta descartada. Tu fotografía actual se conserva.';};
 byId('photoAIAccept').onclick=()=>{if(working||!photoProposal)return;if(photoProposal.owner!==cloud.user?.id||photoProposal.entity!==(d.id||null)||photoProposal.source!==image()){clearProposal();photoStatus.textContent='La foto, el producto o la sesión cambió. Solicita una nueva propuesta.';return;}d.ai.image=photoProposal.image;clearProposal();changedPhotos();photoStatus.textContent=d.published?'Propuesta aceptada. Pulsa Guardar cambios para actualizar la foto publicada.':'Propuesta aceptada. Revisa y aprueba las fotografías antes de guardar.';};
 byId('photoAIGenerate').onclick=()=>busy(async()=>{
  if(!cloud.improvePhoto)throw Error('No se pudo iniciar la edición de la foto. Actualiza la página y vuelve a intentarlo.');if(!image())throw Error('Elige primero una fotografía.');
  const source=image(),entity=d.id||null,owner=cloud.user?.id;clearProposal();photoStatus.textContent='Comprobando intentos…';
  try{
   const quota=await cloud.aiQuota('generate_image',entity);if(!quota.remaining)throw Error('Alcanzaste el límite de intentos de imágenes.');if(!form.isConnected||owner!==cloud.user?.id)return;
   const encoded=await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const c=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.85));}catch{reject(Error('No se pudo preparar esta foto. Vuelve a subirla.'));}};img.onerror=()=>reject(Error('No se pudo abrir esta foto. Vuelve a subirla.'));img.src=source;});
   if(!form.isConnected||owner!==cloud.user?.id)return;photoStatus.textContent='Preparando la foto con Pollinations. Puede tardar hasta 90 segundos…';
   const answer=await cloud.improvePhoto({image:encoded,entity});if(!form.isConnected||owner!==cloud.user?.id||source!==image()||entity!==(d.id||null))return;
   photoProposal={source,entity,owner,image:answer.image};byId('photoAIGenerate').textContent='✦ Rehacer foto con IA';byId('photoAIOriginal').src=source;byId('photoAIProposal').src=answer.image;compare.hidden=false;photoStatus.textContent='Compara los detalles. '+(answer.quota?answer.quota.remaining+(answer.quota.remaining===1?' intento disponible. ':' intentos disponibles. '):'')+'Aceptar no guarda ni publica.';
  }catch(error){if(form.isConnected)photoStatus.textContent=error.message;}
 });
 let replaceIndex=0;
 const validateFiles=files=>{for(const file of files)if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Elige PNG, JPG o WebP de hasta 10 MB por fotografía.');};
 byId('galleryEditor').onclick=event=>{
  if(working)return;if(event.target.closest('[data-photo-add]')){byId('galleryPhoto').click();return;}const replace=event.target.closest('[data-photo-replace]');if(replace){replaceIndex=Number(replace.dataset.photoReplace);byId('replacePhoto').click();return;}const remove=event.target.closest('[data-photo-remove]'),main=event.target.closest('[data-photo-main]');if(!remove&&!main)return;
  const images=draftPhotos(d),index=Number(remove?remove.dataset.photoRemove:main.dataset.photoMain);if(!Number.isInteger(index)||index<0||index>=images.length)return;
  if(remove)images.splice(index,1);else images.unshift(...images.splice(index,1));
  d.photos=images;d.ai.image='';changedPhotos();
 };
 byId('replacePhoto').onchange=()=>busy(async()=>{const input=byId('replacePhoto'),file=input.files?.[0];if(!file)return;validateFiles([file]);const images=draftPhotos(d),index=replaceIndex;if(index<0||index>=images.length)return;const resized=await resize(file);if(!form.isConnected)return;images[index]=resized;d.photos=images;d.ai.image='';input.value='';changedPhotos();});
 byId('galleryPhoto').onchange=()=>busy(async()=>{

  const input=byId('galleryPhoto'),files=[...(input.files||[])];if(!files.length)return;
  const current=draftPhotos(d);if(current.length+files.length>(galleryEnabled?3:1))throw Error('Puedes guardar hasta tres fotografías. Quita una antes de agregar otra.');
  validateFiles(files);const images=await Promise.all(files.map(resize));if(!form.isConnected)return;
  d.photos=[...current,...images];d.ai.image='';input.value='';changedPhotos();
 });

 form.querySelectorAll('input:not([type=file]),select,textarea').forEach(input=>input.addEventListener('input',()=>{read();if(input.id==='approveTextArea')d.ai.textOK=false;persist();refresh();}));
 byId('productPhoto').onchange=()=>busy(async()=>{
  const input=byId('productPhoto'),file=input.files?.[0];if(!file)return;validateFiles([file]);
  const resized=await resize(file);if(!form.isConnected)return;
  d.photos=[resized,...draftPhotos(d).slice(1)];d.ai.image='';input.value='';changedPhotos();
 });
 byId('generateImage').onclick=()=>busy(async()=>{
  if(!image())throw Error('Elige primero una fotografía.');
  const brightness=Math.max(80,Math.min(130,Number(byId('photoBrightness').value)||100)),contrast=Math.max(80,Math.min(120,Number(byId('photoContrast').value)||100));
  const angle=[0,90,180,270].includes(Number(byId('photoRotation').value))?Number(byId('photoRotation').value):0;
  const result=await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=960;canvas.height=780;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,960,780);const sideways=angle===90||angle===270;const scale=Math.min(880/(sideways?img.height:img.width),700/(sideways?img.width:img.height),1);ctx.save();ctx.translate(480,390);ctx.rotate(angle*Math.PI/180);ctx.filter=`brightness(${brightness}%) contrast(${contrast}%)`;ctx.drawImage(img,-img.width*scale/2,-img.height*scale/2,img.width*scale,img.height*scale);ctx.restore();resolve(canvas.toDataURL('image/jpeg',.88));}catch{reject(Error('No se pudo preparar el encuadre. Puedes aprobar la foto original.'));}};img.onerror=()=>reject(Error('No se pudo abrir esta fotografía.'));img.src=d.photos?.[0]||image();});
  if(!form.isConnected)return;d.ai.image=result;changedPhotos();
 });
 byId('restoreImage').onclick=()=>{if(working)return;d.ai.image='';byId('photoBrightness').value='100';byId('photoContrast').value='100';byId('photoRotation').value='0';changedPhotos();};
 byId('generateText').onclick=()=>window.khipuTextAssist?.propose(byId('approveTextArea'),byId('approveTextArea').khipuGenerate());
 byId('approveImage').onclick=()=>{d.ai.imageOK=!!image();persist();refresh();};
 byId('approveText').onclick=()=>{read();d.ai.textOK=!!d.ai.text.trim();persist();refresh();};
 const save=published=>{if(working)return;read();if(!form.reportValidity())return;
  if(published&&(!d.material.trim()||!image()||!d.ai.text.trim())){const message=!d.material.trim()?'Indica los materiales para publicar.':!image()?'Añade una foto para publicar.':'Escribe una descripción para publicar.';saveMessage(message);const target=!d.material.trim()?byId('prodMaterial'):!image()?byId('galleryEditor').querySelector('[data-photo-add]'):byId('approveTextArea');target.focus?.();return;}
  return busy(async()=>{
  if(published&&d.moderationHidden)throw Error('Este producto está oculto por administración. Guarda tus correcciones como borrador.');
  if(published){if(!d.material.trim()){byId('prodMaterial').focus();throw Error('Indica los materiales para publicar.');}if(!image()){byId('photosTitle').focus?.();throw Error('Añade una foto para publicar.');}if(!d.ai.text.trim()){byId('approveTextArea').focus();throw Error('Escribe una descripción para publicar.');}}
  saveMessage('Guardando en tu cuenta…');
  const saved=await cloud.saveProduct({id:d.id,name:d.name,category:d.category,price:d.price,material:d.material,dimensions:d.dimensions,care:d.care,stock:d.stock,story:d.ai.text||d.story,img:image(),photos:draftPhotos(d).slice(1)},{published});
  if(!form.isConnected)return;const id=saved.id;d.id=id;d.published=published;d.photos=[saved.imageUrl,...(saved.photos||[])].filter(Boolean);d.ai.image='';if(published){d.ai.imageOK=true;d.ai.textOK=true;}store();preview();
  // Keep the same row on subsequent saves, even if the user clicks again.
  window.history?.replaceState(null,'','nuevo.html?editar='+encodeURIComponent(id));
  saveMessage(published?'Cambios guardados. El producto sigue publicado.':'Borrador guardado en tu cuenta. Puedes recuperarlo en Mis productos.');
  byId('saveDraft').textContent=published?'Guardar y ocultar':'Guardar borrador';
  byId('publishProduct').textContent=published?'Guardar cambios publicados':'Publicar producto';
  toast(published?'Producto publicado.':'Borrador guardado en tu cuenta.');
 });};
 form.onsubmit=event=>{event.preventDefault();return save(false);};byId('publishProduct').onclick=()=>save(true);if(window.location?.hash==='#preparar')byId('photoTools').open=true;refresh();
}
function simplify(page){
 const disclosure=(title)=>{const d=document.createElement('details');d.className='simple-disclosure';const s=document.createElement('summary');s.textContent=title;d.append(s);return d;};
 if(page==='mi-perfil'){
  const form=document.getElementById('profileForm');if(!form)return;form.classList.add('simple-profile');
  const definitions=[['Mis datos',['profileName','profileCity','profileAvatar','profileSpecialty']],['Mi historia',['profileBio','profileStory','profileExperience','profileFair']],['Mis redes',['profileWhatsapp','facebook','instagram','youtube','tiktok','profileVideo']]];
  const groups=definitions.map(([title,ids])=>{const d=disclosure(title);ids.forEach(id=>{const field=document.getElementById(id)?.closest('.field');if(field)d.append(field);});return d;});groups[0].open=true;
  const actions=form.querySelector('button[type=submit]').parentElement;form.replaceChildren(...groups,actions);
  form.addEventListener('invalid',event=>{const d=event.target.closest('details');if(d)d.open=true;},true);
  form.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)groups.filter(other=>other!==d).forEach(other=>other.open=false);}));
  const plan=disclosure('Mi plan');plan.innerHTML+='<a class="btn alt" href="mi-plan.html">Ver mi plan y pagos</a>';form.after(plan);
  const security=document.getElementById('accountSecurity');if(security){const wrapper=disclosure('Seguridad y contraseña');security.before(wrapper);wrapper.append(security);}
 }
 if(page==='difusion'){
  const preview=document.getElementById('socialPreview'),panel=preview?.closest('.panel');if(!panel)return;panel.classList.add('simple-promotion');
  preview.rows=4;preview.placeholder='Escribe tu mensaje o usa la IA.';
  const heading=panel.parentElement.querySelector('h1');if(heading){heading.textContent='Promocionar';if(heading.previousElementSibling?.classList.contains('eyebrow'))heading.previousElementSibling.remove();if(heading.nextElementSibling?.tagName==='P')heading.nextElementSibling.textContent='Elige tu producto y comparte un mensaje.';}
  const product=document.getElementById('shareProduct').closest('.field'),network=document.querySelector('.social-network-choices'),channel=document.getElementById('shareChannel'),message=preview.closest('.field'),origin=document.getElementById('socialOrigin'),photo=document.getElementById('socialProductCard'),share=document.getElementById('sharePlatform'),help=document.getElementById('channelHelp'),status=document.getElementById('shareStatus');
  const more=disclosure('Más opciones');more.append(document.getElementById('shareStyle').closest('.field'));
  const buttons=document.createElement('div');buttons.className='row';['shareNative','copySocial','downloadPhoto','generateSocial','retrySocial','approveSocial'].forEach(id=>buttons.append(document.getElementById(id)));more.append(buttons);
  const info=disclosure('Ver producto');photo.querySelector('p')?.remove();info.append(photo);
  panel.replaceChildren(product,channel,network,message,origin,share,status,help,info,more);
  const related=panel.nextElementSibling;if(related){const extra=disclosure('Compartir también mi perfil');panel.after(extra);extra.append(related);}
  share.classList.add('wide');share.setAttribute('aria-describedby','channelHelp');
 }
}
window.khipuWorkspace={panel,editor,mountPanel,mountEditor,simplify};
})();
