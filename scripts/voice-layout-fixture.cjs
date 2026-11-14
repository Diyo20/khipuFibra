// Local browser regression fixture. No microphone, authentication or provider calls.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'.taste-skill');
let html=fs.readFileSync(path.join(folder,'panels-editor.html'),'utf8');
const mock=()=>{window.qaSpeech=[];window.SpeechRecognition=class{constructor(){window.qaSpeech.push(this);}start(){}stop(){this.onend?.();}abort(){}};};
function probe(){
 const results=[],rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 for(const id of ['prodName','approveTextArea']){
  const target=document.getElementById(id),button=target.nextElementSibling.querySelector('button'),neighbor=id==='approveTextArea'?target.closest('.field').querySelector('.text-assist>button'):null;
  const initial=rect(button),adjacent=neighbor&&rect(neighbor),states=[];
  const check=state=>{const position=rect(button),beside=neighbor&&rect(neighbor);const stable=Object.keys(initial).every(key=>Math.abs(initial[key]-position[key])<.25)&&(!neighbor||Object.keys(adjacent).every(key=>Math.abs(adjacent[key]-beside[key])<.25));states.push({state,stable,position});};
  button.click();check('permission');let run=window.qaSpeech.at(-1);run.onstart();check('listening');run.onresult({resultIndex:0,results:[Object.assign([{transcript:'Una frase intermedia para comprobar que el texto no desplaza el botón'}],{isFinal:false})]});check('interim');run.onerror({error:'network'});check('error');
  button.click();run=window.qaSpeech.at(-1);run.onstart();button.click();check('stopped');
  results.push({field:id,initial,states,passed:states.every(state=>state.stable)});
 }
 window.qaVoiceGeometry=results;
 const banner=document.createElement('p');banner.id='qaVoiceGeometry';banner.style.cssText='padding:12px;background:#650D22;color:#FFF8EF;font:16px sans-serif';const passed=results.every(result=>result.passed);banner.textContent=passed?'Geometría del micrófono: OK en todos los estados (simulación local).':'FALLO: el micrófono cambió de posición.';document.body.prepend(banner);
 if(!passed)throw Error('Voice layout shifted: '+JSON.stringify(results));
}
html=html.replace('</head>','<script>('+mock.toString()+')();</script></head>').replace('</body>','<script>window.addEventListener("load",()=>setTimeout('+probe.toString()+',250));</script></body>');
fs.writeFileSync(path.join(folder,'voice-layout.html'),html);
console.log('Wrote local microphone geometry fixture (simulated recognition only).');
