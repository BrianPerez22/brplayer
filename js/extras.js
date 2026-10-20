/* ---------- Velocidad, temporizador de apagado y cola reordenable ---------- */

/* Velocidad de reproducción (conserva el tono) */
const SPDS=[.75,.9,1,1.15,1.25,1.5,1.75,2];
let spd=parseFloat(localStorage.getItem('spd'));if(!SPDS.includes(spd))spd=1;
const spdTxt=v=>String(v).replace('.',',')+'×';
function applySpd(){au.defaultPlaybackRate=spd;au.playbackRate=spd;try{au.preservesPitch=true;au.webkitPreservesPitch=true}catch(e){}}
['loadstart','loadedmetadata'].forEach(ev=>au.addEventListener(ev,applySpd));
au.addEventListener('ratechange',()=>{try{pos()}catch(e){}});
applySpd();

/* Temporizador de apagado: minutos fijos o al terminar la canción */
let slpAt=0,slpEnd=false,slpTm=0;
const slpClear=()=>{clearTimeout(slpTm);slpAt=0;slpEnd=false};
function slpStop(msg){slpClear();au.pause();toast(msg||'Temporizador: reproducción detenida')}
function slpSet(min){slpClear();slpAt=Date.now()+min*60000;slpTm=setTimeout(()=>slpStop(),min*60000);toast('Se detendrá en '+min+' min')}
au.addEventListener('timeupdate',()=>{if(slpAt&&Date.now()>=slpAt)slpStop()}); /* respaldo si el temporizador se retrasa en segundo plano */
{const n0=next;next=function(auto){if(auto&&slpEnd){slpStop('Temporizador: fin de la canción');return}return n0.apply(this,arguments)}}

function updLbls(){
  const a=$('spdl'),b=$('slpl');
  if(a)a.textContent='Velocidad: '+spdTxt(spd);
  if(b)b.textContent=slpAt?'Temporizador: '+Math.max(1,Math.ceil((slpAt-Date.now())/60000))+' min':slpEnd?'Temporizador: fin de la canción':'Temporizador de apagado';
}
Object.assign(A,{
  spd:()=>openSheet('Velocidad de reproducción',SPDS.map(v=>[spdTxt(v)+(v==1?' (normal)':''),v==spd?'check':'speed',()=>{
    spd=v;try{localStorage.setItem('spd',v)}catch(e){}applySpd();updLbls();toast('Velocidad: '+spdTxt(v))}])),
  slp:()=>openSheet('Temporizador de apagado',[
    ...[15,30,45,60].map(m=>[m+' minutos','clock',()=>slpSet(m)]),
    ['Al terminar la canción','clock',()=>{slpClear();slpEnd=true;toast('Se detendrá al terminar la canción')}],
    ...((slpAt||slpEnd)?[['Desactivar temporizador','close',()=>{slpClear();toast('Temporizador desactivado')}]]:[])])
});
{const hm=A.hm;A.hm=()=>{updLbls();hm()}}
updLbls();

/* Cola: arrastra el asa de una fila para cambiar su orden */
{
  const L=$('list');
  L.addEventListener('click',e=>{if(e.target.closest('[data-gp]')){e.stopPropagation();e.preventDefault()}},true);
  L.addEventListener('pointerdown',e=>{
    const h=e.target.closest('[data-gp]');if(!h||(e.pointerType=='mouse'&&e.button!=0))return;
    e.preventDefault();e.stopImmediatePropagation(); /* que no lo tome el gesto de deslizar de la lista */
    const row=h.closest('.t'),rows=[...L.querySelectorAll('.t[data-qi]')],from=rows.indexOf(row);if(from<0)return;
    const qs=rows.map(r=>+r.dataset.qi),rc=rows.map(r=>r.getBoundingClientRect()),y0=e.clientY,rh=rc[from].height,id=e.pointerId;
    let to=from;row.classList.add('drag');try{h.setPointerCapture(id)}catch(_){}
    const mv=ev=>{
      if(ev.pointerId!=id)return;
      const dy=Math.max(rc[0].top-rc[from].top,Math.min(rc[rc.length-1].top-rc[from].top,ev.clientY-y0)),mid=rc[from].top+dy+rh/2;
      row.style.transform='translateY('+dy+'px)';to=from;
      rc.forEach((r,i)=>{if(i>from&&mid>r.top+r.height/2)to=Math.max(to,i);else if(i<from&&mid<r.top+r.height/2)to=Math.min(to,i)});
      rows.forEach((r,i)=>{if(i==from)return;const s=from<to&&i>from&&i<=to?-rh:from>to&&i<from&&i>=to?rh:0;r.style.transform=s?'translateY('+s+'px)':''});
    };
    const up=ev=>{
      if(ev.pointerId!=id)return;
      h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);
      if(ev.type=='pointerup'&&to!=from){const[t]=queue.splice(qs[from],1);queue.splice(qs[to],0,t);qchg()}
      else{rows.forEach(r=>{r.style.transform=''});row.classList.remove('drag')}
    };
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  });
}
