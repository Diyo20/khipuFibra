/* Shared eligibility rules for browser dictation and optional text improvement. */
(()=>{'use strict';
const privateFields={approveTextArea:'product_story',prodCare:'product_care',profileBio:'profile_bio',profileStory:'profile_story',profileFair:'profile_fair',socialPreview:'social',commerceReason:'moderation',reviewComment:'review'};
function eligible(target){
 if(!['INPUT','TEXTAREA'].includes(target.tagName)||target.closest('[data-writing-ui]')||target.hasAttribute('data-no-voice'))return false;
 if(target.tagName==='INPUT'&&!['text','search'].includes((target.getAttribute('type')||'text').toLowerCase()))return false;
 const precision=[target.id,target.name,target.getAttribute('autocomplete'),target.getAttribute('inputmode')].filter(Boolean).join(' ');
 return !/(password|contrase|nonce|token|secret|api.?key|one-time|email|correo|whatsapp|phone|telefono|price|precio|numeric|decimal|\btel\b|\burl\b|code|codigo|verification|clave|\botp\b|\bpin\b)/i.test(precision);
}
function context(target){
 if(!target)return null;
 const field=privateFields[target.id]||(target.tagName==='TEXTAREA'&&eligible(target)?'message':null);if(!field)return null;
 const page=document.body.dataset.page;
 // Visitors may dictate reviews; AI requires an approved account on the server.
 const entity=page==='nuevo'?new URLSearchParams(location.search).get('editar')||null:page==='difusion'?document.getElementById('shareProduct')?.value||null:null;
 const network=page==='difusion'?document.getElementById('shareChannel')?.value||'facebook':null;
 return {field,entity,network};
}
window.khipuWritingFields={eligible,context};
})();
