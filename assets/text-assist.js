/* Original text stays in the form until an explicit, current proposal is accepted. */
(()=>{'use strict';
const items=new Map(),generators=new WeakSet();let observer,sequence=0;
const context=target=>window.khipuWritingFields?.context(target);
const tool=c=>c.field==='social'?'social_'+c.network:c.field;
const signature=c=>JSON.stringify(c);
const disable=(button,value)=>{value=Boolean(value);if(button.disabled!==value)button.disabled=value;};
const editable=t=>t.isConnected&&!t.disabled&&!t.readOnly&&!t.closest('[hidden],fieldset[disabled]');
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const quotaText=q=>q?`${q.plan==='pro'?'Khipu Pro':'Khipu Básico'} · ${q.used} de ${q.limit} intentos utilizados · ${q.remaining} disponibles · mes: ${q.monthlyUsed}/${q.monthlyLimit}`:'Los intentos se comprobarán en tu cuenta antes de generar.';
function attach(target){
 const c=context(target);if(!c||items.has(target)||target.closest('[data-writing-ui]'))return;
 const box=element('section',null,'text-assist');box.setAttribute('data-writing-ui','ai');
 const improve=element('button','✦ Mejorar con IA','btn alt smallbtn');improve.type='button';
 const quota=element('p',quotaText(null),'small'),status=element('p','','small');status.setAttribute('role','status');
 const compare=element('div',null,'text-comparison');compare.hidden=true;
 const original=element('textarea'),proposal=element('textarea');original.readOnly=proposal.readOnly=true;original.rows=proposal.rows=5;
 const uid=++sequence;original.id='writingOriginal'+uid;proposal.id='writingProposal'+uid;
 for(const [caption,area] of [['Texto original',original],['Texto mejorado · IA',proposal]]){const panel=element('div');const label=element('label',caption);label.htmlFor=area.id;panel.append(label,area);compare.append(panel);}
 const actions=element('div',null,'row');const accept=element('button','Aceptar','btn'),retry=element('button','✦ Rehacer con IA','btn alt'),keep=element('button','Conservar original','btn alt');
 [accept,retry,keep].forEach(b=>b.type='button');actions.append(accept,retry,keep);compare.append(actions);
 box.append(improve,quota,status,compare);(target.nextElementSibling?.classList.contains('voice-input')?target.nextElementSibling:target).after(box);
 const item={target,box,improve,quota,status,compare,original,proposal,accept,retry,keep,working:false,session:null,budget:null,epoch:0};items.set(target,item);
 const sync=()=>{disable(improve,item.working||!editable(target)||!target.value.trim());disable(accept,item.working||!editable(target)||!proposal.value);disable(retry,item.working||!editable(target)||!item.session||!item.budget||item.budget.remaining<=0);disable(keep,item.working);};item.sync=sync;
 const generate=async(again=false)=>{
  if(item.working||!editable(target))return;const cloud=window.khipuCloud;
  if(!cloud?.improveText||!cloud?.aiQuota){status.textContent='La mejora con IA está pendiente de activación.';return;}
  if(!again){item.session={source:target.value,context:context(target)};original.value=target.value;proposal.value='';}
  const session=item.session,epoch=++item.epoch;if(!session)return;
  item.working=true;window.khipuVoice?.cancel();status.textContent='Comprobando intentos…';sync();
  try{
   item.budget=await cloud.aiQuota(tool(session.context),session.context.entity);quota.textContent=quotaText(item.budget);
   if(epoch!==item.epoch||!target.isConnected||signature(context(target))!==signature(session.context))return;
   if(item.budget.remaining<=0)throw Error('Alcanzaste el límite de intentos. Puedes conservar y editar tu original.');
   status.textContent='Preparando una propuesta. Tu original se conserva.';
   const answer=await cloud.improveText({...session.context,source:session.source});
   if(epoch!==item.epoch||!target.isConnected)return;
   if(signature(context(target))!==signature(session.context))throw Error('Cambió el contenido seleccionado. Inicia una nueva comparación.');
   item.budget=answer.quota;quota.textContent=quotaText(item.budget);proposal.value=answer.text;compare.hidden=false;status.textContent='Compara la propuesta con tu original. Aceptar no guarda ni publica.';
  }catch(error){if(epoch===item.epoch&&target.isConnected){if(error.quota)item.budget=error.quota;quota.textContent=quotaText(item.budget);status.textContent=error.message;}}
  finally{if(epoch===item.epoch){item.working=false;sync();}}
 };
 improve.onclick=()=>generate(false);retry.onclick=()=>generate(true);
 keep.onclick=()=>{compare.hidden=true;proposal.value='';item.session=null;status.textContent='Propuesta descartada. El texto del formulario se conserva.';sync();};
 accept.onclick=()=>{
  if(item.working||!editable(target)||!item.session)return;
  if(target.value!==item.session.source||signature(context(target))!==signature(item.session.context)){status.textContent='El original o el contexto cambió. Conserva tus cambios e inicia una nueva comparación.';return;}
  const limit=Number(target.getAttribute('maxlength'));if(limit>0&&proposal.value.length>limit){status.textContent='La propuesta supera el límite del campo. Conserva el original o solicita otra versión.';return;}
  target.value=proposal.value;target.dispatchEvent(new Event('input',{bubbles:true}));compare.hidden=true;item.session=null;status.textContent='Propuesta aceptada. Puedes editarla y revisarla antes de guardar.';sync();
 };
 target.addEventListener('input',sync);sync();
}
function bindGeneration(id,field){
 const button=document.getElementById(id),cloud=window.khipuCloud;if(!button||generators.has(button)||!cloud?.aiQuota)return;generators.add(button);
 const text=document.getElementById(field+'GenerationQuota')||element('p',quotaText(null),'small');text.id=field+'GenerationQuota';text.setAttribute('role','status');text.setAttribute('data-writing-ui','quota');if(!text.isConnected)button.parentElement.after(text);
 const handler=button.onclick;let busy=false;
 button.onclick=async()=>{if(busy)return;busy=true;button.disabled=true;
  const c=context(document.getElementById(field));const name=id==='generateText'?'generate_product':'generate_social_'+c.network;
  try{const q=await cloud.aiQuota(name,c.entity);text.textContent=quotaText(q);if(q.remaining<=0){text.textContent+=' · Límite alcanzado.';return;}if(!button.isConnected||signature(context(document.getElementById(field)))!==signature(c))return;await handler();}
  catch(error){text.textContent=error.message;}
  finally{try{const q=await cloud.aiQuota(name,c.entity);if(button.isConnected){const same=signature(context(document.getElementById(field)))===signature(c);text.textContent=same?quotaText(q):quotaText(null);button.disabled=same&&q.remaining<=0;}}catch{button.disabled=false;}busy=false;}
 };
}
function mount(root=document){
 for(const [target,item] of items){if(!target.isConnected){item.epoch++;item.box.remove();items.delete(target);}else item.sync();}
 root.querySelectorAll('textarea').forEach(attach);
 bindGeneration('generateText','approveTextArea');bindGeneration('generateSocial','socialPreview');bindGeneration('retrySocial','socialPreview');
 if(!observer&&typeof MutationObserver==='function'){observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','readonly','hidden']});}
}
window.addEventListener('khipu:auth-change',()=>{items.forEach(item=>{item.epoch++;item.session=null;item.proposal.value='';item.original.value='';item.compare.hidden=true;item.working=false;item.sync();});});
window.khipuTextAssist={mount};
if(document.body)mount();else document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
})();
