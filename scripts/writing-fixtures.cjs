// Local UI fixtures only: no provider, microphone, database or paid generation.
const fs=require('fs');require('./panels-fixtures.cjs');
const quota={plan:'basic',used:1,limit:2,remaining:1,monthlyUsed:1,monthlyLimit:20};
let html=fs.readFileSync('.taste-skill/panels-editor-descripcion.html','utf8');
html=html.replace('<script src="/assets/account-security.js">',`<script>window.khipuCloud.aiQuota=async()=>(${JSON.stringify(quota)});window.khipuCloud.improveText=async()=>({text:'Propuesta simulada para comprobar la comparación. No es una generación real.',quota:${JSON.stringify(quota)}});</script><script src="/assets/account-security.js">`);
html=html.replace('Verificación local · datos sintéticos','Verificación local · propuesta de IA simulada · datos sintéticos');
html=html.replace('</body>',`<script>window.addEventListener('load',()=>setTimeout(()=>document.querySelector('#editorStep2 .text-assist>button')?.click(),400));</script></body>`);
fs.writeFileSync('.taste-skill/writing-comparison.html',html);
console.log('Wrote writing comparison fixture with explicit simulated AI label.');
