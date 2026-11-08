const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const relative=requested==='/'?'index.html':requested.slice(1);
  // Preview only serves frontend assets; never Git, SQL, env, tests or dependencies.
  if(!/^(?:[a-z-]+\.html|assets\/[a-z0-9-]+\.(?:css|js|png|svg)|assets\/(?:motion|moments|img)\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:css|js|png|svg|jpg|jpeg|webp|avif))$/.test(relative)){res.writeHead(404);res.end('Not found');return;}
  const file=path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://localhost:4173/'));
