/* Shared by the artisan profile and administrator. Passwords stay in Auth. */
(() => {
 'use strict';
 const cloud=window.khipuCloud;
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function explain(error){
  const code=error?.code||'',text=error?.message||'';
  if(/reauthentication_needed|reauthentication_not_valid/.test(code))return 'Confirma tu identidad con el código que recibirás por correo.';
  if(/same_password/.test(code)||/same password/i.test(text))return 'Elige una contraseña diferente de la anterior.';
  if(/weak_password/.test(code)||/least 12|al menos 12/i.test(text))return 'Usa una contraseña de al menos 12 caracteres.';
  if(/invalid_credentials|current_password/.test(code)||/current password|invalid login/i.test(text))return 'La contraseña actual no coincide. Revísala e inténtalo de nuevo.';
  if(/rate_limit/.test(code)||/too many|rate.limit/i.test(text))return 'Espera un momento antes de volver a intentarlo.';
  if(/session|jwt/i.test(code))return 'Tu sesión venció. Vuelve a entrar a tu cuenta.';
  return 'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.';
 }
 async function mount(root){
  if(!root||!cloud?.enabled)return;
  root.innerHTML='<p role="status">Comprobando la seguridad de tu cuenta…</p>';
  let account;
  try{account=await cloud.accountSecurity();}catch{root.innerHTML='<h2>Seguridad de mi cuenta</h2><p>No pudimos comprobar tu cuenta.</p><button class="btn alt" data-security-retry>Volver a intentar</button>';root.querySelector('[data-security-retry]').onclick=()=>mount(root);return;}
  if(!root.isConnected)return;
  root.innerHTML=`<h2>Seguridad de mi cuenta</h2><p class="account-email">${escape(account.email)}</p>${account.passwordIdentity?`<details class="password-settings"><summary>Cambiar contraseña</summary><form data-password-form><div class="field"><label for="currentPassword">Contraseña actual</label><input class="input" id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label for="newPassword">Nueva contraseña</label><input class="input" id="newPassword" name="password" type="password" autocomplete="new-password" minlength="12" aria-describedby="securityPasswordHelp" required><small id="securityPasswordHelp">Usa al menos 12 caracteres. Puedes combinar varias palabras.</small></div><div class="field"><label for="confirmPassword">Repite la nueva contraseña</label><input class="input" id="confirmPassword" name="confirmation" type="password" autocomplete="new-password" minlength="12" required></div><div class="field" data-nonce-field hidden><label for="securityNonce">Código de confirmación del correo</label><input class="input" id="securityNonce" name="nonce" autocomplete="one-time-code" inputmode="numeric"><button class="btn alt" type="button" data-send-nonce>Enviar otro código</button></div><button class="btn" type="submit">Guardar nueva contraseña</button></form></details><p><a class="smalllinks" href="recuperar.html">Olvidé mi contraseña actual</a></p>`:`<p>${account.googleIdentity?'Entras con Google. Gestiona tu contraseña desde tu cuenta de Google.':'No hay una identidad de correo y contraseña disponible para esta cuenta.'}</p>`}<div data-security-message role="status" aria-live="polite" tabindex="-1" hidden></div><button class="btn alt" type="button" data-security-logout>Cerrar sesión</button>`;
  let busy=false,valid=true;
  const report=(text,error=false)=>{if(!valid||!root.isConnected)return;const box=root.querySelector('[data-security-message]');box.textContent=text;box.className=error?'notice':'success';box.hidden=false;box.focus();};
  const invalidate=event=>{if(event.detail.event==='SIGNED_OUT'||(event.detail.userId&&event.detail.userId!==account.userId)){valid=false;root.replaceChildren();window.removeEventListener('khipu:auth-change',invalidate);}};
  window.addEventListener('khipu:auth-change',invalidate);
  async function run(task){
   if(busy||!valid)return;busy=true;root.setAttribute('aria-busy','true');const controls=[...root.querySelectorAll('button,input')];const previous=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
   try{const latest=await cloud.accountSecurity();if(latest.userId!==account.userId){valid=false;root.replaceChildren();location.replace('acceso.html');return;}await task();}catch(error){report(explain(error),true);}finally{busy=false;controls.forEach((control,i)=>control.disabled=previous[i]);root.removeAttribute('aria-busy');}
  }
  root.querySelector('[data-security-logout]').onclick=()=>run(async()=>{await cloud.logout();location.replace('acceso.html');});
  const form=root.querySelector('[data-password-form]');
  if(!form)return;
  const confirmation=form.querySelector('[name="confirmation"]');
  confirmation.oninput=()=>confirmation.setCustomValidity('');
  const sendNonce=async()=>{await cloud.reauthenticate();if(!valid)return;const field=form.querySelector('[data-nonce-field]');field.hidden=false;form.querySelector('[name="nonce"]').required=true;report('Te enviamos un código de confirmación. Escríbelo y vuelve a guardar la contraseña.');};
  form.querySelector('[data-send-nonce]').onclick=()=>run(sendNonce);
  form.onsubmit=event=>{
   event.preventDefault();if(busy||!valid)return;const values=new FormData(form);
   if(values.get('password')!==values.get('confirmation')){confirmation.setCustomValidity('Las contraseñas deben coincidir.');confirmation.reportValidity();return;}
   run(async()=>{
    try{await cloud.updatePassword(String(values.get('password')),{currentPassword:String(values.get('currentPassword')),nonce:String(values.get('nonce')||'')});}
    catch(error){if(error.code==='reauthentication_needed'){await sendNonce();return;}throw error;}
    form.reset();form.querySelector('[data-nonce-field]').hidden=true;form.querySelector('[name="nonce"]').required=false;report('Tu contraseña quedó actualizada. La próxima vez entra con la nueva contraseña.');
   });
  };
 }
 window.khipuSecurity={mount};
})();
