/* Refresh the unchanged skill layers after the app has resolved public data. */
import {init} from './motion/motion.js';
import {mountAll,unmountAll} from './moments/moments.js';
let entered=false;
function refresh(){
 const hero=document.querySelector('.hero[data-enter]');
 if(hero&&!entered){entered=true;document.documentElement.classList.remove('m-enter-done');document.documentElement.classList.add('m-enter');init();}
 unmountAll();mountAll();
}
window.addEventListener('khipu:rendered',refresh);
refresh();
