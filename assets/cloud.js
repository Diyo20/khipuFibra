/* Integración con Supabase. Las cuentas no autorizadas nunca reciben acceso de escritura. */
(function(){'use strict';
const cfg=window.KHIPU_CONFIG||{};
const enabled=!!(cfg.supabaseUrl && cfg.supabasePublishableKey);
const api=enabled && window.supabase ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let currentUser=null,approved=false,membership=null;
let recovery= new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
if(api)api.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY')recovery=true;
 if(event==='SIGNED_OUT'){currentUser=null;approved=false;membership=null;clearPrivate();}
 // Do not call another Auth method inside this synchronous callback.
 setTimeout(()=>window.dispatchEvent(new CustomEvent('khipu:auth-change',{detail:{event,userId:session?.user?.id||null}})),0);
});
function clearPrivate(){
 try{
  for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('khipuFibra_private_'))sessionStorage.removeItem(key);}
  const previous=JSON.parse(localStorage.getItem('khipuFibra_v2')||'{}');
  localStorage.setItem('khipuFibra_v2',JSON.stringify({favorites:Array.isArray(previous.favorites)?previous.favorites:[]}));
  localStorage.removeItem('quipufibra_mockup_v1');
 }catch{/* Storage may be unavailable; never prevent Auth from signing out. */}
}
const fail=e=>{if(e)throw Error(e.message||String(e));};
const profileShape=(p)=>({name:p.name,city:p.city||'',specialty:p.specialty||'',bio:p.bio||'',story:p.story||'',experience:p.experience||'',fair:p.fair||'',facebook:p.facebook||'',instagram:p.instagram||'',tiktok:p.tiktok||'',youtube:p.youtube||'',video:p.video||'',whatsapp:p.whatsapp||'',avatar:p.avatar_url||'🧶',owner_id:p.user_id});
const mapProduct=(p)=>({id:p.id,name:p.name,category:p.category,material:p.material,price:p.price??'Consultar',img:p.image_url||'assets/bolso.svg',story:p.story||'',dimensions:p.dimensions||'',care:p.care||'',stock:p.stock||'',artisan:p.artesanas_perfiles?.name||'Artesana',owner_id:p.owner_id,collection:p.collection||'',time:'Consultar'});
const self=()=>{if(!approved||!currentUser)throw Error('No tienes autorización para gestionar artesanías.');};
async function init(){if(!enabled)return {enabled:false};if(!api)throw Error('No se pudo cargar Supabase. Revisa la conexión a Internet.');
 const {data,error}=await api.auth.getUser();if(error && !/session missing/i.test(error.message||''))console.warn('Sesión:',error.message);
 currentUser=data?.user||null;approved=false;
 membership=null;
 if(currentUser){const r=await api.rpc('khipu_request_access');fail(r.error);membership=r.data;approved=membership?.role==='artisan'&&membership?.status==='active';}
 return {enabled:true,approved,user:currentUser,membership,recovery};}
async function list(){if(!enabled)return {profiles:[],products:[],reviews:[]};
 let [catalog,r]=await Promise.all([
  api.rpc('khipu_public_catalog'),
  api.from('valoraciones').select('*').eq('aprobada',true).order('created_at',{ascending:false})]);
 fail(catalog.error);fail(r.error);
 return {profiles:(catalog.data?.profiles||[]).map(profileShape),products:(catalog.data?.products||[]).map(mapProduct),reviews:(r.data||[]).map(v=>({kind:v.kind,target:v.target,name:v.nombre,comment:v.comentario,score:v.estrellas,date:new Date(v.created_at).toLocaleDateString('es-PE')}))};}
async function myProfile(){self();let {data,error}=await api.from('artesanas_perfiles').select('*').eq('user_id',currentUser.id).maybeSingle();fail(error);return data?profileShape(data):null;}
async function saveProfile(a){self();let data={user_id:currentUser.id,name:a.name.trim(),city:a.city||'',specialty:a.specialty||'',bio:a.bio||'',story:a.story||'',experience:a.experience||'',fair:a.fair||'',facebook:a.facebook||'',instagram:a.instagram||'',tiktok:a.tiktok||'',youtube:a.youtube||'',video:a.video||'',whatsapp:a.whatsapp||'',avatar_url:/^https:\/\//.test(a.avatar||'')?a.avatar:'',visible:true};let r=await api.from('artesanas_perfiles').upsert(data,{onConflict:'user_id'}).select('id').single();fail(r.error);return r.data;}
async function uploadPhoto(img){self();if(!/^data:image\/(png|jpeg|webp);base64,/i.test(img||''))throw Error('Para publicar un producto real, sube una fotografía PNG, JPG o WebP desde tu dispositivo.');const blob=await (await fetch(img)).blob();if(blob.size>5*1024*1024)throw Error('La fotografía supera 5 MB. Intenta otra más pequeña.');const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';const path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;let r=await api.storage.from('productos').upload(path,blob,{contentType:blob.type,upsert:false});fail(r.error);return api.storage.from('productos').getPublicUrl(path).data.publicUrl;}
async function uploadAvatar(file){self();if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Selecciona PNG, JPG o WebP.');if(file.size>3*1024*1024)throw Error('Foto de perfil demasiado grande (máximo 3 MB).');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';let path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;let r=await api.storage.from('perfiles').upload(path,file,{contentType:file.type,upsert:false});fail(r.error);return api.storage.from('perfiles').getPublicUrl(path).data.publicUrl;}
async function saveProduct(p){self();let check=await api.from('artesanas_perfiles').select('id').eq('user_id',currentUser.id).maybeSingle();fail(check.error);if(!check.data)throw Error('Primero completa y guarda tu perfil de artesana.');let image=await uploadPhoto(p.img);let data={owner_id:currentUser.id,artisan_id:check.data.id,name:p.name,category:p.category,material:p.material,price:Number(p.price)||null,dimensions:p.dimensions||'',care:p.care||'',story:p.story||'',stock:p.stock||'Disponible',collection:p.collection||'',image_url:image,publicado:true};let r=await api.from('productos').insert(data).select('id').single();fail(r.error);return r.data.id;}
async function sendReview(v){if(!enabled)return;let r=await api.from('valoraciones').insert({kind:v.kind,target:String(v.target),nombre:v.name,comentario:v.comment,estrellas:v.score,aprobada:false});fail(r.error);}
async function generateDescription(payload){self();let {data,error}=await api.functions.invoke('generar-descripcion',{body:payload});fail(error);if(data?.error)throw Error(data.error);if(!data?.text)throw Error('Sin respuesta de IA');return data.text;}
async function login(){if(!enabled)throw Error('Conecta Supabase antes de acceder con Google.');const url=new URL('acceso.html',location.href).href;let {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:url}});fail(error);}
function requireApi(){if(!api)throw Error('El acceso todavía no está configurado. Contacta a khipuFibra.');}
async function authSettings(){if(!enabled)return null;try{const r=await fetch(new URL('/auth/v1/settings',cfg.supabaseUrl),{headers:{apikey:cfg.supabasePublishableKey}});if(!r.ok)return null;const settings=await r.json();return {google:settings.external?.google===true,email:settings.external?.email===true};}catch{return null;}}
async function loginWithPassword(email,password){requireApi();const r=await api.auth.signInWithPassword({email:email.trim(),password});fail(r.error);return r.data;}
async function requestAccount(email,password,name){requireApi();const r=await api.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:new URL('acceso.html',location.href).href,data:{full_name:name.trim()}}});fail(r.error);return r.data;}
async function recoverPassword(email){requireApi();const r=await api.auth.resetPasswordForEmail(email.trim(),{redirectTo:new URL('restablecer.html',location.href).href});fail(r.error);}
async function updatePassword(password){requireApi();const r=await api.auth.updateUser({password});fail(r.error);}
async function logout(){requireApi();const {error}=await api.auth.signOut();fail(error);currentUser=null;approved=false;membership=null;clearPrivate();}
async function adminData(){requireApi();const r=await api.rpc('khipu_admin_dashboard');fail(r.error);return r.data;}
async function manageMember(userId,action){requireApi();const r=await api.rpc('khipu_manage_member',{target_user:userId,action});fail(r.error);return r.data;}
async function inviteArtisan(email){requireApi();const r=await api.functions.invoke('admin-invite',{body:{email:email.trim()}});if(r.error){let detail;try{detail=await r.error.context?.json();}catch{}throw Error(detail?.error||'No se pudo enviar la invitación. Revisa tu conexión o vuelve a entrar a tu cuenta.');}if(r.data?.error)throw Error(r.data.error);return r.data;}
async function revokeInvitation(invitationId){requireApi();const r=await api.rpc('khipu_revoke_invitation',{invitation_id:invitationId});fail(r.error);}
window.khipuCloud={enabled,init,list,myProfile,saveProfile,uploadAvatar,saveProduct,sendReview,generateDescription,login,loginWithPassword,requestAccount,recoverPassword,updatePassword,authSettings,logout,clearPrivate,adminData,manageMember,inviteArtisan,revokeInvitation,get approved(){return approved},get membership(){return membership},get user(){return currentUser},get client(){return api}};
})();
