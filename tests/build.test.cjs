const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
test('frontend build excludes internals and refuses private API credentials',t=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'khipufibra-build-'));
 // Cleanup is limited to the exact disposable directory created above.
 t.after(()=>{if(path.dirname(temporary)!==os.tmpdir()||!path.basename(temporary).startsWith('khipufibra-build-'))throw Error('Unexpected cleanup path');fs.rmSync(temporary,{recursive:true,force:true});});
 fs.mkdirSync(path.join(temporary,'scripts'));fs.mkdirSync(path.join(temporary,'assets'));
 fs.copyFileSync(path.join(__dirname,'../scripts/build.cjs'),path.join(temporary,'scripts/build.cjs'));
 fs.writeFileSync(path.join(temporary,'index.html'),'<h1>khipuFibra</h1>');
 fs.writeFileSync(path.join(temporary,'assets/supabase-config.js'),"window.KHIPU_CONFIG={supabaseUrl:'',supabasePublishableKey:''};");
 fs.writeFileSync(path.join(temporary,'private.sql'),'never publish');
 const build=key=>spawnSync(process.execPath,[path.join(temporary,'scripts/build.cjs')],{encoding:'utf8',env:{...process.env,SUPABASE_URL:'https://project.example',SUPABASE_PUBLISHABLE_KEY:key}});
 const good=build('sb_publishable_public_example');assert.equal(good.status,0,good.stderr);
 assert.deepEqual(fs.readdirSync(path.join(temporary,'dist')).sort(),['assets','index.html']);
 for(const key of ['sb_secret_do_not_publish','eyJ.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature']){
  const refused=build(key);assert.notEqual(refused.status,0);assert.equal(refused.stderr.includes(key),false);
 }
});
