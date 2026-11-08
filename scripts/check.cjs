const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
let failed=false;
for(const file of fs.readdirSync('assets').filter(file=>file.endsWith('.js'))){
 const result=spawnSync(process.execPath,['--check',path.join('assets',file)],{encoding:'utf8'});
 if(result.status){failed=true;console.error(result.stderr);}
}
for(const file of fs.readdirSync('.').filter(file=>file.endsWith('.html'))){
 const html=fs.readFileSync(file,'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)){
  if(/^[a-z]+:|^\/\//i.test(match[1]))continue;
  if(!fs.existsSync(path.resolve(path.dirname(file),match[1]))){failed=true;console.error(`${file}: missing ${match[1]}`);}
 }
 if(html.includes('\ufffd')){failed=true;console.error(`${file}: invalid UTF-8 replacement character`);}
}
if(failed)process.exitCode=1;else console.log('JavaScript syntax and HTML local references: OK');
