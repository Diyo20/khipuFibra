const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const destination=path.join(root,'dist');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/supabase-config.js'),'utf8'),sandbox,{timeout:1000});
const local=sandbox.window.KHIPU_CONFIG||{};
const envURL=process.env.SUPABASE_URL||'';
const envKey=process.env.SUPABASE_PUBLISHABLE_KEY||'';
if(Boolean(envURL)!==Boolean(envKey))throw Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
const config={supabaseUrl:envURL||local.supabaseUrl||'',supabasePublishableKey:envKey||local.supabasePublishableKey||''};
if(Boolean(config.supabaseUrl)!==Boolean(config.supabasePublishableKey))throw Error('Incomplete public Supabase configuration.');
if(config.supabaseUrl){
 const url=new URL(config.supabaseUrl);
 if((url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Use only a Supabase project origin.');
 const key=config.supabasePublishableKey;
 let allowed=key.startsWith('sb_publishable_');
 if(key.startsWith('eyJ')){try{allowed=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{allowed=false;}}
 if(!allowed)throw Error('Only a publishable or legacy anon key may be included in the frontend.');
}
fs.mkdirSync(destination,{recursive:true});
// Allowlist only. SQL, docs, tests, Git and server-side functions are never published.
for(const file of fs.readdirSync(root).filter(file=>file.endsWith('.html')))fs.copyFileSync(path.join(root,file),path.join(destination,file));
fs.mkdirSync(path.join(destination,'assets'),{recursive:true});
for(const file of fs.readdirSync(path.join(root,'assets')).filter(file=>/\.(?:js|css|png|svg)$/.test(file)))fs.copyFileSync(path.join(root,'assets',file),path.join(destination,'assets',file));
fs.writeFileSync(path.join(destination,'assets/supabase-config.js'),'// Public configuration generated for this deployment.\nwindow.KHIPU_CONFIG = '+JSON.stringify(config,null,2)+';\n');
console.log('Static frontend built in dist/. Supabase access: '+(config.supabaseUrl?'configured':'not configured'));
