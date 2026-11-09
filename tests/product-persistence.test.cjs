const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const plain=value=>JSON.parse(JSON.stringify(value));
async function setup(){
 const rows=[],calls=[],uploads=[];let rejected=false,failUpload=0;
 const profile={id:'profile-a',user_id:'a',name:'Ana'};
 function from(table){
  let operation='read',payload,filters=[];
  const query={select(){return query;},eq(key,value){filters.push([key,value]);return query;},order(){return query;},limit(){return Promise.resolve({data:[],error:null});},insert(data){operation='insert';payload=plain(data);return query;},update(data){operation='update';payload=plain(data);return query;},delete(){operation='delete';return query;},
   async run(single){
    calls.push({table,operation,filters:plain(filters),payload});
    if(rejected&&operation!=='read')return {data:null,error:{message:'Network failure'}};
    if(table==='artesanas_perfiles')return {data:profile,error:null};
    let selected=rows.filter(p=>p.owner_id==='a'&&filters.every(([key,value])=>p[key]===value));
    if(operation==='insert'){selected=[{...payload,id:'p'+(rows.length+1)}];rows.push(selected[0]);}
    if(operation==='update')selected.forEach(p=>Object.assign(p,payload));
    if(operation==='delete')selected.forEach(p=>rows.splice(rows.indexOf(p),1));
    if(single&&!selected.length)return {data:null,error:{message:'No rows for this owner',code:'PGRST116'}};
    return {data:plain(single?selected[0]:selected),error:null};
   },single(){return query.run(true);},maybeSingle(){return query.run(true);},then(resolve,reject){return query.run(false).then(resolve,reject);}};return query;
 }
 const api={from,auth:{onAuthStateChange(){},getUser:async()=>({data:{user:{id:'a'}},error:null})},rpc:async()=>({data:{role:'artisan',status:'active'},error:null}),storage:{from:bucket=>({upload:async(name,blob)=>{uploads.push({bucket,name,size:blob.size});return {error:uploads.length===failUpload?{message:'Upload failed'}:null};},getPublicUrl:name=>({data:{publicUrl:'https://storage.example/'+bucket+'/'+name}})})}};
 const storage={getItem:()=>null,setItem(){},removeItem(){},length:0};const window={KHIPU_CONFIG:{supabaseUrl:'https://project.example',supabasePublishableKey:'public'},supabase:{createClient:()=>api}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/cloud.js'),'utf8'),{window,location:{hash:'',search:''},localStorage:storage,sessionStorage:storage,URLSearchParams,URL,crypto:require('node:crypto').webcrypto,fetch,console,setTimeout});
 const cloud=window.khipuCloud;await cloud.init();return {cloud,rows,calls,uploads,api,rejectWrites:()=>rejected=true,failUploadAt:index=>failUpload=index};
}
const photo='data:image/jpeg;base64,YWJj';
test('drafts persist all supported fields, blank prices stay null and repeated saves update the same row',async()=>{
 const {cloud,rows,uploads}=await setup();
 const saved=await cloud.saveProduct({name:'Bolso de prueba',material:'Algodón',price:'0',img:photo,story:'Historia escrita a mano',care:'Lavar a mano',dimensions:'30 cm',category:'Bolsos',stock:'Por pedido'},{published:false});
 assert.equal(rows.length,1);assert.equal(rows[0].publicado,false);assert.equal(rows[0].price,0);assert.equal(rows[0].story,'Historia escrita a mano');assert.equal(rows[0].care,'Lavar a mano');assert.equal(rows[0].dimensions,'30 cm');assert.equal(uploads.length,1);
 const reopened=(await cloud.myProducts())[0];assert.equal(reopened.id,saved.id);assert.equal(reopened.stock,'Por pedido');assert.equal(reopened.published,false);
 await cloud.saveProduct({...reopened,price:'',name:'Bolso editado'},{published:true});
 assert.equal(rows.length,1);assert.equal(rows[0].price,null);assert.equal(rows[0].publicado,true);assert.equal(rows[0].name,'Bolso editado');assert.equal(uploads.length,1);
});
test('management changes persist and duplication never publishes the copy',async()=>{
 const {cloud,rows}=await setup();const {id}=await cloud.saveProduct({name:'Producto',material:'Fibra',story:'Una historia',img:photo});
 await cloud.setProductPublished(id,false);assert.equal(rows[0].publicado,false);
 await cloud.setProductPublished(id,true);await cloud.setProductStock(id,'Agotado');assert.equal(rows[0].publicado,true);assert.equal(rows[0].stock,'Agotado');
 const copy=await cloud.duplicateProduct(id);assert.notEqual(copy,id);assert.equal(rows[1].publicado,false);assert.equal(rows[1].image_url,rows[0].image_url);
 await cloud.deleteProduct(copy);assert.equal(rows.length,1);
});
test('another owner cannot be selected, edited or deleted and arbitrary images are not adopted',async()=>{
 const {cloud,rows,calls}=await setup();rows.push({id:'other',owner_id:'b',image_url:'https://example.test/a.jpg'});
 await assert.rejects(cloud.saveProduct({id:'other',name:'Intrusion'},{published:false}),/owner/);
 await assert.rejects(cloud.setProductPublished('other',false),/owner/);
 await assert.rejects(cloud.deleteProduct('other'),/owner/);
 await assert.rejects(cloud.saveProduct({name:'Another image',img:'https://example.test/a.jpg'},{published:false}),/fotografía propia/);
 assert.equal(rows.length,1);assert.equal(rows[0].owner_id,'b');
 for(const call of calls.filter(c=>c.table==='productos'&&c.operation!=='insert'))assert.ok(call.filters.some(([key,value])=>key==='owner_id'&&value==='a'));
});
test('invalid and incomplete publications fail before insertion; remote errors never return success',async()=>{
 const {cloud,rows,rejectWrites}=await setup();
 await assert.rejects(cloud.saveProduct({name:'Pieza',price:-1},{published:false}),/precio válido/);
 await assert.rejects(cloud.saveProduct({name:'Pieza',price:'bad'},{published:false}),/precio válido/);
 await assert.rejects(cloud.saveProduct({name:'Pieza'}),/material/);
 await cloud.saveProduct({name:'Borrador sin foto'},{published:false});assert.equal(rows[0].image_url,'');
 await assert.rejects(cloud.setProductPublished('p1',true),/Completa/);
 rejectWrites();await assert.rejects(cloud.saveProduct({name:'No guardado'},{published:false}),/Network failure/);assert.equal(rows.length,1);
});

test('three photographs survive save, reopening, reordering and duplication without re-uploading',async()=>{
 const {cloud,rows,uploads}=await setup();
 const saved=await cloud.saveProduct({name:'Mi artesanía',material:'Fibra',story:'Hecha a mano',img:photo,photos:['data:image/jpeg;base64,ZGVm','data:image/png;base64,Z2hp']},{published:false});
 assert.equal(uploads.length,3);assert.equal(saved.photos.length,2);assert.equal(rows[0].image_url,saved.imageUrl);assert.deepEqual(rows[0].gallery_urls,plain(saved.photos));
 const reopened=(await cloud.myProducts())[0];assert.deepEqual(plain(reopened.photos),plain(saved.photos));
 await cloud.saveProduct({...reopened,img:reopened.photos[1],photos:[reopened.img,reopened.photos[0]]});assert.equal(uploads.length,3);
 assert.equal(rows[0].image_url,saved.photos[1]);assert.deepEqual(rows[0].gallery_urls,[saved.imageUrl,saved.photos[0]]);
 await cloud.duplicateProduct(saved.id);assert.equal(rows[1].publicado,false);assert.deepEqual(rows[1].gallery_urls,rows[0].gallery_urls);
});

test('invalid galleries fail before upload and removed photographs are not kept in the row',async()=>{
 const {cloud,rows,uploads}=await setup();
 await assert.rejects(cloud.saveProduct({name:'Pieza',img:photo,photos:[photo,photo,photo]},{published:false}),/hasta tres/);
 await assert.rejects(cloud.saveProduct({name:'Pieza',img:photo,photos:['https://example.test/foreign.jpg']},{published:false}),/fotografía propia/);
 await assert.rejects(cloud.saveProduct({name:'Pieza',img:photo,photos:[photo]},{published:false}),/diferentes/);
 await assert.rejects(cloud.saveProduct({name:'Pieza',img:photo,photos:['']},{published:false}),/Revisa/);
 assert.equal(uploads.length,0);
 const saved=await cloud.saveProduct({name:'Pieza',img:photo,photos:['data:image/jpeg;base64,ZGVm']},{published:false});
 await cloud.saveProduct({id:saved.id,name:'Pieza',img:saved.imageUrl,photos:[]},{published:false});assert.deepEqual(rows[0].gallery_urls,[]);assert.equal(uploads.length,2);
});

test('partial upload failure never saves an incomplete gallery and retry reuses successful uploads',async()=>{
 const {cloud,rows,uploads,failUploadAt}=await setup();failUploadAt(2);
 const product={name:'Mi pieza',img:photo,photos:['data:image/jpeg;base64,ZGVm','data:image/jpeg;base64,Z2hp']};
 await assert.rejects(cloud.saveProduct(product,{published:false}),/Upload failed/);assert.equal(rows.length,0);assert.equal(uploads.length,3);
 const saved=await cloud.saveProduct(product,{published:false});assert.equal(uploads.length,4);assert.equal(saved.photos.length,2);assert.equal(rows.length,1);
});

test('database rejection preserves uploaded files for retry and account changes prevent a late write',async()=>{
 const first=await setup();first.rejectWrites();const product={name:'Mi pieza',img:photo};
 await assert.rejects(first.cloud.saveProduct(product,{published:false}),/Network failure/);
 await assert.rejects(first.cloud.saveProduct(product,{published:false}),/Network failure/);assert.equal(first.uploads.length,1);
 const other=await setup();other.api.storage.from=()=>({upload:async()=>{other.api.auth.getUser=async()=>({data:{user:{id:'b'}}});await other.cloud.init();return {error:null};},getPublicUrl:()=>({data:{publicUrl:'https://storage.example/a/file.jpg'}})});
 await assert.rejects(other.cloud.saveProduct(product,{published:false}),/cuenta cambió/);assert.equal(other.rows.length,0);
});

test('public catalog mapping keeps the gallery returned by the database',async()=>{
 const {cloud,api}=await setup();api.rpc=async()=>({data:{profiles:[],products:[{id:'public',name:'Pieza',image_url:'https://storage.example/front.jpg',photos:['https://storage.example/side.jpg','https://storage.example/detail.jpg']}]},error:null});
 const catalog=await cloud.list({reviews:false});assert.equal(catalog.products[0].img,'https://storage.example/front.jpg');assert.deepEqual(plain(catalog.products[0].photos),['https://storage.example/side.jpg','https://storage.example/detail.jpg']);
});

test('a deployment without the gallery column still saves a main photograph and does not drop selections silently',async()=>{
 const {cloud,api,rows,uploads}=await setup();const original=api.from;
 api.from=table=>{const query=original(table);query.limit=()=>Promise.resolve({data:null,error:{code:'42703',message:'Column missing'}});return query;};
 await cloud.myProducts();assert.equal(cloud.galleryEnabled,false);
 const saved=await cloud.saveProduct({name:'Pieza',img:photo},{published:false});assert.equal(rows.length,1);assert.equal(Object.hasOwn(rows[0],'gallery_urls'),false);
 await assert.rejects(cloud.saveProduct({id:saved.id,name:'Pieza',img:saved.imageUrl,photos:['data:image/jpeg;base64,ZGVm']},{published:false}),/aún no está activa/);assert.equal(uploads.length,1);
});

test('a transient gallery capability error is retryable and is not remembered as a missing schema',async()=>{
 const {cloud,api}=await setup();const original=api.from;let fail=true;
 api.from=table=>{const query=original(table);query.limit=()=>Promise.resolve(fail?{error:{code:'NETWORK',message:'Sin conexión'}}:{data:[],error:null});return query;};
 await assert.rejects(cloud.myProducts(),/Sin conexión/);fail=false;await cloud.myProducts();assert.equal(cloud.galleryEnabled,true);
});

test('switching accounts while checking gallery support never returns the previous account products',async()=>{
 const {cloud,api}=await setup();const original=api.from;
 api.from=table=>{const query=original(table);query.limit=async()=>{api.auth.getUser=async()=>({data:{user:{id:'b'}}});await cloud.init();return {data:[],error:null};};return query;};
 await assert.rejects(cloud.myProducts(),/cuenta cambió/);
});
