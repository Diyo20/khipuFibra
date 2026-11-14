/* Browser dictation. No audio files are recorded or uploaded by KhipuFibra. */
(()=>{'use strict';
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const items=new Map();let active=null,observer=null,sequence=0;
const editable=item=>item.target.isConnected&&!item.target.disabled&&!item.target.readOnly&&!item.target.closest('[hidden],fieldset[disabled],details:not([open])');
const ready='';
function label(item,text){item.button.textContent=text;item.button.title=text;item.button.setAttribute('aria-label',text+': '+item.fieldLabel);}
function cancel(message='Dictado detenido. El texto reconocido se conserva.'){
 const run=active;if(!run)return;active=null;clearTimeout(run.timer);
 try{run.recognition.abort();}catch{}
 run.item.preview.textContent='';run.item.status.textContent=message;label(run.item,'Hablar');run.item.button.setAttribute('aria-pressed','false');run.item.button.disabled=!editable(run.item);
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
 label(item,'Cancelar');item.button.setAttribute('aria-pressed','true');item.status.textContent='Esperando permiso del micrófono…';
 recognition.onstart=()=>{if(active!==run){try{recognition.abort();}catch{}return;}if(!editable(item)){cancel();return;}run.started=true;label(item,'Detener');item.status.textContent='Escuchando…';};
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
  const messages={'not-allowed':'Permiso de micrófono denegado. Puedes habilitarlo en tu navegador o escribir el texto.','service-not-allowed':'El navegador no permite este servicio de dictado. Puedes escribir el texto.','audio-capture':'No se encontró un micrófono disponible. Revisa su conexión.','network':'El servicio de voz de este navegador no está disponible. Puede fallar aunque tu micrófono e Internet funcionen. Puedes escribir o usar el dictado de tu dispositivo.','no-speech':'No se detectó voz. Pulsa Hablar para intentarlo otra vez.','language-not-supported':'Este navegador no admite el dictado en español. Puedes escribir el texto.'};
  cancel(messages[event.error]||'El dictado se detuvo. Puedes volver a intentarlo o escribir el texto.');
 };
 recognition.onend=()=>{if(active!==run)return;active=null;clearTimeout(run.timer);item.preview.textContent='';item.status.textContent=run.added?'Texto dictado. Revísalo antes de guardar.':'No se añadió texto. Puedes volver a hablar o escribir.';label(item,'Hablar');item.button.setAttribute('aria-pressed','false');item.button.disabled=!editable(item);};
 try{recognition.start();}catch{cancel('No se pudo iniciar el dictado. Revisa el permiso del micrófono o escribe el texto.');}
}
function mount(root=document){
 if(root!==document)cancel();
 if(active&&!editable(active.item))cancel();
 for(const [target,item] of items)if(!target.isConnected){item.box.remove();item.feedback.remove();items.delete(target);}
 for(const target of root.querySelectorAll('input,textarea')){
  if(items.has(target)||!window.khipuWritingFields?.eligible(target))continue;
  if(!target.id)target.id='voiceField'+(++sequence);const id=target.id;
  const box=document.createElement('div');box.className='voice-input';box.setAttribute('data-writing-ui','voice');
  const button=document.createElement('button');button.type='button';button.className='btn alt smallbtn';button.textContent='Hablar';button.setAttribute('aria-controls',id);button.setAttribute('aria-pressed','false');
  const hint=document.createElement('p');hint.className='small muted';hint.id=id+'VoiceHelp';hint.textContent='La voz añade texto al final. Puedes corregirlo.';hint.hidden=true;
  const status=document.createElement('p');status.id=id+'VoiceStatus';status.className='small voice-status';status.setAttribute('role','status');status.textContent=ready;
  const preview=document.createElement('p');preview.className='small voice-preview';preview.setAttribute('aria-live','off');
  const feedback=document.createElement('div');feedback.className='voice-feedback';feedback.append(status,preview);
  button.setAttribute('aria-describedby',hint.id+' '+status.id);
  const unsupported=!Recognition||window.isSecureContext===false;
  if(unsupported){button.disabled=true;status.textContent=!Recognition?'Este navegador no ofrece dictado de voz. Puedes escribir el texto.':'El dictado necesita una conexión segura (HTTPS o localhost). Puedes escribir el texto.';}
  if(unsupported){button.hidden=true;status.hidden=true;feedback.hidden=true;}
  const fieldLabel=document.querySelector('label[for="'+id+'"]')?.textContent||'este campo';
  const item={target,box,feedback,button,hint,status,preview,unsupported,fieldLabel};button.disabled=unsupported||!editable(item);button.onclick=()=>{if(!unsupported)start(item);};
  if(target.tagName==='INPUT'){box.classList.add('voice-compact');hint.hidden=true;}
  label(item,'Hablar');
  if(!document.querySelector('.voice-first-help')){const help=document.createElement('details');help.className='voice-first-help small';const title=document.createElement('summary');title.textContent='Ayuda para hablar';const note=document.createElement('p');note.textContent='Pulsa el micrófono, habla y luego Detener. Tu texto se conserva. El navegador puede usar su servicio de voz; KhipuFibra no guarda audio.';help.append(title,note);(target.closest('form')||target.closest('.private-content')||root.body||root).append(help);}
  box.append(button,hint);target.after(box);box.after(feedback);items.set(target,item);
 }
 if(!observer&&typeof MutationObserver==='function'){observer=new MutationObserver(()=>{
  if(active&&!editable(active.item))cancel();
  mount(document);
  items.forEach(item=>{const disabled=Boolean(item.unsupported||!editable(item)||(active?.item===item&&active.stopping));if(item.button.disabled!==disabled)item.button.disabled=disabled;});
 });observer.observe(document.documentElement||root,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','readonly','hidden','open']});}
}
// Finalized text is already in the editor before any approval, save or AI action.
document.addEventListener('click',event=>{if(active&&!active.item.box.contains(event.target)&&event.target.closest('a,button,input[type=submit]'))cancel();},true);
document.addEventListener('submit',()=>cancel(),true);
document.addEventListener('change',()=>cancel(),true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',()=>cancel());
window.addEventListener('khipu:auth-change',()=>cancel());
window.khipuVoice={mount,cancel};
if(document.body)mount();else document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
})();
