const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs'),path=require('path');
async function setup(){
 const calls=[],api={auth:{onAuthStateChange(){},getUser:async()=>({data:{user:{id:'a'}},error:null})},rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='khipu_request_access'?{role:'artisan',status:'active'}:{id:'request'},error:null};},storage:{from:bucket=>({upload:async(name,file,options)=>{calls.push(['upload',bucket,name,options]);return {error:null};},createSignedUrl:async(name,seconds,options)=>{calls.push(['signed',bucket,name,seconds,options]);return {data:{signedUrl:'https://storage.example/private-download'},error:null};},getPublicUrl:()=>{throw Error('Proofs must not become public');}})}};
 const window={KHIPU_CONFIG:{supabaseUrl:'https://project.example',supabasePublishableKey:'public'},supabase:{createClient:()=>api}};
 const storage={getItem:()=>null,setItem(){},removeItem(){},length:0};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/cloud.js'),'utf8'),{window,location:{hash:'',search:''},URLSearchParams,crypto:require('node:crypto').webcrypto,localStorage:storage,sessionStorage:storage,setTimeout});
 await window.khipuCloud.init();return {cloud:window.khipuCloud,calls};
}
test('receipts upload privately to the owner folder and download links expire without public URLs',async()=>{
 const {cloud,calls}=await setup();const saved=await cloud.planUpload({type:'image/png',size:100});assert.match(saved,/^a\/.+\.png$/);assert.equal(calls.find(c=>c[0]==='upload')[1],'plan-proofs');
 await cloud.planProof(saved);const signed=calls.find(c=>c[0]==='signed');assert.equal(signed[3],300);assert.equal(signed[4].download,true);
 await cloud.planSubmit('real reference',saved,19);const request=calls.find(c=>c[0]==='khipu_plan_submit');assert.equal(request[1].p_proof,saved);assert.equal(request[1].p_user,undefined);
});
test('invalid receipt files and artisan QR configuration are rejected before upload',async()=>{
 const {cloud,calls}=await setup();await assert.rejects(cloud.planUpload({type:'image/svg+xml',size:100}),/PNG/);await assert.rejects(cloud.planUpload({type:'image/png',size:6*1024*1024}),/5 MB/);await assert.rejects(cloud.planUpload({type:'image/png',size:100},'qr'),/Administración/);assert.equal(calls.some(c=>c[0]==='upload'),false);
});
