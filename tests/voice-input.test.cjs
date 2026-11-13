const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({supported=true,prefixed=false,secure=true,throws=false}={}){
 const dom=parseHTML('<html><body><main id="root"><form><label for="approveTextArea">Descripción</label><textarea id="approveTextArea" maxlength="5000">Texto escrito.</textarea><textarea id="profileBio"></textarea><textarea id="profileStory"></textarea><textarea id="socialPreview"></textarea><button type="submit" id="save">Guardar</button></form></main></body></html>');
 const document=dom.document,instances=[],listeners={};
 class Recognition{
  constructor(){instances.push(this);this.starts=0;this.stops=0;this.aborts=0;}
  start(){this.starts++;if(throws)throw Error('No disponible');}
  stop(){this.stops++;}
  abort(){this.aborts++;}
 }
 const window={isSecureContext:secure,addEventListener:(name,handler)=>listeners[name]=handler};
 if(supported)window[prefixed?'webkitSpeechRecognition':'SpeechRecognition']=Recognition;
 const timers=new Map();let timer=0;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/voice-input.js'),'utf8'),{window,document,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)});
 const root=document.getElementById('root');window.khipuVoice.mount(root);
 const target=id=>document.getElementById(id),box=id=>target(id).nextElementSibling,button=id=>box(id).querySelector('button');
 const result=(recognition,entries,resultIndex=0)=>recognition.onresult({resultIndex,results:entries.map(([transcript,isFinal=true])=>Object.assign([{transcript}],{isFinal}))});
 return {window,document,root,instances,target,box,button,result,listeners,timers,Event:dom.window.Event};
}
test('controls never request the microphone before a click and unsupported or insecure browsers keep editable fields',()=>{
 for(const options of [{supported:false},{secure:false}]){
  const app=setup(options);assert.equal(app.instances.length,0);assert.equal(app.target('profileBio').disabled,false);
  assert.equal(app.button('profileBio').disabled,true);assert.match(app.box('profileBio').textContent,/Puedes escribir/);
 }
 const app=setup({prefixed:true});assert.equal(app.instances.length,0);assert.equal(app.button('approveTextArea').getAttribute('aria-controls'),'approveTextArea');
 app.button('approveTextArea').onclick();assert.equal(app.instances[0].starts,1);assert.equal(app.instances[0].lang,'es-PE');
});
test('final results append once, partial results stay out of the field and editing remains possible',()=>{
 const app=setup();let inputs=0;app.target('approveTextArea').addEventListener('input',()=>inputs++);
 app.button('approveTextArea').onclick();const run=app.instances[0];run.onstart();
 app.result(run,[['Borrador parcial',false]]);assert.equal(app.target('approveTextArea').value,'Texto escrito.');assert.equal(inputs,0);
 app.result(run,[['Hecho a mano.']]);app.result(run,[['Hecho a mano.']]);assert.equal(inputs,1);
 app.target('approveTextArea').value+=' Edición manual.';
 app.result(run,[['Hecho a mano.'],['Con algodón.']],1);
 assert.equal(app.target('approveTextArea').value,'Texto escrito. Hecho a mano. Edición manual. Con algodón.');assert.equal(inputs,2);
 app.button('approveTextArea').onclick();assert.equal(run.stops,1);assert.equal(app.button('approveTextArea').disabled,true);
 app.result(run,[['Hecho a mano.'],['Con algodón.'],['Última frase.']],2);run.onend();
 assert.match(app.target('approveTextArea').value,/Última frase\.$/);assert.equal(app.button('approveTextArea').getAttribute('aria-pressed'),'false');assert.equal(app.timers.size,0);
});
test('permission, network and start errors preserve the field and never restart automatically',()=>{
 for(const error of ['not-allowed','audio-capture','network','no-speech','language-not-supported']){
  const app=setup();app.button('approveTextArea').onclick();const run=app.instances[0];run.onerror({error});run.onend();
  assert.equal(app.target('approveTextArea').value,'Texto escrito.');assert.equal(run.starts,1);assert.equal(run.aborts,1);assert.equal(app.button('approveTextArea').getAttribute('aria-pressed'),'false');
 }
 const app=setup({throws:true});app.button('profileBio').onclick();assert.match(app.box('profileBio').textContent,/No se pudo iniciar/);
});
test('switching fields, signing out or leaving the page discards late results',()=>{
 const app=setup();app.button('profileBio').onclick();const old=app.instances[0];old.onstart();
 app.button('profileStory').onclick();assert.equal(old.aborts,1);app.result(old,[['No debe entrar']]);assert.equal(app.target('profileBio').value,'');
 const run=app.instances[1];run.onstart();app.listeners['khipu:auth-change']();app.result(run,[['Tampoco entra']]);assert.equal(app.target('profileStory').value,'');
 app.button('profileStory').onclick();app.listeners.pagehide();assert.equal(app.instances[2].aborts,1);
});
test('disabled fields, hidden wizard stages and detached editors cannot receive speech',async()=>{
 const app=setup();app.button('approveTextArea').onclick();const run=app.instances[0];run.onstart();
 app.target('approveTextArea').disabled=true;await tick();assert.equal(run.aborts,1);app.result(run,[['No escribir durante el guardado']]);assert.equal(app.target('approveTextArea').value,'Texto escrito.');
 app.target('approveTextArea').disabled=false;await tick();app.button('approveTextArea').onclick();const second=app.instances[1];app.target('approveTextArea').parentElement.hidden=true;await tick();assert.equal(second.aborts,1);
 app.target('approveTextArea').parentElement.hidden=false;await tick();app.button('approveTextArea').onclick();const third=app.instances[2];app.root.remove();app.result(third,[['Texto tardío']]);assert.equal(third.aborts,1);
});
test('saving, changing context or remounting stops dictation without sending audio or submitting a form',()=>{
 const app=setup();app.button('socialPreview').onclick();let run=app.instances[0];run.onstart();
 app.target('save').dispatchEvent(new app.Event('click',{bubbles:true}));assert.equal(run.aborts,1);
 app.button('socialPreview').onclick();run=app.instances[1];app.document.dispatchEvent(new app.Event('change'));assert.equal(run.aborts,1);
 app.button('socialPreview').onclick();run=app.instances[2];app.window.khipuVoice.mount(app.root);assert.equal(run.aborts,1);assert.equal(app.document.querySelectorAll('.voice-input').length,4);
 app.result(run,[['Resultado anterior']]);assert.equal(app.target('socialPreview').value,'');
});
test('length limits preserve the existing text and stop rather than truncating speech silently',()=>{
 const app=setup();app.target('profileBio').setAttribute('maxlength','5');app.button('profileBio').onclick();const run=app.instances[0];app.result(run,[['Frase demasiado larga']]);
 assert.equal(app.target('profileBio').value,'');assert.equal(run.aborts,1);assert.match(app.box('profileBio').textContent,/supera el límite/);
});
