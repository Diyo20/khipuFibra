const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function storage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
async function setup(page,{search='',products=[]}={}){
 const dom=parseHTML(fs.readFileSync(path.join(__dirname,'..',page+'.html'),'utf8')),document=dom.document;
 const localStorage=storage();
 const cloud={enabled:true,approved:false,user:null,init:async()=>({user:null,approved:false}),list:async()=>({products,profiles:[],reviews:[]}),clearPrivate(){}};
 const window={khipuCloud:cloud,addEventListener(){},innerWidth:390};
 const location={href:'https://preview.example/'+page+'.html'+search,search,replace(){}};
 const context=vm.createContext({window,document,location,localStorage,sessionStorage:storage(),structuredClone,URLSearchParams,URL,console,setTimeout:()=>0,Intl});
 for(const file of ['storefront.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);
 await tick();
 const sort=document.getElementById('sort');if(sort)Object.defineProperty(sort,'value',{writable:true,value:'default'});
 return {document,localStorage,click:button=>button.dispatchEvent(new dom.window.Event('click',{bubbles:true}))};
}
test('catalog combines accent-insensitive search, category and price without losing them when saving a favorite',async()=>{
 const {document,localStorage,click}=await setup('catalogo');
 const search=document.getElementById('search'),sort=document.getElementById('sort');
 search.value='algodon';search.oninput();assert.equal(document.querySelectorAll('[data-product-id]').length,2);
 document.getElementById('filters').onclick({target:document.querySelector('[data-cat="Bolsos"]')});
 sort.value='high';sort.onchange();assert.equal(document.querySelectorAll('[data-product-id]').length,1);
 click(document.querySelector('[data-fav="d1"]'));
 assert.equal(search.value,'algodon');assert.equal(sort.value,'high');assert.equal(document.querySelector('[data-cat="Bolsos"]').getAttribute('aria-pressed'),'true');
 assert.equal(document.querySelector('[data-fav="d1"]').getAttribute('aria-pressed'),'true');assert.deepEqual(JSON.parse(localStorage.getItem('khipuFibra_v2')).favorites,['d1']);
});
test('empty search has a working reset that restores all products',async()=>{
 const {document}=await setup('catalogo');document.getElementById('search').value='no-existe';document.getElementById('search').oninput();
 assert.match(document.getElementById('catalogStatus').textContent,/0 artesanías/);assert.equal(document.querySelectorAll('[data-product-id]').length,0);
 document.getElementById('clearFilters').onclick();assert.equal(document.getElementById('search').value,'');assert.equal(document.querySelectorAll('[data-product-id]').length,6);
});
test('product uses its actual heading, complete WhatsApp link, labeled demo content and related pieces',async()=>{
 const {document}=await setup('producto',{search:'?id=d1'});assert.equal(document.querySelector('h1').textContent,'Bolso Amanecer de Algodón');
 const url=new URL(document.querySelector('a[href^="https://wa.me/"]').getAttribute('href'));const message=url.searchParams.get('text');
 assert.match(message,/Bolso Amanecer/);assert.ok(message.includes('https://preview.example/producto.html?id=d1'),message);
 assert.match(document.querySelector('.example-label').textContent,/ejemplo/);assert.match(document.querySelector('.review').textContent,/Opinión de ejemplo/);
 assert.equal(document.querySelector('.related-products [data-product-id="d1"]'),null);
 assert.ok(document.querySelector('label[for="reviewName"]'));assert.ok(document.querySelector('label[for="reviewScore"]'));assert.ok(document.querySelector('label[for="reviewComment"]'));
});
test('unknown product IDs never display another product as the requested one',async()=>{
 const {document}=await setup('producto',{search:'?id=missing'});assert.match(document.querySelector('h1').textContent,/No encontramos/);assert.equal(document.querySelector('a[href^="https://wa.me/"]'),null);
});
test('prices to consult sort last and a real product image gallery does not invent images',async()=>{
 const p={id:'real',name:'Pieza real',price:null,category:'Bolsos',material:'Algodón',artisan:'Artesana',img:'https://example.test/front.jpg',photos:['https://example.test/detail.jpg']};
 const catalog=await setup('catalogo',{products:[p]});catalog.document.getElementById('sort').value='high';catalog.document.getElementById('sort').onchange();
 assert.equal([...catalog.document.querySelectorAll('[data-product-id]')].at(-1).dataset.productId,'real');assert.equal(catalog.document.querySelector('[data-product-id="real"] .price').textContent,'Consultar precio');
 const product=await setup('producto',{products:[p],search:'?id=real'});const thumbs=product.document.querySelectorAll('[data-product-photo]');assert.equal(thumbs.length,2);thumbs[1].onclick();assert.equal(product.document.getElementById('productImage').src,p.photos[0]);assert.equal(thumbs[1].getAttribute('aria-pressed'),'true');assert.equal(product.document.querySelector('.product-main-image .example-label'),null);
});
test('menu exposes its state, closes on Escape and releases the main content',async()=>{
 const {document}=await setup('index');const toggle=document.getElementById('toggleMenu');toggle.onclick();assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(document.getElementById('mainContent').inert,true);
 document.onkeydown({key:'Escape'});assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(document.getElementById('mainContent').inert,false);
});
