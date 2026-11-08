/* Phase 1: accessible account screens using the existing visual identity. */
(() => {
 'use strict';
 const cloud=window.khipuCloud;
 const page=document.body.dataset.page;
 const root=document.getElementById('accountContent');
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const statusNames={pending:'Pendiente de aprobación',active:'Activa',suspended:'Acceso suspendido',rejected:'Solicitud rechazada'};
 const homeFor=member=>member?.role==='admin'?'admin.html':'panel.html';
 let working=false,completedReset=false,providerSettings=null;
 function message(text,error=false){const box=document.getElementById('accountMessage');box.className=error?'notice account-message':'success account-message';box.textContent=text;box.hidden=false;box.focus();}
 function friendly(error){
  const text=error?.message||'';
  if(/invalid login credentials/i.test(text))return 'El correo o la contraseña no coinciden. Revisa tus datos.';
  if(/email not confirmed/i.test(text))return 'Confirma tu correo con el enlace que recibiste antes de entrar.';
  if(/rate.limit|too many|after \d+ seconds/i.test(text))return 'Espera un momento antes de intentarlo de nuevo.';
  if(/fetch|network|load failed/i.test(text))return 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.';
  if(/password.*(short|least)|weak.password/i.test(text))return 'Usa una contraseña de al menos 12 caracteres.';
  if(/same.password/i.test(text))return 'Elige una contraseña diferente de la anterior.';
  return 'No se pudo completar la operación. Inténtalo de nuevo o contacta a khipuFibra.';
 }
 async function run(task){
  if(working)return;working=true;
  const controls=[...root.querySelectorAll('button,input')];
  const disabled=controls.map(control=>control.disabled);
  controls.forEach(control=>control.disabled=true);root.setAttribute('aria-busy','true');
  try{await task();}catch(error){message(friendly(error),true);}
  finally{working=false;controls.forEach((control,i)=>control.disabled=disabled[i]);root.removeAttribute('aria-busy');}
 }
 function shell(content){root.innerHTML=content+'<div id="accountMessage" class="account-message" role="status" aria-live="polite" tabindex="-1" hidden></div>';}
 function connectionRequired(){shell('<h1>El acceso está en preparación</h1><p>El catálogo sigue disponible. El equipo de khipuFibra debe configurar el acceso antes de recibir cuentas.</p><a class="btn" href="catalogo.html">Explorar el catálogo</a>');}
 function passwordFields(confirm=false){return `<div class="field"><label for="password">${confirm?'Nueva contraseña':'Contraseña'}</label><input class="input" id="password" name="password" type="password" autocomplete="${confirm?'new-password':'current-password'}" ${confirm?'minlength="12"':''} required ${confirm?'aria-describedby="passwordHelp"':''}></div>${confirm?'<p class="muted small" id="passwordHelp">Usa al menos 12 caracteres. Puedes combinar varias palabras.</p><div class="field"><label for="passwordConfirm">Repite la contraseña</label><input class="input" id="passwordConfirm" name="passwordConfirm" type="password" autocomplete="new-password" minlength="12" required></div>':''}`;}
 function emailField(){return '<div class="field"><label for="email">Correo electrónico</label><input class="input" id="email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required></div>';}
 function showStatus(auth){
  const state=auth.membership?.status||'pending';
  const explanation={pending:'Recibimos tu solicitud. El equipo de khipuFibra debe aprobarla antes de que puedas gestionar productos.',suspended:'Tu acceso está suspendido. Contacta al equipo de khipuFibra para revisarlo. Tus productos no se han eliminado.',rejected:'Tu solicitud no fue aprobada. Puedes contactar al equipo de khipuFibra para solicitar una revisión.'};
  shell(`<span class="eyebrow">Tu cuenta</span><h1>${escape(statusNames[state])}</h1><p>${escape(explanation[state]||'Consulta con el equipo de khipuFibra.')}</p><p class="muted account-email">${escape(auth.user.email)}</p><div class="account-actions"><button class="btn" id="refreshAccess">Comprobar mi acceso</button><button class="btn alt" id="accountLogout">Cerrar sesión</button></div>`);
  document.getElementById('refreshAccess').onclick=()=>run(async()=>{const updated=await cloud.init();if(updated.membership?.status==='active')location.replace(homeFor(updated.membership));else message('Tu estado sigue siendo: '+statusNames[updated.membership?.status||'pending']+'.');});
  document.getElementById('accountLogout').onclick=()=>run(async()=>{await cloud.logout();location.replace('acceso.html');});
 }
 function showLogin(){
  shell(`<span class="eyebrow">Espacio de artesanas</span><h1>Entra a khipuFibra</h1><p>Para gestionar productos necesitas aprobación del equipo.</p><button class="btn alt wide" id="googleLogin" ${providerSettings?.google===false?'disabled aria-describedby="googleNotice"':''}>Continuar con Google</button>${providerSettings?.google===false?'<p class="muted small" id="googleNotice">Google aún no está disponible. Por ahora, entra con tu correo.</p>':''}<div class="account-divider">Entra con tu correo</div><form id="loginForm">${emailField()}${passwordFields()}<button class="btn wide" type="submit">Entrar con mi correo</button></form><div class="account-links"><a href="recuperar.html">Olvidé mi contraseña</a><button class="text-button" id="showRegistration">Solicitar una cuenta</button></div>`);
  document.getElementById('googleLogin').onclick=()=>run(()=>cloud.login());
  document.getElementById('loginForm').onsubmit=event=>{event.preventDefault();const values=new FormData(event.currentTarget);run(async()=>{await cloud.loginWithPassword(String(values.get('email')),String(values.get('password')));await start();});};
  document.getElementById('showRegistration').onclick=showRegistration;
 }
 function showRegistration(){
  shell(`<span class="eyebrow">Nueva solicitud</span><h1>Solicita tu cuenta</h1><p>Primero confirma tu correo. Después, el equipo revisará tu solicitud. Crear la cuenta no activa el acceso de artesana.</p><form id="registerForm"><div class="field"><label for="fullName">Tu nombre</label><input class="input" id="fullName" name="fullName" autocomplete="name" minlength="2" maxlength="100" required></div>${emailField()}${passwordFields(true)}<button class="btn wide" type="submit">Enviar mi solicitud</button></form><div class="account-links"><button class="text-button" id="backLogin">Volver al inicio de sesión</button></div>`);
  document.getElementById('passwordConfirm').oninput=event=>event.target.setCustomValidity('');
  document.getElementById('registerForm').onsubmit=event=>{event.preventDefault();const values=new FormData(event.currentTarget);if(!matchingPasswords(values))return;run(async()=>{await cloud.requestAccount(String(values.get('email')),String(values.get('password')),String(values.get('fullName')));document.getElementById('registerForm').reset();message('Si el correo puede registrarse, recibirás un enlace para confirmarlo. Luego podrás entrar y consultar tu solicitud.');});};
  document.getElementById('backLogin').onclick=showLogin;
 }
 function matchingPasswords(values){if(values.get('password')===values.get('passwordConfirm'))return true;const field=document.getElementById('passwordConfirm');field.setCustomValidity('Las contraseñas deben coincidir.');field.reportValidity();return false;}
 function showRecovery(){
  shell(`<h1>Recupera tu contraseña</h1><p>Te enviaremos un enlace para elegir una nueva contraseña.</p><form id="recoveryForm">${emailField()}<button class="btn wide" type="submit">Enviar enlace de recuperación</button></form><div class="account-links"><a href="acceso.html">Volver al inicio de sesión</a></div>`);
  document.getElementById('recoveryForm').onsubmit=event=>{event.preventDefault();const values=new FormData(event.currentTarget);run(async()=>{await cloud.recoverPassword(String(values.get('email')));message('Si existe una cuenta con ese correo, recibirás un enlace de recuperación. Revisa también tu carpeta de correo no deseado.');});};
 }
 function showReset(auth){
  if(!auth.user){shell('<h1>Abre el enlace de tu correo</h1><p>El enlace no es válido o ya venció. Solicita uno nuevo para continuar.</p><a class="btn" href="recuperar.html">Solicitar otro enlace</a>');return;}
  shell(`<h1>Elige tu contraseña</h1><p>Guarda una contraseña que puedas recordar y no compartas con otras personas.</p><form id="resetForm">${passwordFields(true)}<button class="btn wide" type="submit">Guardar mi contraseña</button></form>`);
  document.getElementById('passwordConfirm').oninput=event=>event.target.setCustomValidity('');
  document.getElementById('resetForm').onsubmit=event=>{event.preventDefault();const values=new FormData(event.currentTarget);if(!matchingPasswords(values))return;run(async()=>{await cloud.updatePassword(String(values.get('password')));completedReset=true;let signedOut=true;try{await cloud.logout();}catch{signedOut=false;}shell('<h1>Contraseña guardada</h1><p>'+(signedOut?'Ya puedes entrar con tu correo y tu nueva contraseña. Tu acceso conserva el estado asignado por el equipo.':'La contraseña se actualizó, pero no pudimos cerrar tu sesión. Vuelve a tu cuenta para intentarlo.')+'</p><a class="btn" href="acceso.html">Entrar a mi cuenta</a>');});};
 }
 async function start(){
  if(!cloud?.enabled){connectionRequired();return;}
  try{
   // Recovery does not need a membership; an expired link must not create access.
   if(page==='recuperar'){showRecovery();return;}
   const [auth,settings]=await Promise.all([cloud.init(),page==='acceso'&&cloud.authSettings?cloud.authSettings():Promise.resolve(null)]);
   providerSettings=settings;
   if(page==='restablecer'){showReset(auth);return;}
   if(auth.user){if(auth.membership?.status==='active'){location.replace(homeFor(auth.membership));return;}showStatus(auth);}else showLogin();
  }catch(error){shell('<h1>No pudimos comprobar tu cuenta</h1><p>Revisa tu conexión y vuelve a intentarlo. Si el problema continúa, contacta a khipuFibra.</p><button class="btn" id="retryAccess">Volver a intentar</button><a class="btn alt" href="catalogo.html">Ver catálogo</a>');document.getElementById('retryAccess').onclick=start;}
 }
 window.khipuAccountUI={escape,friendly,statusNames,homeFor};
 // Sign-out in another tab removes private account screens immediately.
 window.addEventListener('khipu:auth-change',event=>{if(event.detail.event==='SIGNED_OUT'){if(page==='acceso')showLogin();else if(page==='restablecer'&&!completedReset)showReset({user:null});}else if(event.detail.event==='SIGNED_IN'&&page==='acceso'&&!working)start();});
 start();
})();
