/* Browser dictation. No audio files are recorded or uploaded by KhipuFibra. */
(()=>{'use strict';
const fields=['approveTextArea','profileBio','profileStory','socialPreview'];
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let active=null,dispose=()=>{};
const editable=item=>item.target.isConnected&&!item.target.disabled&&!item.target.readOnly&&!item.target.closest('[hidden],fieldset[disabled]');
const ready='El texto se añadirá al final. Revísalo antes de aprobar o guardar.';
function cancel(message='Dictado detenido. El texto reconocido se conserva.'){
 const run=active;if(!run)return;active=null;clearTimeout(run.timer);
 try{run.recognition.abort();}catch{}
 run.item.preview.textContent='';run.item.status.textContent=message;run.item.button.textContent='Grabar voz';run.item.button.setAttribute('aria-pressed','false');run.item.button.disabled=!editable(run.item);
}
function start(item){
 if(!editable(item))return;
 if(active?.item===item){
  if(!active.started){cancel();return;}
  if(active.stopping)return;
  const run=active;run.stopping=true;item.button.disabled=true;item.status.textContent='Terminando el dictado…';
  try{run.recognition.stop();if(active===run)run.timer=setTimeout(()=>{if(active===run)cancel('Dictado detenido. Revisa el texto reconocido antes de continuar.');},8000);}catch{cancel();}
  return;
 }
 cancel();
 let recognition;try{recognition=new Recognition();}catch{item.status.textContent='No se pudo iniciar el dictado. Puedes escribir el texto.';return;}
 const run={recognition,item,started:false,stopping:false,seen:new Set(),added:false,timer:null};active=run;
 recognition.lang='es-PE';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
 item.button.textContent='Cancelar inicio';item.button.setAttribute('aria-pressed','true');item.status.textContent='Esperando permiso del micrófono…';
 recognition.onstart=()=>{if(active!==run){try{recognition.abort();}catch{}return;}if(!editable(item)){cancel();return;}run.started=true;item.button.textContent='Detener dictado';item.status.textContent='Escuchando. Habla con claridad y pulsa Detener dictado al terminar.';};
 recognition.onresult=event=>{
  if(active!==run)return;if(!editable(item)){cancel();return;}
  let pending='';
  for(let i=event.resultIndex||0;i<event.results.length;i++){
   const result=event.results[i],text=String(result[0]?.transcript||'').trim();
   if(!result.isFinal){pending+=text+' ';continue;}
   if(run.seen.has(i)||!text)continue;run.seen.add(i);
   const next=item.target.value+(item.target.value&&!/\s$/.test(item.target.value)?' ':'')+text;
   const limit=Number(item.target.getAttribute('maxlength'));
   if(limit>0&&next.length>limit){cancel('El dictado supera el límite de este campo. Acorta el texto antes de continuar.');return;}
   item.target.value=next;run.added=true;item.target.dispatchEvent(new Event('input',{bubbles:true}));
  }
  item.preview.textContent=pending.trim()?('Reconociendo: '+pending.trim()):'';
 };
 recognition.onerror=event=>{
  if(active!==run)return;
  const messages={'not-allowed':'Permiso de micrófono denegado. Puedes habilitarlo en tu navegador o escribir el texto.','service-not-allowed':'El navegador no permite este servicio de dictado. Puedes escribir el texto.','audio-capture':'No se encontró un micrófono disponible. Revisa su conexión.','network':'No se pudo conectar con el reconocimiento de voz. Revisa Internet o escribe el texto.','no-speech':'No se detectó voz. Pulsa Grabar voz para intentarlo otra vez.','language-not-supported':'Este navegador no admite el dictado en español. Puedes escribir el texto.'};
  cancel(messages[event.error]||'El dictado se detuvo. Puedes volver a intentarlo o escribir el texto.');
 };
 recognition.onend=()=>{if(active!==run)return;active=null;clearTimeout(run.timer);item.preview.textContent='';item.status.textContent=run.added?'Texto dictado. Revísalo antes de aprobar o guardar.':'No se añadió texto. Puedes volver a grabar o escribir.';item.button.textContent='Grabar voz';item.button.setAttribute('aria-pressed','false');item.button.disabled=!editable(item);};
 try{recognition.start();}catch{cancel('No se pudo iniciar el dictado. Revisa el permiso del micrófono o escribe el texto.');}
}
function mount(root=document){
 cancel();dispose();const items=[];
 for(const id of fields){
  const target=root.querySelector('#'+id);if(!target)continue;
  const box=document.createElement('div');box.className='voice-input';
  const button=document.createElement('button');button.type='button';button.className='btn alt smallbtn';button.textContent='Grabar voz';button.setAttribute('aria-controls',id);button.setAttribute('aria-pressed','false');
  const hint=document.createElement('p');hint.className='small muted';hint.id=id+'VoiceHelp';hint.textContent='Dictado de voz · El navegador puede enviar el audio a su servicio de reconocimiento. KhipuFibra no guarda grabaciones.';
  const status=document.createElement('p');status.id=id+'VoiceStatus';status.className='small voice-status';status.setAttribute('role','status');status.textContent=ready;
  const preview=document.createElement('p');preview.className='small voice-preview';preview.setAttribute('aria-live','off');
  button.setAttribute('aria-describedby',hint.id+' '+status.id);
  const unsupported=!Recognition||window.isSecureContext===false;
  if(unsupported){button.disabled=true;status.textContent=!Recognition?'Este navegador no ofrece dictado de voz. Puedes escribir el texto.':'El dictado necesita una conexión segura (HTTPS o localhost). Puedes escribir el texto.';}
  const item={target,box,button,hint,status,preview,unsupported};button.disabled=unsupported||!editable(item);button.onclick=()=>{if(!unsupported)start(item);};
  box.append(button,hint,status,preview);target.after(box);items.push(item);
 }
 const observer=typeof MutationObserver==='function'?new MutationObserver(()=>{
  if(active&&!editable(active.item))cancel();
  items.forEach(item=>{const disabled=Boolean(item.unsupported||!editable(item)||(active?.item===item&&active.stopping));if(item.button.disabled!==disabled)item.button.disabled=disabled;});
 }):null;
 observer?.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','readonly','hidden']});
 dispose=()=>{observer?.disconnect();items.forEach(item=>item.box.remove());};
}
// Finalized text is already in the editor before any approval, save or AI action.
document.addEventListener('click',event=>{if(active&&!active.item.box.contains(event.target)&&event.target.closest('a,button,input[type=submit]'))cancel();},true);
document.addEventListener('submit',()=>cancel(),true);
document.addEventListener('change',()=>cancel(),true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',()=>cancel());
window.addEventListener('khipu:auth-change',()=>cancel());
window.khipuVoice={mount,cancel};
})();
