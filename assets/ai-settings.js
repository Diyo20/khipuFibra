(()=>{'use strict';
let current;
async function mount(){
 const parent=document.getElementById('adminOverviewPanel');if(!parent||parent===current)return;current=parent;
 const section=document.createElement('section');section.className='panel admin-section';section.innerHTML='<h2>Límites de escritura con IA</h2><p>El dictado no consume intentos. Los límites de texto se comprueban en el servidor.</p><p role="status">Consultando configuración…</p>';parent.append(section);
 try{const data=await window.khipuCloud.aiSettings();if(!parent.isConnected)return;section.querySelector('p[role=status]').textContent='Un intento corresponde a una generación o regeneración; aceptar y editar no consumen intentos.';
  for(const plan of data.plans){const form=document.createElement('form');form.className='grid2';const title=document.createElement('h3');title.textContent=plan.plan==='basic'?'Khipu Básico':'Khipu Pro';form.append(title);
   for(const [key,label,max] of [['per_content','Intentos por contenido y herramienta',30],['per_month','Intentos por cuenta al mes',1000]]){const field=document.createElement('div');field.className='field';const text=document.createElement('label'),input=document.createElement('input');input.id='aiLimit'+plan.plan+key;input.name=key;input.type='number';input.min=1;input.max=max;input.required=true;input.value=plan[key];input.className='input';text.htmlFor=input.id;text.textContent=label;field.append(text,input);form.append(field);}
   const button=document.createElement('button');button.className='btn';button.type='submit';button.textContent='Guardar límites';const status=document.createElement('p');status.setAttribute('role','status');form.append(button,status);section.append(form);
   form.onsubmit=async event=>{event.preventDefault();if(button.disabled)return;button.disabled=true;try{await window.khipuCloud.aiSettings(plan.plan,Number(form.elements.per_content.value),Number(form.elements.per_month.value));if(form.isConnected)status.textContent='Límites guardados en el historial.';}catch(error){if(form.isConnected)status.textContent=error.message;}finally{button.disabled=false;}};
  }
 }catch{if(parent.isConnected)section.querySelector('[role=status]').textContent='La configuración de cuotas está pendiente de activación.';}
}
new MutationObserver(mount).observe(document.documentElement,{subtree:true,childList:true});mount();
})();
