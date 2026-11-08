const {test}=require('node:test');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup({valid=true,admin=true,deliveryError=false,usePilotDefault=false,noRedirect=false}={}){
 let handler;const calls=[];
 const caller={auth:{getUser:async()=>({data:{user:valid?{id:'admin'}:null},error:null})},rpc:async(name,params)=>{calls.push([name,params]);return {data:name==='khipu_is_admin'?admin:{id:'invitation-id'},error:null};}};
 const server={auth:{admin:{inviteUserByEmail:async(email,options)=>{calls.push(['email',email,options]);return {error:deliveryError?{message:'provider failure'}:null};}}},rpc:async(name,params)=>{calls.push([name,params]);return {error:null};}};
 const createClient=(_url,key)=>key==='service-secret'?server:caller;
 const env={SUPABASE_URL:'https://project.example',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'service-secret',KHIPU_INVITE_REDIRECT_URL:'https://preview.example/restablecer.html'};
 if(usePilotDefault){env.SUPABASE_URL='https://yaksomcgqtnmsczvvyzs.supabase.co';delete env.KHIPU_INVITE_REDIRECT_URL;}
 if(noRedirect)delete env.KHIPU_INVITE_REDIRECT_URL;
 const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/admin-invite/index.ts'),'utf8').replace(/^import[^\n]+\n/,'');
 vm.runInNewContext(stripTypeScriptTypes(source),{createClient,Deno:{env:{get:name=>env[name]},serve:fn=>{handler=fn;}},Response,URL,TextDecoder,Uint8Array});
 const request=(body='{"email":"ana@example.test"}',token='valid-token')=>new Request('https://edge.example/admin-invite',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body});
 return {handler,request,calls};
}
test('invite endpoint rejects missing JWT, invalid sessions and non-admin accounts',async()=>{
 for(const options of [{valid:false},{admin:false}]){const {handler,request,calls}=setup(options);const result=await handler(request());assert.ok([401,403].includes(result.status));assert.equal(calls.some(call=>call[0]==='email'),false);}
 const {handler,request}=setup();assert.equal((await handler(request('{}',''))).status,401);
});
test('invite endpoint bounds input and never accepts a browser-provided redirect',async()=>{
 const {handler,request,calls}=setup();assert.equal((await handler(request('x'.repeat(3000)))).status,413);
 assert.equal((await handler(request('{bad json'))).status,400);
 const result=await handler(request(JSON.stringify({email:'ana@example.test',redirectTo:'https://attacker.example'})));assert.equal(result.status,200);
 assert.equal(calls.find(call=>call[0]==='email')[2].redirectTo,'https://preview.example/restablecer.html');
});
test('provider failure is recorded and never reported as an email sent',async()=>{
 const {handler,request,calls}=setup({deliveryError:true});const result=await handler(request());const body=await result.json();assert.equal(body.delivered,false);assert.match(body.message,/no pudimos enviar/);assert.equal(calls.find(call=>call[0]==='khipu_invitation_delivery')[1].succeeded,false);assert.equal(JSON.stringify(body).includes('service-secret'),false);
});
test('successful invitations record delivery and return no credentials',async()=>{
 const {handler,request,calls}=setup();const body=await (await handler(request())).json();assert.equal(body.delivered,true);assert.equal(calls.find(call=>call[0]==='khipu_invitation_delivery')[1].succeeded,true);assert.equal(JSON.stringify(body).includes('valid-token'),false);
});
test('pilot default redirect is fixed and never applies to another project',async()=>{
 const pilot=setup({usePilotDefault:true});assert.equal((await pilot.handler(pilot.request())).status,200);
 assert.equal(pilot.calls.find(call=>call[0]==='email')[2].redirectTo,'https://khipufibra-git-develop-khipufibra-fase-1-khipu-fibra.vercel.app/restablecer.html');
 const other=setup({noRedirect:true});assert.equal((await other.handler(other.request())).status,503);assert.equal(other.calls.some(call=>call[0]==='email'),false);
});
