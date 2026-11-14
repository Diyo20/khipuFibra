const {test}=require('node:test'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module'),fs=require('fs'),path=require('path'),vm=require('vm');
function setup({valid=true,active=true,key=true,allowed=true,missingQuota=false,upstream=200,incomplete=false,failFetch=false,blocked=false,empty=false,long=false,model,thought=false}={}){
 const calls=[],requests=[];let handler;
 const quota={plan:'basic',used:1,limit:2,remaining:1,monthlyUsed:1,monthlyLimit:20};
 const caller={auth:{getUser:async()=>({data:{user:valid?{id:'verified-user'}:null},error:null})},rpc:async()=>({data:{role:'artisan',status:active?'active':'suspended'},error:null})};
 const server={rpc:async(name,args)=>{calls.push([name,args]);return name==='khipu_ai_reserve'?{data:{allowed,requestId:'reservation',quota},error:missingQuota?{message:'Missing RPC'}:null}:{error:null};}};
 const createClient=(_url,key)=>key==='server-key'?server:caller;
 const env={SUPABASE_URL:'https://project.example',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-key',GEMINI_API_KEY:key?'private-gemini-key':undefined,GEMINI_TEXT_MODEL:model,OPENAI_API_KEY:'unused-openai-key'};
 const fetcher=async(url,options)=>{requests.push([url,JSON.parse(options.body),options.headers]);if(failFetch)throw Error('provider outage');return new Response(JSON.stringify({promptFeedback:blocked?{blockReason:'SAFETY'}:undefined,candidates:empty?[]:[{finishReason:incomplete?'MAX_TOKENS':'STOP',content:{parts:[...(thought?[{thought:true,text:'Pensamiento privado'}]:[]),{text:long?'x'.repeat(5001):'Texto corregido.'}]}}],usageMetadata:{promptTokenCount:15,candidatesTokenCount:10},error:upstream!==200?{message:'private-gemini-key provider details'}:undefined}),{status:upstream});};
 const code=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/generar-descripcion/handler.ts'),'utf8').replace('export const createHandler','const createHandler'))+'\nexpose(createHandler);';
 vm.runInNewContext(code,{Response,TextDecoder,AbortSignal,fetch:fetcher,expose:fn=>handler=fn(createClient,name=>env[name],fetcher)});
 const request=(payload={kind:'mejora',field:'profile_bio',source:'mi historia original',userId:'forged-user'},token='valid',type='application/json')=>new Request('https://edge.example/generar-descripcion',{method:'POST',headers:{'Content-Type':type,...(token?{Authorization:'Bearer '+token}:{})},body:typeof payload==='string'?payload:JSON.stringify(payload)});
 return {handler,request,calls,requests};
}
test('text endpoint rejects missing/invalid sessions, suspended accounts, audio and oversized input without provider calls',async()=>{
 for(const options of [{valid:false},{active:false}]){const app=setup(options);assert.ok([401,403].includes((await app.handler(app.request())).status));assert.equal(app.requests.length,0);}
 const app=setup();assert.equal((await app.handler(app.request({},''))).status,401);assert.equal((await app.handler(app.request('audio','valid','audio/webm'))).status,415);
 assert.equal((await app.handler(app.request('x'.repeat(25000)))).status,413);assert.equal((await app.handler(app.request('{bad'))).status,400);assert.equal(app.calls.length,0);
});
test('the verified user reserves one attempt before text-only generation and responses disclose no keys',async()=>{
 const app=setup(),response=await app.handler(app.request()),body=await response.json();assert.equal(response.status,200);assert.equal(body.text,'Texto corregido.');
 assert.equal(app.calls[0][0],'khipu_ai_reserve');assert.equal(app.calls[0][1].p_user,'verified-user');assert.equal(app.calls[0][1].p_tool,'profile_bio');assert.equal(app.requests.length,1);
 assert.equal(JSON.parse(app.requests[0][1].contents[0].parts[0].text).original,'mi historia original');
 assert.equal(app.requests[0][0],'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(app.requests[0][2]['x-goog-api-key'],'private-gemini-key');assert.equal(app.requests[0][0].includes('private-gemini-key'),false);
 assert.ok(app.requests[0][1].systemInstruction.parts[0].text.includes('No inventes'));assert.equal(app.requests[0][1].generationConfig.maxOutputTokens,1600);
 assert.equal(app.calls[1][0],'khipu_ai_finish');assert.equal(app.calls[1][1].p_success,true);assert.equal(app.calls[1][1].p_input,15);assert.equal(app.calls[1][1].p_output,10);assert.equal(JSON.stringify(body).includes('private-gemini-key'),false);
});
test('missing configuration or quota failures stop before a paid call; exhaustion returns authoritative counters',async()=>{
 for(const options of [{key:false},{allowed:false},{missingQuota:true}]){const app=setup(options);const response=await app.handler(app.request());assert.ok([429,503].includes(response.status));assert.equal(app.requests.length,0);}
});
test('upstream errors, timeouts and incomplete results remain counted and never return a proposal',async()=>{
 for(const options of [{upstream:500},{incomplete:true},{failFetch:true},{blocked:true},{empty:true},{long:true}]){const app=setup(options);const response=await app.handler(app.request());const body=await response.json();assert.equal(response.status,502);assert.equal(body.text,undefined);assert.ok(body.quota);assert.equal(app.calls.at(-1)[0],'khipu_ai_finish');assert.equal(app.calls.at(-1)[1].p_success,false);}
});

test('Gemini configuration and quota errors are actionable, counted once, redacted and never retried with OpenAI',async()=>{
 for(const [upstream,expected] of [[400,503],[401,503],[403,503],[404,503],[429,429]]){const app=setup({upstream}),response=await app.handler(app.request()),body=await response.json();assert.equal(response.status,expected);assert.equal(body.text,undefined);assert.ok(body.quota);assert.equal(JSON.stringify(body).includes('private-gemini-key'),false);assert.equal(app.requests.length,1);assert.equal(app.calls.at(-1)[1].p_success,false);}
 const missing=setup({key:false});assert.equal((await missing.handler(missing.request())).status,503);assert.equal(missing.calls.length,0);assert.equal(missing.requests.length,0);
});

test('server model overrides stay on Google; invalid names stop before reserving; thought content is excluded',async()=>{
 const invalid=setup({model:'https://other.example'});assert.equal((await invalid.handler(invalid.request())).status,503);assert.equal(invalid.calls.length,0);
 const app=setup({model:'gemini-test-model',thought:true}),body=await (await app.handler(app.request())).json();assert.equal(body.text,'Texto corregido.');assert.ok(app.requests[0][0].endsWith('/gemini-test-model:generateContent'));
});

test('product and social generation preserve product facts and network through Gemini',async()=>{
 for(const kind of ['producto','social']){const app=setup(),response=await app.handler(app.request({kind,network:'instagram',product:{name:'Bolso',material:'algodón',story:'Tejido por mi abuela'},style:'comercial'}));assert.equal(response.status,200);const input=JSON.parse(app.requests[0][1].contents[0].parts[0].text);assert.equal(input.datos.nombre,'Bolso');assert.equal(input.datos.material,'algodón');assert.equal(input.datos.historia,'Tejido por mi abuela');assert.equal(app.calls[0][1].p_tool,kind==='producto'?'generate_product':'generate_social_instagram');}
});

test('commercial rewriting is scoped to descriptions and social posts while factual fields keep their purpose',async()=>{
 for(const field of ['product_story','social','product_care','review','moderation','profile_bio']){const app=setup();await app.handler(app.request({kind:'mejora',field,source:'Unos apuntes originales'}));const input=JSON.parse(app.requests[0][1].contents[0].parts[0].text);if(['product_story','social'].includes(field))assert.match(input.tarea,/ayudar a vender/);else assert.doesNotMatch(input.tarea,/ayudar a vender/);if(field==='product_care')assert.match(input.tarea,/sin inventar recomendaciones/);if(['review','moderation'].includes(field))assert.match(input.tarea,/No añadas frases de venta/);assert.equal(input.original,'Unos apuntes originales');}
});
