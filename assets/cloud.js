/* Integración con Supabase. Las cuentas no autorizadas nunca reciben acceso de escritura. */
(function(){'use strict';
const cfg=window.KHIPU_CONFIG||{};
const enabled=!!(cfg.supabaseUrl && cfg.supabasePublishableKey);
const api=enabled && window.supabase ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let currentUser=null,approved=false,membership=null;
let gallerySupport=null;
// Keep successful uploads only while a failed save is being retried in this tab.
const pendingPhotos=new Map();
const authLinkError=['error','error_code'].some(key=>new URLSearchParams(location.hash.slice(1)).has(key)||new URLSearchParams(location.search||'').has(key));
let recovery= new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
if(api)api.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY')recovery=true;
 if(event==='SIGNED_OUT'){currentUser=null;approved=false;membership=null;clearPrivate();}
 // Do not call another Auth method inside this synchronous callback.
 setTimeout(()=>window.dispatchEvent(new CustomEvent('khipu:auth-change',{detail:{event,userId:session?.user?.id||null}})),0);
});
function clearPrivate(){
 pendingPhotos.clear();
 gallerySupport=null;
 try{
  for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('khipuFibra_private_'))sessionStorage.removeItem(key);}
  const previous=JSON.parse(localStorage.getItem('khipuFibra_v2')||'{}');
  localStorage.setItem('khipuFibra_v2',JSON.stringify({favorites:Array.isArray(previous.favorites)?previous.favorites:[]}));
  localStorage.removeItem('quipufibra_mockup_v1');
 }catch{/* Storage may be unavailable; never prevent Auth from signing out. */}
}
const fail=e=>{if(e){const error=Error(e.message||String(e));error.code=e.code;throw error;}};
const profileShape=(p)=>({name:p.name,city:p.city||'',specialty:p.specialty||'',bio:p.bio||'',story:p.story||'',experience:p.experience||'',fair:p.fair||'',facebook:p.facebook||'',instagram:p.instagram||'',tiktok:p.tiktok||'',youtube:p.youtube||'',video:p.video||'',whatsapp:p.whatsapp||'',avatar:p.avatar_url||'🧶',owner_id:p.user_id});
const mapProduct=(p)=>({id:p.id,name:p.name,category:p.category,material:p.material,price:p.price??'',img:p.image_url||'',photos:Array.isArray(p.gallery_urls)?p.gallery_urls:Array.isArray(p.photos)?p.photos:[],story:p.story||'',dimensions:p.dimensions||'',care:p.care||'',stock:p.stock||'',artisan:p.artesanas_perfiles?.name||'Artesana',owner_id:p.owner_id,published:p.publicado===true,collection:p.collection||'',time:'Consultar'});
const self=()=>{if(!approved||!currentUser)throw Error('No tienes autorización para gestionar artesanías.');};
async function init(){if(!enabled)return {enabled:false};if(!api)throw Error('No se pudo cargar Supabase. Revisa la conexión a Internet.');
 const {data,error}=await api.auth.getUser();if(error && !/session missing/i.test(error.message||''))console.warn('Sesión:',error.message);
 currentUser=data?.user||null;approved=false;
 membership=null;
 if(currentUser){const r=await api.rpc('khipu_request_access');fail(r.error);membership=r.data;approved=membership?.role==='artisan'&&membership?.status==='active';}
 return {enabled:true,approved,user:currentUser,membership,recovery};}
async function list({reviews=true}={}){if(!enabled)return {profiles:[],products:[],reviews:[]};
 let [catalog,r]=await Promise.all([
  api.rpc('khipu_public_catalog'),
  reviews?api.from('valoraciones').select('*').eq('aprobada',true).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null})]);
 fail(catalog.error);fail(r.error);
 return {profiles:(catalog.data?.profiles||[]).map(profileShape),products:(catalog.data?.products||[]).map(mapProduct),reviews:(r.data||[]).map(v=>({kind:v.kind,target:v.target,name:v.nombre,comment:v.comentario,score:v.estrellas,date:new Date(v.created_at).toLocaleDateString('es-PE')}))};}
async function myProfile(){self();let {data,error}=await api.from('artesanas_perfiles').select('*').eq('user_id',currentUser.id).maybeSingle();fail(error);return data?profileShape(data):null;}
async function saveProfile(a){self();let data={user_id:currentUser.id,name:a.name.trim(),city:a.city||'',specialty:a.specialty||'',bio:a.bio||'',story:a.story||'',experience:a.experience||'',fair:a.fair||'',facebook:a.facebook||'',instagram:a.instagram||'',tiktok:a.tiktok||'',youtube:a.youtube||'',video:a.video||'',whatsapp:a.whatsapp||'',avatar_url:/^https:\/\//.test(a.avatar||'')?a.avatar:'',visible:true};let r=await api.from('artesanas_perfiles').upsert(data,{onConflict:'user_id'}).select('id').single();fail(r.error);return r.data;}
async function uploadPhoto(img){self();if(!/^data:image\/(png|jpeg|webp);base64,/i.test(img||''))throw Error('Para publicar un producto real, sube una fotografía PNG, JPG o WebP desde tu dispositivo.');const blob=await (await fetch(img)).blob();if(blob.size>5*1024*1024)throw Error('La fotografía supera 5 MB. Intenta otra más pequeña.');const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';const path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;let r=await api.storage.from('productos').upload(path,blob,{contentType:blob.type,upsert:false});fail(r.error);return api.storage.from('productos').getPublicUrl(path).data.publicUrl;}
async function uploadAvatar(file){self();if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Selecciona PNG, JPG o WebP.');if(file.size>3*1024*1024)throw Error('Foto de perfil demasiado grande (máximo 3 MB).');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';let path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;let r=await api.storage.from('perfiles').upload(path,file,{contentType:file.type,upsert:false});fail(r.error);return api.storage.from('perfiles').getPublicUrl(path).data.publicUrl;}
async function checkGallery(){
 self();if(gallerySupport!==null)return gallerySupport;
 const r=await api.from('productos').select('gallery_urls').limit(0);
 if(r.error&&['42703','PGRST204'].includes(r.error.code)){gallerySupport=false;return false;}
 fail(r.error);gallerySupport=true;return true;
}
async function myProducts(){self();const owner=currentUser.id;const r=await api.from('productos').select('*').eq('owner_id',owner).order('created_at',{ascending:false});fail(r.error);const rows=r.data||[];if(rows.length)gallerySupport=Object.prototype.hasOwnProperty.call(rows[0],'gallery_urls');else await checkGallery();if(!approved||currentUser?.id!==owner)throw Error('Tu cuenta cambió. Vuelve a abrir tus productos.');return rows.map(mapProduct);}
async function ownedProduct(id){self();const r=await api.from('productos').select('*').eq('id',id).eq('owner_id',currentUser.id).single();fail(r.error);if(!r.data)throw Error('No se encontró este producto en tu cuenta.');return r.data;}
function productPrice(value){if(value===''||value==null)return null;const price=Number(value);if(!Number.isFinite(price)||price<0||price>99999999.99)throw Error('Ingresa un precio válido o deja el campo vacío.');return price;}
async function saveProduct(p,{published=true}={}){
 self();const owner=currentUser.id;
 const sameAccount=()=>{self();if(currentUser.id!==owner)throw Error('Tu cuenta cambió. Vuelve a abrir el producto antes de guardar.');};
 const name=String(p.name||'').trim();if(name.length<2||name.length>120)throw Error('El nombre debe tener entre 2 y 120 caracteres.');
 const price=productPrice(p.price);
 if(published&&(!String(p.material||'').trim()||!String(p.story||'').trim()||!p.img))throw Error('Para publicar, completa el material, la descripción y la fotografía.');
 // Existing images may only be retained from the owner's record. Never adopt an arbitrary URL.
 const previous=p.id?await ownedProduct(p.id):null;
 sameAccount();
 if(previous&&Object.prototype.hasOwnProperty.call(previous,'gallery_urls'))gallerySupport=true;
 const extras=p.photos===undefined?(previous?.gallery_urls||[]):p.photos;
 if(!Array.isArray(extras)||extras.length>2)throw Error('Puedes guardar hasta tres fotografías: una principal y dos adicionales.');
 if(extras.length&&!await checkGallery())throw Error('La galería ampliada aún no está activa. Guarda una fotografía principal por ahora.');
 if(!p.img&&extras.length)throw Error('Elige una fotografía principal para tu galería.');
 const requested=[p.img||'',...extras];
 const allowed=new Set([previous?.image_url,...(previous?.gallery_urls||[])].filter(Boolean));
 for(const [index,image] of requested.entries()){
  if(typeof image!=='string'||(!image&&index>0))throw Error('Revisa las fotografías de tu galería.');
  if(image&&!/^data:image\/(png|jpeg|webp);base64,/i.test(image)&&!allowed.has(image))throw Error('Sube una fotografía propia para guardar este producto.');
 }
 if(new Set(requested.filter(Boolean)).size!==requested.filter(Boolean).length)throw Error('Elige fotografías diferentes para tu galería.');
 const retryKeys=new Set(requested.map(image=>owner+':'+image));
 for(const key of pendingPhotos.keys())if(!retryKeys.has(key))pendingPhotos.delete(key);
 const check=await api.from('artesanas_perfiles').select('id').eq('user_id',currentUser.id).maybeSingle();fail(check.error);if(!check.data)throw Error('Primero completa y guarda tu perfil de artesana.');
 sameAccount();
 const uploads=await Promise.allSettled(requested.map(async image=>{
  if(!image||allowed.has(image))return image;
  sameAccount();const cacheKey=owner+':'+image;
  if(pendingPhotos.has(cacheKey))return pendingPhotos.get(cacheKey);
  const url=await uploadPhoto(image);sameAccount();pendingPhotos.set(cacheKey,url);return url;
 }));
 const failure=uploads.find(result=>result.status==='rejected');if(failure)throw failure.reason;
 sameAccount();const images=uploads.map(result=>result.value),image=images[0],photos=images.slice(1);
 const data={owner_id:owner,artisan_id:check.data.id,name,category:p.category||'Otros',material:p.material||'',price,dimensions:p.dimensions||'',care:p.care||'',story:p.story||'',stock:p.stock||'Disponible',collection:p.collection||'',image_url:image,publicado:published};
 if(gallerySupport===true)data.gallery_urls=photos;
 const query=previous?api.from('productos').update(data).eq('id',p.id).eq('owner_id',currentUser.id):api.from('productos').insert(data);
 const r=await query.select('id').single();fail(r.error);if(!r.data?.id)throw Error('No se pudo confirmar el guardado.');
 requested.forEach(image=>pendingPhotos.delete(owner+':'+image));
 return {id:r.data.id,imageUrl:image,photos};
}
async function setProductPublished(id,published){const p=await ownedProduct(id);if(published&&(!p.material?.trim()||!p.story?.trim()||!p.image_url))throw Error('Completa la fotografía, el material y la descripción antes de publicar.');const r=await api.from('productos').update({publicado:!!published}).eq('id',id).eq('owner_id',currentUser.id).select('id').single();fail(r.error);return r.data;}
async function setProductStock(id,stock){self();if(!['Disponible','Por pedido','Agotado'].includes(stock))throw Error('Disponibilidad inválida.');const r=await api.from('productos').update({stock}).eq('id',id).eq('owner_id',currentUser.id).select('id').single();fail(r.error);return r.data;}
async function duplicateProduct(id){const p=await ownedProduct(id);delete p.id;delete p.created_at;p.name=(p.name+' (copia)').slice(0,120);p.publicado=false;const r=await api.from('productos').insert(p).select('id').single();fail(r.error);return r.data.id;}
async function deleteProduct(id){self();const r=await api.from('productos').delete().eq('id',id).eq('owner_id',currentUser.id).select('id').single();fail(r.error);return r.data;}
async function sendReview(v){if(!enabled)return;let r=await api.from('valoraciones').insert({kind:v.kind,target:String(v.target),nombre:v.name,comentario:v.comment,estrellas:v.score,aprobada:false});fail(r.error);}
async function generateDescription(payload){self();let {data,error}=await api.functions.invoke('generar-descripcion',{body:payload});fail(error);if(data?.error)throw Error(data.error);if(!data?.text)throw Error('Sin respuesta de IA');return data.text;}
async function login(){if(!enabled)throw Error('Conecta Supabase antes de acceder con Google.');const url=new URL('acceso.html',location.href).href;let {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:url}});fail(error);}
function requireApi(){if(!api)throw Error('El acceso todavía no está configurado. Contacta a khipuFibra.');}
async function authSettings(){if(!enabled)return null;try{const r=await fetch(new URL('/auth/v1/settings',cfg.supabaseUrl),{headers:{apikey:cfg.supabasePublishableKey}});if(!r.ok)return null;const settings=await r.json();return {google:settings.external?.google===true,email:settings.external?.email===true};}catch{return null;}}
async function loginWithPassword(email,password){requireApi();const r=await api.auth.signInWithPassword({email:email.trim(),password});fail(r.error);return r.data;}
async function requestAccount(email,password,name){requireApi();const r=await api.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:new URL('acceso.html',location.href).href,data:{full_name:name.trim()}}});fail(r.error);return r.data;}
async function recoverPassword(email){requireApi();const r=await api.auth.resetPasswordForEmail(email.trim(),{redirectTo:new URL('restablecer.html',location.href).href});fail(r.error);}
async function updatePassword(password,{currentPassword,nonce}={}){requireApi();if(typeof password!=='string'||password.length<12)throw Error('Usa una contraseña de al menos 12 caracteres.');const fields={password};if(currentPassword)fields.currentPassword=currentPassword;if(nonce)fields.nonce=nonce;const r=await api.auth.updateUser(fields);fail(r.error);}
async function reauthenticate(){requireApi();const r=await api.auth.reauthenticate();fail(r.error);}
async function accountSecurity(){requireApi();const r=await api.auth.getUser();fail(r.error);if(!r.data?.user)throw Error('Tu sesión venció. Vuelve a entrar.');const user=r.data.user;return {userId:user.id,email:user.email||'',passwordIdentity:(user.identities||[]).some(identity=>identity.provider==='email'),googleIdentity:(user.identities||[]).some(identity=>identity.provider==='google')};}
async function logout(){requireApi();const {error}=await api.auth.signOut();fail(error);currentUser=null;approved=false;membership=null;clearPrivate();}
async function adminData(){requireApi();const r=await api.rpc('khipu_admin_dashboard');fail(r.error);return r.data;}
async function manageMember(userId,action){requireApi();const r=await api.rpc('khipu_manage_member',{target_user:userId,action});fail(r.error);return r.data;}
async function inviteArtisan(email){requireApi();const r=await api.functions.invoke('admin-invite',{body:{email:email.trim()}});if(r.error){let detail;try{detail=await r.error.context?.json();}catch{}throw Error(detail?.error||'No se pudo enviar la invitación. Revisa tu conexión o vuelve a entrar a tu cuenta.');}if(r.data?.error)throw Error(r.data.error);return r.data;}
async function revokeInvitation(invitationId){requireApi();const r=await api.rpc('khipu_revoke_invitation',{invitation_id:invitationId});fail(r.error);}
window.khipuCloud={enabled,authLinkError,init,list,myProfile,myProducts,saveProfile,uploadAvatar,saveProduct,setProductPublished,setProductStock,duplicateProduct,deleteProduct,sendReview,generateDescription,login,loginWithPassword,requestAccount,recoverPassword,updatePassword,reauthenticate,accountSecurity,authSettings,logout,clearPrivate,adminData,manageMember,inviteArtisan,revokeInvitation,get galleryEnabled(){return gallerySupport===true},get approved(){return approved},get membership(){return membership},get user(){return currentUser},get client(){return api}};
})();
