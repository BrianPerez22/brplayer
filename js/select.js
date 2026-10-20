/* ---------- Selección múltiple: elige varias canciones y aplícales una acción ----------
   Entrar: mantener pulsada una canción, "Seleccionar" en su menú ⋯, o ☰ → Seleccionar canciones. Salir: ✕ o Esc. */
let selMode=false,lpSup=false;
const sel=new Set();
const selList=()=>[...sel].filter(t=>tracks.includes(t));

function selUI(){
  document.body.classList.toggle('selm',selMode);
  $('selbar').hidden=!selMode;
  const n=selList().length;
  $('seln').textContent=n?(n==1?'1 seleccionada':n+' seleccionadas'):'Elige canciones';
  document.querySelectorAll('#list .t[data-i],#list .ci[data-i]').forEach(el=>{
    const t=tracks[+el.dataset.i];el.classList.toggle('sel',!!t&&sel.has(t));
  });
}
function enterSel(t){selMode=true;if(t)sel.add(t);selUI()}
function exitSel(){selMode=false;sel.clear();selUI()}
function toggleSel(t){sel.has(t)?sel.delete(t):sel.add(t);selUI()}
/* canciones que se ven ahora en pantalla (sin las recomendaciones de una playlist) */
const visTracks=()=>[...document.querySelectorAll('#list .t[data-i],#list .ci[data-i]')]
  .filter(el=>!el.querySelector('[data-ap]')).map(el=>tracks[+el.dataset.i]).filter(Boolean);

/* ---------- Acciones sobre la selección ---------- */
function selAddPl(p,a){
  let n=0;a.forEach(t=>{if(!p.items.includes(key(t))){p.items.push(key(t));n++}});savePls();
  toast(n?nCan(n)+(n==1?' agregada':' agregadas')+' a '+p.name:'Ya estaban en '+p.name);
  exitSel();if(view=='pls'||view.startsWith('pl:'))render();
}
function selActions(){
  const a=selList();if(!a.length){toast('Elige al menos una canción');return}
  const rem=a.filter(t=>t.remote),loc=a.filter(t=>!t.remote),nf=a.filter(t=>!isFav(t)),yf=a.filter(isFav),ks=new Set(a.map(key));
  const it=[
    ['Reproducir ahora','play',()=>{exitSel();playList(a,0,'sel')}],
    ['Reproducir a continuación','next',()=>{queue.unshift(...a);qchg();toast(nCan(a.length)+' a continuación');exitSel()}],
    ['Agregar a la cola','plus',()=>{queue.push(...a);qchg();toast(nCan(a.length)+(a.length==1?' agregada':' agregadas')+' a la cola');exitSel()}]];
  if(nf.length)it.push(['Guardar en favoritas'+(nf.length<a.length?' ('+nf.length+')':''),'heart',()=>{
    [...nf].reverse().forEach(t=>favs.unshift(key(t)));saveFavs();syncFav();exitSel();render();
    toast(nCan(nf.length)+(nf.length==1?' guardada':' guardadas')+' en favoritas')}]);
  if(yf.length)it.push(['Quitar de favoritas'+(yf.length<a.length?' ('+yf.length+')':''),'heartf',()=>{
    const s=new Set(yf.map(key));favs=favs.filter(k=>!s.has(k));saveFavs();syncFav();exitSel();render();
    toast(nCan(yf.length)+(yf.length==1?' quitada':' quitadas')+' de favoritas')}]);
  it.push(['Agregar a una playlist','list',()=>openSheet('Agregar a playlist',[
    ...pls.map(p=>[p.name,'list',()=>selAddPl(p,a)]),
    ['Nueva playlist…','plus',()=>{const p=newPl();if(p)selAddPl(p,a)}]])]);
  const cp=view.startsWith('pl:')&&pls.find(p=>p.id==view.slice(3));
  if(cp&&cp.items.some(k=>ks.has(k)))it.push(['Quitar de esta playlist','close',()=>{
    cp.items=cp.items.filter(k=>!ks.has(k));savePls();exitSel();render();toast('Quitadas de '+cp.name)}]);
  if(rem.length)it.push([rem.length>1?'Descargar '+rem.length+' canciones (ZIP)':'Descargar al dispositivo','dlf',()=>{exitSel();downloadMany(rem)}]);
  if(loc.length)it.push(['Eliminar importadas ('+loc.length+')','trash',async()=>{
    if(!confirm('¿Eliminar '+nCan(loc.length)+' importada'+(loc.length==1?'':'s')+' de este dispositivo?'))return;
    exitSel();for(const t of loc){const i=tracks.indexOf(t);if(i>=0)await delTrack(i)}toast('Importadas eliminadas')}]);
  openSheet(a.length==1?'1 canción seleccionada':a.length+' canciones seleccionadas',it);
}

Object.assign(A,{
  sel:()=>{enterSel();toast('Toca las canciones para elegirlas')},
  selx:exitSel,
  selall:()=>{const v=visTracks();if(!v.length)return;const all=v.every(t=>sel.has(t));v.forEach(t=>all?sel.delete(t):sel.add(t));selUI()},
  selact:selActions
});

/* ---------- Gestos ---------- */
{
  const L=$('list');let tm=0,x0=0,y0=0,row=null;
  /* un clic nuevo siempre empieza con un toque nuevo: se olvida la supresión anterior */
  L.addEventListener('pointerdown',()=>{lpSup=false},true);
  /* primero: el clic que sigue a una pulsación larga no debe activar ni desactivar la fila */
  L.addEventListener('click',e=>{if(lpSup){lpSup=false;e.stopImmediatePropagation();e.preventDefault()}},true);
  /* en modo selección, tocar una canción la marca (no la reproduce) */
  L.addEventListener('click',e=>{
    if(!selMode)return;
    const r=e.target.closest('.t[data-i],.ci[data-i]');
    if(r){e.stopPropagation();e.preventDefault();const t=tracks[+r.dataset.i];if(t)toggleSel(t);return}
    if(e.target.closest('[data-a="rand"]')){e.stopPropagation();e.preventDefault()}
  },true);
  /* pulsación larga = empezar a seleccionar */
  L.addEventListener('pointerdown',e=>{
    if(selMode||(e.pointerType=='mouse'&&e.button!=0))return;
    const r=e.target.closest('.t[data-i]');if(!r||e.target.closest('button,.lk,input,.gp'))return;
    row=r;x0=e.clientX;y0=e.clientY;clearTimeout(tm);
    tm=setTimeout(()=>{tm=0;const t=row&&tracks[+row.dataset.i];if(!t)return;lpSup=true;enterSel(t);try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}},520);
  });
  L.addEventListener('pointermove',e=>{if(tm&&Math.hypot(e.clientX-x0,e.clientY-y0)>9){clearTimeout(tm);tm=0}});
  ['pointerup','pointercancel'].forEach(ev=>L.addEventListener(ev,()=>{clearTimeout(tm);tm=0}));
  /* clic derecho en el ordenador */
  L.addEventListener('contextmenu',e=>{
    const r=e.target.closest('.t[data-i]');if(!r)return;
    e.preventDefault();clearTimeout(tm);tm=0;const t=tracks[+r.dataset.i];if(t){lpSup=true;enterSel(t)}
  });
}
