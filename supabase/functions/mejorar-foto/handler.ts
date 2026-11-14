const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
async function limited(response:{body:ReadableStream<Uint8Array>|null},max:number){const reader=response.body?.getReader();if(!reader)throw Error('Empty');let bytes=0,body='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max){await reader.cancel();throw Error('Too large');}body+=decoder.decode(value,{stream:true});}return JSON.parse(body+decoder.decode());}
function imageData(value:unknown,max:number){if(typeof value!=='string'||value.length>max)return null;const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match)return null;let bytes:string;try{bytes=atob(match[2].slice(0,32));}catch{return null;}const valid=match[1]==='jpeg'?bytes.startsWith('\xff\xd8\xff'):match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';return valid?value:null;}
export const createHandler=(createClient:any,env:(name:string)=>string|undefined,fetcher:typeof fetch=fetch)=>async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return reply({error:'Método no permitido.'},405);
 let server:any,reservation:any;
 try{
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return reply({error:'Inicia sesión.'},401);
  if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'Envía una fotografía en JSON.'},415);
  const url=env('SUPABASE_URL')||'',api=createClient(url,env('SUPABASE_ANON_KEY')||env('SUPABASE_PUBLISHABLE_KEY'),{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const userResult=await api.auth.getUser(token),user=userResult.data?.user;if(userResult.error||!user)return reply({error:'Sesión inválida.'},401);
  const access=await api.rpc('khipu_request_access');if(access.error||access.data?.status!=='active'||!['artisan','admin'].includes(access.data?.role))return reply({error:'Cuenta no autorizada.'},403);
  let body:any;try{body=await limited(req,2200000);}catch{return reply({error:'Fotografía demasiado grande o solicitud inválida.'},400);}
  const source=imageData(body?.image,2100000),entity=body?.entity||null;if(!source)return reply({error:'Elige una fotografía JPG, PNG o WebP válida de hasta 1,5 MB.'},400);
  if(entity&&(typeof entity!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entity)))return reply({error:'Producto no válido.'},400);
  const key=env('POLLINATIONS_API_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY'),model=env('POLLINATIONS_IMAGE_MODEL')||'black-forest-labs/flux.2-klein-4b';
  if(!key?.startsWith('sk_')||!service)return reply({error:'Configura una clave secreta de Pollinations en Supabase.'},503);
  if(model!=='black-forest-labs/flux.2-klein-4b')return reply({error:'Este piloto solo admite FLUX.2 Klein 4B para controlar el coste.'},503);
  server=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const r=await server.rpc('khipu_ai_reserve',{p_user:user.id,p_tool:'generate_image',p_entity:entity});if(r.error)return reply({error:'Las cuotas de imágenes están pendientes de activación.'},503);
  reservation=r.data;if(!reservation?.allowed)return reply({error:reservation?.error||'Límite de intentos alcanzado.',quota:reservation?.quota},429);
  const prompt='Edit this exact product photograph for an honest ecommerce listing. Preserve the same handmade object, silhouette, proportions, colors, weave, embroidery, patterns and all visible details. Replace only the background with a clean white studio backdrop and improve exposure with soft natural light and a subtle contact shadow. Show the entire object. Do not add decorations, text, logos, accessories, extra products, missing parts or invented details. Do not redesign the craft. Return one photograph.';
  const [prefix,base64Source]=source.split(','),mime=prefix.slice(5,prefix.indexOf(';')),bytes=Uint8Array.from(atob(base64Source),c=>c.charCodeAt(0));
  const form=new FormData();form.append('image',new Blob([bytes],{type:mime}),'product.'+(mime==='image/jpeg'?'jpg':mime.split('/')[1]));
  for(const [name,value] of Object.entries({model,prompt,n:'1',size:'1024x1024',response_format:'b64_json'}))form.append(name,value);
  const upstream=await fetcher('https://gen.pollinations.ai/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(90000),body:form});
  let answer:any;try{answer=await limited(upstream,12000000);}catch{answer=null;}
  const base64=answer?.data?.[0]?.b64_json;let image:string|null=null;
  if(upstream.ok&&typeof base64==='string'){for(const mime of ['png','jpeg','webp']){image=imageData('data:image/'+mime+';base64,'+base64,11500000);if(image)break;}}
  await server.rpc('khipu_ai_finish',{p_request:reservation.requestId,p_success:!!image});
  if(!image){const messages:any={401:'Pollinations rechazó la clave. Revisa POLLINATIONS_API_KEY.',403:'La clave no tiene permiso para editar con este modelo.',402:'No hay Pollen o presupuesto disponible. La foto original se conserva.',429:'Pollinations alcanzó su límite. Inténtalo más tarde.',404:'El modelo de edición no está disponible.'};return reply({error:messages[upstream.status]||'No se pudo obtener una foto válida. El intento quedó registrado y tu original se conserva.',quota:reservation.quota},upstream.status===429?429:502);}
  return reply({image,quota:reservation.quota});
 }catch{if(server&&reservation?.requestId)try{await server.rpc('khipu_ai_finish',{p_request:reservation.requestId,p_success:false});}catch{}return reply({error:'No se pudo completar la edición. Tu foto original se conserva.',quota:reservation?.quota},502);}
};
