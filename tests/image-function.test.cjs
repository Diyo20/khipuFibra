const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
const photo='data:image/jpeg;base64,/9j/2Q==';
function setup({valid=true,active=true,key='sk_test-private',allowed=true,quotaError=false,status=200,bad=false,timeout=false}={}){
 const calls=[],requests=[];let handler;
 const caller={auth:{getUser:async()=>({data:{user:valid?{id:'verified'}:null}})},rpc:async()=>({data:{role:'artisan',status:active?'active':'suspended'}})};
 const server={rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='khipu_ai_reserve'?{allowed,requestId:'r',quota:{remaining:1}}:null,error:quotaError?{}:null};}};
 const env={SUPABASE_URL:'https://project.example',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server',POLLINATIONS_API_KEY:key};
 const fetcher=async(url,options)=>{requests.push([url,options]);if(timeout)throw Error('Timeout');return new Response(JSON.stringify({data:[{b64_json:bad?'not-an-image':photo.split(',')[1]}],error:{message:key}}),{status});};
 const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/mejorar-foto/handler.ts','utf8').replace('export const createHandler','const createHandler'))+';expose(createHandler);';
 vm.runInNewContext(code,{Response,TextDecoder,AbortSignal,atob,FormData,Blob,fetch:fetcher,expose:fn=>handler=fn((u,k)=>k==='server'?server:caller,n=>env[n],fetcher)});
 return {handler,calls,requests,request:(body={image:photo},token='session')=>new Request('https://edge.example',{method:'POST',headers:{Authorization:token?'Bearer '+token:'','Content-Type':'application/json'},body:JSON.stringify(body)})};
}
test('image editing authenticates and fails closed before provider calls on invalid accounts, photos or quotas',async()=>{
 for(const options of [{valid:false},{active:false},{key:'pk_wrong'},{allowed:false},{quotaError:true}]){const app=setup(options);assert.ok((await app.handler(app.request())).status>=400);assert.equal(app.requests.length,0);}
 const app=setup();for(const image of ['https://evil.example/photo.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,bm90LWEtcG5n'])assert.equal((await app.handler(app.request({image}))).status,400);
 assert.equal((await app.handler(app.request({},''))).status,401);assert.equal(app.calls.length,0);
});
test('image edits send the actual source to one fixed model with server-only bearer credentials and atomic quota',async()=>{
 const app=setup(),response=await app.handler(app.request({image:photo,userId:'forged'})),body=await response.json();assert.equal(response.status,200);assert.equal(body.image,photo);assert.equal(app.calls[0][1].p_user,'verified');assert.equal(app.calls[0][1].p_tool,'generate_image');assert.equal(app.calls[1][1].p_success,true);
 const [url,options]=app.requests[0],payload=options.body;assert.equal(url,'https://gen.pollinations.ai/v1/images/edits');assert.equal(options.headers.Authorization,'Bearer sk_test-private');assert.equal(Buffer.from(await payload.get('image').arrayBuffer()).toString('base64'),photo.split(',')[1]);assert.equal(payload.get('model'),'black-forest-labs/flux.2-klein-4b');assert.equal(payload.get('n'),'1');assert.equal(payload.get('response_format'),'b64_json');assert.equal(JSON.stringify(body).includes('sk_test-private'),false);
});
test('provider exhaustion, invalid images and timeout preserve originals, count failure and never fall back',async()=>{
 for(const options of [{status:402},{status:401},{status:429},{status:500},{bad:true},{timeout:true}]){const app=setup(options),response=await app.handler(app.request()),body=await response.json();assert.ok(response.status>=400);assert.equal(body.image,undefined);assert.equal(JSON.stringify(body).includes('sk_test-private'),false);assert.equal(app.requests.length,1);assert.equal(app.calls.at(-1)[1].p_success,false);}
});
