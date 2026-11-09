/* Product management uses the existing owner-protected Supabase tables. */
(()=>{'use strict';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo=value=>/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(value||'')?escape(value):'';
const field=(id,label,value='',options='')=>`<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" value="${escape(value)}" ${options}></div>`;
const status=p=>p.moderationHidden?'Oculto por administración':!p.published?'Borrador / oculto':p.stock==='Agotado'?'Publicado · agotado':'Publicado';
function panel({artisan,products,hasProfile=true}){
 return `<div class="workspace"><span class="eyebrow">Tu espacio de trabajo</span><h1>¡Hola, ${escape(artisan.name.split(' ')[0]||'artesana')}!</h1><p>Tu perfil y tus productos se guardan en tu cuenta.</p>${!hasProfile?'<p class="profile-first-notice" id="profileFirstNotice" role="status">Empieza creando y guardando tu perfil. Es necesario antes de agregar un producto.</p>':''}<div class="workspace-actions" aria-label="Herramientas de tu negocio"><a href="mi-perfil.html" class="profile-first-action"><b>${hasProfile?'Mi perfil':'Crear mi perfil'}</b><span>${hasProfile?'Historia y contacto':'Primer paso para empezar'}</span></a><a href="${hasProfile?'nuevo.html?crear=1':'mi-perfil.html?primero=1'}" ${hasProfile?'':'aria-describedby="profileFirstNotice"'}><b>Agregar producto</b><span>${hasProfile?'Fotografía y descripción':'Primero guarda tu perfil'}</span></a><a href="#mis-productos"><b>Mis productos</b><span>Editar y administrar</span></a><a href="difusion.html"><b>Promocionar</b><span>Preparar para tus redes</span></a></div><section id="mis-productos" class="section"><div class="section-head"><div><h2>Mis productos</h2><p class="muted">${products.length} guardados · ${products.filter(p=>p.published).length} publicados</p></div><a class="btn alt" href="${hasProfile?'nuevo.html?crear=1':'mi-perfil.html?primero=1'}">Agregar producto</a></div><p id="managementStatus" role="status" aria-live="polite"></p><div class="owned-products">${products.map(p=>`<article class="owned-product" data-owned-product="${escape(p.id)}"><div class="owned-photo">${photo(p.img)?`<img src="${photo(p.img)}" alt="${escape(p.name)}" width="160" height="130" loading="lazy">`:'<span>Sin fotografía</span>'}</div><div class="owned-info"><span class="eyebrow">${status(p)}</span><h3>${escape(p.name)}</h3><p>${escape(p.category)} · ${p.price===''||p.price==null?'Precio por consultar':'S/ '+escape(p.price)}</p><div class="owned-controls"><a class="btn alt smallbtn" href="nuevo.html?editar=${encodeURIComponent(p.id)}">Editar</a>${p.moderationHidden?'<span class="small">Publicación bloqueada por administración</span>':p.published?`<button class="btn alt smallbtn" data-product-action="visibility" data-id="${escape(p.id)}">Ocultar</button>`:`<a class="btn alt smallbtn" href="nuevo.html?editar=${encodeURIComponent(p.id)}">Revisar y publicar</a>`}<button class="btn ghost smallbtn" data-product-action="duplicate" data-id="${escape(p.id)}">Duplicar</button><button class="btn ghost smallbtn" data-product-action="stock" data-id="${escape(p.id)}">${p.stock==='Agotado'?'Marcar disponible':'Marcar agotado'}</button>${p.published?`<a class="smalllinks" href="producto.html?id=${encodeURIComponent(p.id)}">Ver publicación ↗</a>`:''}<button class="btn ghost smallbtn" data-product-action="delete" data-id="${escape(p.id)}">Eliminar</button></div></div></article>`).join('')||'<div class="empty"><h3>Tus creaciones empiezan aquí</h3><p>Guarda primero tu perfil y después agrega tu primer producto. Los ejemplos de la tienda no forman parte de tu cuenta.</p><a class="btn" href="mi-perfil.html">Completar mi perfil</a></div>'}</div></section><button class="btn ghost" id="logout">Cerrar sesión</button></div>`;
}
const draftPhotos=d=>[d.ai?.image||d.photos?.[0]||'',...(d.photos||[]).slice(1)].filter(Boolean);
function galleryItems(d){return draftPhotos(d).map((image,index)=>`<li class="editor-photo"><span class="photo-label">${index===0?'Principal':'Fotografía '+(index+1)}</span><img src="${photo(image)}" alt="${index===0?'Fotografía principal':'Fotografía adicional '+index}" width="160" height="130"><div class="photo-controls">${index>0?`<button class="btn alt smallbtn" type="button" data-photo-main="${index}" aria-label="Usar fotografía ${index+1} como principal">Hacer principal</button>`:''}<button class="btn ghost smallbtn" type="button" data-photo-remove="${index}" aria-label="Quitar fotografía ${index+1}">Quitar</button></div></li>`).join('');}
function photoEditor(d,enabled=true){const images=draftPhotos(d);return `<div class="panel"><h3>Fotografías del producto</h3><p class="muted small">${enabled?'Hasta tres fotos PNG, JPG o WebP. La principal aparece en el catálogo.':'Puedes guardar una fotografía principal. La galería ampliada aún no está activa.'}</p><div class="preview" id="imagePreview">${images[0]?`<img src="${photo(images[0])}" alt="Fotografía principal del producto">`:'<span>Aún no elegiste una fotografía</span>'}</div><div class="field"><label for="productPhoto">${images.length?'Reemplazar fotografía principal':'Elegir fotografía principal'}</label><input id="productPhoto" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="field"><label for="galleryPhoto">Agregar fotos a la galería</label><input id="galleryPhoto" ${enabled?'':'disabled'} type="file" multiple accept="image/png,image/jpeg,image/webp" aria-describedby="galleryCount"></div><p class="small" id="galleryCount" role="status">${images.length} de ${enabled?3:1} fotografías</p><ol class="editor-gallery" id="galleryEditor" aria-label="Fotografías de tu producto">${galleryItems(d)}</ol><div class="row"><button class="btn alt smallbtn" id="generateImage" type="button">Preparar encuadre principal</button><button class="btn smallbtn" id="approveImage" type="button">Aprobar fotografías</button></div><p id="photoStatus" class="small" role="status">${d.ai?.imageOK?'Fotografías aprobadas':'Revisa todas tus fotografías antes de publicar.'}</p><p class="muted small">El encuadre se procesa en tu dispositivo; no utiliza IA.</p></div>`;}
function editor({draft:d,galleryEnabled=true}){
 const a=d.ai||{};
 return `<div class="workspace product-editor"><a class="smalllinks" href="panel.html#mis-productos">← Mis productos</a><span class="eyebrow">Tu creación</span><h1>${d.id?'Editar producto':'Agregar producto'}</h1>${d.moderationHidden?`<p class="profile-first-notice" role="status">Oculto por administración: ${escape(d.moderationReason)}. Puedes guardar correcciones como borrador.</p>`:''}<p>Completa los datos y guarda un borrador en tu cuenta. Publica cuando hayas revisado la fotografía y la descripción.</p><form id="productForm" novalidate><fieldset id="productFields"><legend class="sr-only">Datos de la artesanía</legend><div class="panel">${field('prodName','Nombre del producto',d.name,'required minlength="2" maxlength="120" placeholder="Ej. Bolso tejido a mano"')}<div class="grid2"><div class="field"><label for="prodCategory">Categoría</label><select class="select" id="prodCategory">${['Bolsos','Textiles','Decoración','Accesorios','Otros'].map(x=>`<option ${d.category===x?'selected':''}>${x}</option>`).join('')}</select></div>${field('prodPrice','Precio en soles (opcional)',d.price,'type="number" min="0" max="99999999.99" step="0.01" placeholder="Dejar vacío para consultar"')}</div><div class="grid2">${field('prodMaterial','Materiales',d.material,'maxlength="500"')}${field('prodDim','Dimensiones',d.dimensions,'maxlength="500"')}</div><div class="field"><label for="prodStock">Disponibilidad</label><select class="select" id="prodStock">${[...new Set(['Disponible','Por pedido','Agotado',d.stock].filter(Boolean))].map(x=>`<option ${d.stock===x?'selected':''}>${escape(x)}</option>`).join('')}</select></div>${field('prodCare','Cuidados',d.care,'maxlength="1500"')}</div><section id="preparar" class="section"><h2>Fotografía y descripción</h2><div class="grid2">${photoEditor(d,galleryEnabled)}<div class="panel"><h3>Descripción pública</h3><p class="ai-origin" id="textOrigin" ${a.textGenerated?'':'hidden'}><span aria-hidden="true">✦</span> Texto generado con IA · revisa sus datos</p><div class="field"><label for="approveTextArea">Descripción e historia de elaboración</label><textarea class="textarea" id="approveTextArea" rows="9" maxlength="5000">${escape(a.text||d.story||'')}</textarea></div><div class="row"><button class="btn alt smallbtn" id="generateText" type="button">Generar descripción <span class="ai-mark"><span aria-hidden="true">✦</span> IA</span></button><button class="btn smallbtn" id="approveText" type="button">Aprobar descripción</button></div><p id="textStatus" class="small" role="status">${a.textOK?'Descripción aprobada':'Puedes escribirla tú misma y aprobarla.'}</p><p class="muted small">La IA necesita estar habilitada. Puedes guardar y publicar con una descripción escrita por ti.</p></div></div></section><div class="panel publish-panel"><h2>Guardar tu creación</h2><p id="saveStatus" role="status" aria-live="polite">${d.id?'Producto recuperado de tu cuenta.':'Los cambios sin guardar se conservan temporalmente en esta pestaña.'}</p><p id="publishHint" class="muted">Aprueba las fotografías y la descripción antes de publicar.</p><div class="row"><button type="submit" id="saveDraft" class="btn alt">${d.published?'Guardar y ocultar':'Guardar borrador'}</button><button type="button" id="publishProduct" class="btn">${d.published?'Guardar cambios publicados':'Publicar producto'}</button></div><p class="small muted">Guardar borrador lo conserva en tu cuenta sin mostrarlo en el catálogo.${d.published?' «Guardar y ocultar» retira la publicación actual.':''}</p></div></fieldset></form></div>`;
}
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
 const persist=()=>{store();byId('saveStatus').textContent='Cambios pendientes. Pulsa Guardar borrador o Publicar para guardarlos en tu cuenta.';};
 const read=()=>{[['name','prodName'],['category','prodCategory'],['price','prodPrice'],['material','prodMaterial'],['dimensions','prodDim'],['care','prodCare'],['stock','prodStock']].forEach(([key,id])=>d[key]=byId(id).value);d.ai.text=byId('approveTextArea').value;d.story=d.ai.text;};
 const image=()=>d.ai.image||d.photos?.[0]||'';
 const refresh=()=>{
  byId('approveImage').disabled=working||!image();byId('approveText').disabled=working||!d.ai.text.trim();
  byId('photoStatus').textContent=d.ai.imageOK?'Fotografías aprobadas':'Fotografías pendientes de revisión';byId('galleryPhoto').disabled=working||!galleryEnabled||draftPhotos(d).length>=3;byId('textStatus').textContent=d.ai.textOK?'Descripción aprobada':'Descripción pendiente de revisión';
  byId('publishProduct').disabled=working||!!d.moderationHidden||!d.ai.imageOK||!d.ai.textOK;
  byId('publishHint').textContent=d.ai.imageOK&&d.ai.textOK?'Fotografías y descripción aprobadas. Puedes publicar.':'Aprueba las fotografías y la descripción antes de publicar.';
 };
 const busy=async task=>{if(working)return;working=true;fields.disabled=true;try{await task();}catch(error){if(form.isConnected){byId('saveStatus').textContent='No se guardó: '+error.message;toast(error.message);}}finally{working=false;fields.disabled=false;if(form.isConnected)refresh();}};
 const preview=()=>{byId('imagePreview').innerHTML=photo(image())?`<img src="${photo(image())}" alt="Fotografía principal del producto">`:'<span>Aún no elegiste una fotografía</span>';byId('galleryEditor').innerHTML=galleryItems(d);byId('galleryCount').textContent=draftPhotos(d).length+' de '+(galleryEnabled?3:1)+' fotografías';};
 const changedPhotos=()=>{d.ai.imageOK=false;persist();preview();refresh();};
 const validateFiles=files=>{for(const file of files)if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Elige PNG, JPG o WebP de hasta 10 MB por fotografía.');};
 byId('galleryEditor').onclick=event=>{
  if(working)return;const remove=event.target.closest('[data-photo-remove]'),main=event.target.closest('[data-photo-main]');if(!remove&&!main)return;
  const images=draftPhotos(d),index=Number(remove?remove.dataset.photoRemove:main.dataset.photoMain);if(!Number.isInteger(index)||index<0||index>=images.length)return;
  if(remove)images.splice(index,1);else images.unshift(...images.splice(index,1));
  d.photos=images;d.ai.image='';changedPhotos();
 };
 byId('galleryPhoto').onchange=()=>busy(async()=>{
  if(!galleryEnabled)throw Error('La galería ampliada aún no está activa. Puedes guardar una fotografía principal.');
  const input=byId('galleryPhoto'),files=[...(input.files||[])];if(!files.length)return;
  const current=draftPhotos(d);if(current.length+files.length>3)throw Error('Puedes guardar hasta tres fotografías. Quita una antes de agregar otra.');
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
  const result=await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=960;canvas.height=780;const ctx=canvas.getContext('2d');ctx.fillStyle='#F7F3EB';ctx.fillRect(0,0,960,780);const scale=Math.min(880/img.width,700/img.height);ctx.drawImage(img,(960-img.width*scale)/2,(780-img.height*scale)/2,img.width*scale,img.height*scale);resolve(canvas.toDataURL('image/jpeg',.82));}catch{reject(Error('No se pudo preparar el encuadre. Puedes aprobar la foto original.'));}};img.onerror=()=>reject(Error('No se pudo abrir esta fotografía.'));img.src=d.photos?.[0]||image();});
  if(!form.isConnected)return;d.ai.image=result;changedPhotos();
 });
 byId('generateText').onclick=()=>busy(async()=>{
  read();if(!d.name.trim()||!d.material.trim())throw Error('Completa el nombre y el material antes de generar.');
  const text=await cloud.generateDescription({kind:'producto',product:{name:d.name,material:d.material,story:d.story,dimensions:d.dimensions,care:d.care},previous:d.ai.text});
  if(!form.isConnected)return;d.ai.text=text;d.ai.textGenerated=true;byId('textOrigin').hidden=false;d.ai.textOK=false;byId('approveTextArea').value=text;persist();
 });
 byId('approveImage').onclick=()=>{d.ai.imageOK=!!image();persist();refresh();};
 byId('approveText').onclick=()=>{read();d.ai.textOK=!!d.ai.text.trim();persist();refresh();};
 const save=published=>busy(async()=>{
  read();if(!form.reportValidity())return;
  if(published&&d.moderationHidden)throw Error('Este producto está oculto por administración. Guarda tus correcciones como borrador.');
  if(published&&(!d.ai.imageOK||!d.ai.textOK))throw Error('Aprueba las fotografías y la descripción antes de publicar.');
  byId('saveStatus').textContent='Guardando en tu cuenta…';
  const saved=await cloud.saveProduct({id:d.id,name:d.name,category:d.category,price:d.price,material:d.material,dimensions:d.dimensions,care:d.care,stock:d.stock,story:d.ai.text||d.story,img:image(),photos:draftPhotos(d).slice(1)},{published});
  if(!form.isConnected)return;const id=saved.id;d.id=id;d.published=published;d.photos=[saved.imageUrl,...(saved.photos||[])].filter(Boolean);d.ai.image='';store();preview();
  // Keep the same row on subsequent saves, even if the user clicks again.
  window.history?.replaceState(null,'','nuevo.html?editar='+encodeURIComponent(id));
  byId('saveStatus').textContent=published?'Producto publicado y guardado en tu cuenta.':'Borrador guardado en tu cuenta. Puedes recuperarlo en Mis productos.';
  byId('saveDraft').textContent=published?'Guardar y ocultar':'Guardar borrador';
  byId('publishProduct').textContent=published?'Guardar cambios publicados':'Publicar producto';
  toast(published?'Producto publicado.':'Borrador guardado en tu cuenta.');
 });
 form.onsubmit=event=>{event.preventDefault();return save(false);};byId('publishProduct').onclick=()=>save(true);refresh();
}
window.khipuWorkspace={panel,editor,mountPanel,mountEditor};
})();
