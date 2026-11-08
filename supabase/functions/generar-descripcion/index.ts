// Edge Function de khipuFibra. Requiere secreto OPENAI_API_KEY en Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const result=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return result({error:'Método no permitido'},405);
 try{
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return result({error:'Inicia sesión como artesana.'},401);
  const url=Deno.env.get('SUPABASE_URL')||'';
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'';
  const api=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:uerror}=await api.auth.getUser(token);
  if(uerror||!user)return result({error:'Sesión inválida.'},401);
  const {data:approved,error:aerror}=await api.rpc('soy_artesana_autorizada');
  if(aerror||approved!==true)return result({error:'Cuenta no autorizada.'},403);
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)return result({error:'La generación de IA todavía no está configurada.'},503);
  const b=await req.json();
  const kind=b.kind==='producto'?'producto':'social';
  const product=b.product||{};
  const network=['facebook','instagram','tiktok','whatsapp'].includes(b.network)?b.network:'facebook';
  const style=['emocional','comercial','creativo'].includes(b.style)?b.style:'emocional';
  const facts={nombre:String(product.name||'').slice(0,120),material:String(product.material||'').slice(0,160),historia:String(product.story||'').slice(0,450),medidas:String(product.dimensions||'').slice(0,150),cuidados:String(product.care||'').slice(0,150)};
  if(!facts.nombre||!facts.material)return result({error:'Completa nombre y material del producto.'},400);
  const previous=String(b.previous||'').slice(0,1000);
  const instructions='Eres redactor de una plataforma de artesanía peruana. Responde SOLO con la descripción final en español natural. No inventes cultura, origen, autoría, técnicas, precios, propiedades, certificaciones ni materiales. No repitas frases ni afirmaciones sin respaldo. Sé claro, breve y atractivo. No menciones ser IA.';
  const request=`Tarea: ${kind==='producto'?'descripción de producto para catálogo':'copy para '+network}. Estilo: ${style}. Datos verificados: ${JSON.stringify(facts)}. ${previous?'Genera UNA variante claramente diferente de esta versión anterior: '+previous:''} ${kind==='social'?'Usa etiquetas relevantes con moderación. En Instagram y TikTok sugiere revisar el enlace del perfil, no inventes enlace clicable de un pie de foto.':'Explica el producto de forma informativa y cercana.'}`;
  const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',instructions,input:request,max_output_tokens:380})});
  const answer=await upstream.json();
  if(!upstream.ok)return result({error:'La IA no pudo generar el texto. Reintenta luego.'},502);
  const output=(answer.output||[]).flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text||'').join('\n').trim();
  if(!output)return result({error:'El modelo no devolvió una descripción.'},502);
  return result({text:output});
 }catch(e){console.error(e);return result({error:'No se pudo procesar la solicitud.'},500)}
});
