import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

// Never accept a redirect destination from the browser; configure it per environment.
// Non-secret defaults for this approved pilot. Other projects must set an override.
const pilotProjectUrl='https://yaksomcgqtnmsczvvyzs.supabase.co';
const pilotInviteRedirect='https://khipufibra-git-develop-khipufibra-fase-1-khipu-fibra.vercel.app/restablecer.html';
const cors = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
 status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
});

Deno.serve(async req => {
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return response({error:'Método no permitido.'},405);
 try {
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const redirect=Deno.env.get('KHIPU_INVITE_REDIRECT_URL')||(url===pilotProjectUrl?pilotInviteRedirect:'');
  if(!url||!key||!serviceKey||!redirect)return response({error:'Las invitaciones todavía no están configuradas.'},503);
  const destination=new URL(redirect);
  if(destination.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(destination.hostname))return response({error:'Revisa la configuración de invitaciones.'},503);
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return response({error:'Inicia sesión.'},401);
  const caller=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await caller.auth.getUser(token);
  if(error||!user)return response({error:'La sesión venció. Vuelve a entrar.'},401);
  const {data:isAdmin,error:roleError}=await caller.rpc('khipu_is_admin');
  if(roleError||isAdmin!==true)return response({error:'Acceso exclusivo de administración.'},403);
  // Stream with a bound; a missing/forged Content-Length cannot bypass it.
  if(Number(req.headers.get('Content-Length'))>2048)return response({error:'Solicitud demasiado grande.'},413);
  const reader=req.body?.getReader();
  if(!reader)return response({error:'Completa el correo.'},400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2048){await reader.cancel();return response({error:'Solicitud demasiado grande.'},413);}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return response({error:'Solicitud no válida.'},400);}
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response({error:'Revisa el correo de la artesana.'},400);
  const prepared=await caller.rpc('khipu_prepare_invitation',{invite_email:email});
  if(prepared.error)return response({error:prepared.error.message},400);
  const server=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const sent=await server.auth.admin.inviteUserByEmail(email,{redirectTo:redirect});
  const logged=await server.rpc('khipu_invitation_delivery',{invitation_id:prepared.data.id,succeeded:!sent.error});
  if(logged.error)return response({error:'No pudimos registrar el resultado. Actualiza la lista antes de volver a enviar.'},500);
  if(sent.error)return response({delivered:false,message:'La invitación quedó autorizada, pero no pudimos enviar el correo. Si la cuenta ya existe, la artesana puede entrar con Google o su contraseña. Revisa también el servicio de correo; puedes revocar la invitación desde este panel.'});
  return response({delivered:true,message:'Invitación enviada. La artesana debe abrir el enlace de su correo y elegir una contraseña.'});
 } catch {
  // No tokens, credentials or provider responses in public logs.
  return response({error:'No se pudo procesar la invitación. Actualiza la lista antes de intentarlo otra vez.'},500);
 }
});
