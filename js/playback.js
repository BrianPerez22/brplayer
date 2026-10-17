/* ---------- Reproducción ---------- */
let loadTok=0;
async function load(i,play,push=true){
  if(i<0||i>=tracks.length)return;
  const t=tracks[i],tok=++loadTok;seekUntil=0;clearTimeout(seekTm);restoreR=null;
  if(push&&cur>=0&&cur!=i){hist.push(tracks[cur]);if(hist.length>200)hist.shift()}
  if(shufQ)shufQ=shufQ.filter(x=>x!==t);
  cur=i;
  if(url){URL.revokeObjectURL(url);url=null}
  let src=t.url;
  if(t.remote){
    if(window.caches){try{const m=await caches.match(t.url);if(m){const u=URL.createObjectURL(await m.blob());if(tok!==loadTok){URL.revokeObjectURL(u);return}url=u;src=u;t.cached=1}}catch(e){}}
    if(tok!==loadTok)return;
  }else{url=URL.createObjectURL(t.blob);src=url}
  au.src=src;au.loop=repeat==2;counted=false;
  if(play){const p=au.play();if(p)p.catch(()=>{})}
  render();await updateNow();
  const el=document.querySelector('.t.on');if(el&&play)el.scrollIntoView({block:'nearest'});
  try{history.replaceState(null,'','#'+new URLSearchParams({c:t.name}))}catch(e){}
  localStorage.setItem('last',t.id);
  t.th=0;ensureThumb(t,true);schedOff();
  setTimeout(()=>{if(tracks[cur]!==t)return;const n=peek();(n?cacheTrack(n):Promise.resolve()).then(()=>tracks[cur]===t&&cacheTrack(t))},1500);
}
async function updateNow(){
  const t=tracks[cur];
  const tt=t?t.title:'Sin reproducción',ta=t?subH(t):esc(loading?'Cargando biblioteca…':'Elige una canción');
  $('tt').textContent=$('ftt').textContent=tt;$('ta').innerHTML=$('fta').innerHTML=ta;syncFav();
  const a=t?await artURL(t.cover):null;
  if(tracks[cur]!==t)return;
  $('cv').src=$('fcv').src=a||GIF;
  if('mediaSession' in navigator){
    navigator.mediaSession.metadata=t?new MediaMetadata({title:t.title,artist:t.artist,album:t.album,artwork:a?[{src:a,sizes:'512x512',type:'image/jpeg'}]:[]}):null;
  }
}
/* Aleatorio: ronda sin repeticiones; Repetir: 0 no, 1 lista, 2 canción */
function mkQ(){const a=tracks.filter(t=>t!==tracks[cur]);for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}shufQ=a}
function pick(auto){
  const n=tracks.length;if(!n)return -1;
  while(queue.length){const q=queue.shift(),k=tracks.indexOf(q);if(k>=0){qchg();return k}}
  if(plCtx&&!repeat){const r=plRandom();if(r){rndNext=null;if(!plCtx.done){plCtx.done=true;toast('Lista terminada: sigue música aleatoria')}return tracks.indexOf(r)}}
  if(plCtx&&repeat==1){const a=plTracks(plCtx.id);if(a.length){queue=a.slice(1);qchg();return tracks.indexOf(a[0])}}
  if(shuffle&&n>1){
    if(shufQ)shufQ=shufQ.filter(t=>tracks.includes(t)&&t!==tracks[cur]);
    if(!shufQ||!shufQ.length){if(shufQ&&auto&&!repeat)return -1;mkQ()}
    return tracks.indexOf(shufQ.shift());
  }
  let i=cur+1;
  if(i>=n){if(repeat==1||!auto)i=0;else return -1}
  return i;
}
function next(auto){
  const i=pick(auto);
  if(i<0){au.pause();if(!shuffle)load(0,false);return}
  load(i,true);
}
function prev(){
  if(au.currentTime>3){au.currentTime=0;return}
  while(hist.length){const t=hist.pop(),i=tracks.indexOf(t);if(i>=0){load(i,true,false);return}}
  load(cur>0?cur-1:tracks.length-1,true,false);
}
function toggle(){
  if(cur<0&&tracks.length){load(0,true);return}
  if(au.paused){const p=au.play();if(p)p.catch(()=>{})}else au.pause();
}
function rand(){
  if(!tracks.length)return;plCtx=null;rndNext=null;
  let n=0;if(tracks.length>1)do{n=Math.random()*tracks.length|0}while(n==cur);
  load(n,true);
}
function moveBall(){const o=$('orb'),b=$('ball');b.style.left=(6+Math.random()*Math.max(0,o.clientWidth-b.offsetWidth-12))+'px'}
async function showInfo(){
  const t=tracks[cur];if(!t){toast('No hay canción seleccionada');return}
  if(t.remote){await remoteHead(t);await remoteTags(t)}
  const ext=(t.name.split('.').pop()||'').toLowerCase(),d=au.duration;
  const rows=[['Título',t.title],['Artista',t.artist],['Álbum',t.album],['Archivo',t.name],['Formato',ext.toUpperCase()],['Tipo MIME',t.mime||MIME[ext]],['Tamaño',t.size?fsz(t.size):''],['Duración',isFinite(d)&&d?fmt(d):''],['Bitrate aprox.',t.size&&d?Math.round(t.size*8/d/1000)+' kbps':''],['Fecha del archivo',t.date?new Date(t.date).toLocaleString('es'):''],['Origen',t.remote?'Servidor':'Importada en este dispositivo'],['Dirección',t.remote?t.url:''],['En caché (sin conexión)',t.remote?(t.cached?'Sí':'No'):''],['Carátula',t.cover?(t.cover.type||'imagen')+' · '+fsz(t.cover.size):'Sin carátula'],...Object.entries(t.meta||{})];
  $('ib').innerHTML=rows.filter(r=>r[1]!==''&&r[1]!=null).map(r=>`<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('');
  $('inf').hidden=false;
}
const A={
  hm:()=>{$('hm').hidden=!$('hm').hidden},add:()=>$('file').click(),pp:toggle,next:()=>next(false),prev,rand,sort:toggleMenu,info:showInfo,clr,ball:()=>tapBall(),
  shuf:()=>{shuffle=!shuffle;shufQ=null;sync();toast(shuffle?'Aleatorio activado':'Aleatorio desactivado')},
  rep:()=>{repeat=(repeat+1)%3;au.loop=repeat==2;sync();toast(['Repetir: desactivado','Repetir toda la lista','Repetir esta canción'][repeat])},
  fs:()=>{$('fs').hidden=false},fsx:()=>{$('fs').hidden=true},infx:()=>{$('inf').hidden=true}
};
document.addEventListener('click',e=>{
  if(!e.target.closest('#menu,#sortb'))$('menu').hidden=true;
  if(!e.target.closest('#hb'))$('hm').hidden=true;
  const lk=e.target.closest('[data-ar],[data-al]');
  if(lk){openGroup(lk.dataset.ar!=null?'ar:'+lk.dataset.ar:'al:'+lk.dataset.al);return}
  if(e.target.id=='inf'){$('inf').hidden=true;return}
  const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a])A[b.dataset.a]();
});

au.onplay=()=>{setPP(true);if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing'};
au.onpause=()=>{setPP(false);if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused'};
au.onended=()=>{if(repeat==2){au.currentTime=0;au.play()}else next(true)};
au.onplaying=()=>{errN=0;if(!counted&&cur>=0){counted=true;bump(tracks[cur])}};
au.onerror=()=>{if(cur<0)return;toast('No se puede reproducir: '+tracks[cur].name);if(++errN>3){toast('Varios errores seguidos: reproducción detenida');return}if(tracks.length>1)setTimeout(()=>next(true),800)};
au.onloadedmetadata=()=>{document.querySelectorAll('.td').forEach(e=>e.textContent=fmt(au.duration));if(restore!=null){au.currentTime=restore;restore=null}if(restoreR!=null&&okDur(au.duration)){au.currentTime=restoreR*au.duration;restoreR=null}pos()};
let lastSave=0;
au.ontimeupdate=()=>{
  if(repeat==2&&au.duration&&pt>au.duration-3&&au.currentTime<3)bump(tracks[cur]);pt=au.currentTime;
  if(dragging&&performance.now()-dragT>30000)dragging=false; /* seguro: nunca se queda bloqueada */
  if(!dragging&&performance.now()>seekUntil)syncSk();
  const n=Date.now();if(n-lastSave>2000){lastSave=n;localStorage.setItem('pos',au.currentTime);pos()}
};
function pos(){
  if('mediaSession' in navigator&&isFinite(au.duration)&&au.duration>0){
    try{navigator.mediaSession.setPositionState({duration:au.duration,playbackRate:au.playbackRate||1,position:Math.min(au.currentTime,au.duration)})}catch(e){}
  }
}
/* ---------- Línea de tiempo ----------
   Antes el salto dependía solo del evento `change` del input: no se dispara si sueltas en el mismo valor o se
   interrumpe el gesto, y `dragging` quedaba en true (barra y tiempo congelados). Ahora el gesto se gestiona con
   pointer events: tocar la pista salta, arrastrar la bolita desplaza, y siempre se cierra al soltar/cancelar. */
const SKS=[...document.querySelectorAll('.sk')];
let dragT=0,seekUntil=0,seekTm=0,restoreR=null,seekFixing=0;
const okDur=d=>isFinite(d)&&d>0;
function syncSk(){const d=au.duration,v=okDur(d)?au.currentTime/d*1000:0;SKS.forEach(s=>{s.value=v;s.style.setProperty('--p',v/10+'%')});const x=fmt(au.currentTime);document.querySelectorAll('.tc').forEach(s=>s.textContent=x)}
function skUI(v){SKS.forEach(s=>{s.value=v;s.style.setProperty('--p',v/10+'%')});if(okDur(au.duration)){const x=fmt(v/1000*au.duration);document.querySelectorAll('.tc').forEach(s=>s.textContent=x)}try{SKFX.once()}catch(e){}}
const inSeek=x=>{const r=au.seekable;for(let i=0;i<r.length;i++)if(x>=r.start(i)-.5&&x<=r.end(i)+.5)return true;return false};
function seekTo(sec){
  const t=tracks[cur];if(!t||!isFinite(sec))return;
  const d=au.duration;sec=okDur(d)?Math.min(Math.max(0,sec),Math.max(0,d-.25)):Math.max(0,sec);
  /* servidor sin soporte de rangos: el navegador no puede saltar a lo no descargado -> se baja el archivo y se continúa desde ahí */
  if(t.remote&&!url&&au.readyState>=1&&!inSeek(sec)){seekFix(t,sec);return}
  seekUntil=performance.now()+1500;
  try{au.currentTime=sec}catch(e){}
  pos();clearTimeout(seekTm);let n=0;
  const chk=()=>{if(tracks[cur]!==t||au.loop||au.ended)return;
    if(au.seeking&&n++<3){seekTm=setTimeout(chk,1200);return}
    if(Math.abs(au.currentTime-sec)>4&&!inSeek(sec))seekFix(t,sec);else syncSk()};
  seekTm=setTimeout(chk,1200);
}
async function seekFix(t,sec){
  if(!t.remote||url||seekFixing)return;seekFixing=1;const was=!au.paused;
  try{
    toast('Descargando la canción para poder saltar…');
    if(caching.has(t)){while(caching.has(t))await new Promise(r=>setTimeout(r,300))}else await cacheTrack(t);
    if(tracks[cur]!==t)return;
    const m=window.caches&&await caches.match(t.url);
    if(!m){toast('El servidor no permite saltar en esta canción');syncSk();return}
    const u=URL.createObjectURL(await m.blob());
    if(tracks[cur]!==t||url){URL.revokeObjectURL(u);return}
    url=u;t.cached=1;restore=sec;seekUntil=performance.now()+2500;au.src=u;au.loop=repeat==2;
    if(was){const p=au.play();if(p)p.catch(()=>{})}
  }catch(e){}finally{seekFixing=0}
}
au.addEventListener('seeked',()=>{seekUntil=0;if(!dragging)syncSk()});
document.querySelectorAll('.skw').forEach(w=>{
  const sk=w.querySelector('.sk');let id=null,grab=0,thumb=false,x0=0,moved=false,last=0;
  const val=e=>{const r=sk.getBoundingClientRect(),W=Math.max(1,r.width-16);return Math.round(Math.min(1,Math.max(0,(e.clientX+grab-r.left-8)/W))*1000)};
  w.addEventListener('pointerdown',e=>{
    if(id!=null||(e.pointerType=='mouse'&&e.button!=0))return;
    const r=sk.getBoundingClientRect(),tx=r.left+8+sk.value/1000*(r.width-16);
    thumb=Math.hypot(e.clientX-tx,e.clientY-(r.top+r.height/2))<=14;e._skThumb=thumb; /* lo lee la animación de la barra */
    grab=thumb?tx-e.clientX:0;id=e.pointerId;x0=e.clientX;moved=false;dragging=true;dragT=performance.now();
    try{w.setPointerCapture(id)}catch(_){}
    last=thumb?+sk.value:val(e);if(!thumb)skUI(last);
  });
  w.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;if(Math.abs(e.clientX-x0)>3)moved=true;dragT=performance.now();last=val(e);skUI(last)});
  const end=(e,commit)=>{
    if(e.pointerId!==id)return;id=null;dragging=false;try{w.releasePointerCapture(e.pointerId)}catch(_){}
    if(commit&&(moved||!thumb)){if(okDur(au.duration))seekTo(last/1000*au.duration);else restoreR=last/1000}
    else syncSk();
  };
  w.addEventListener('pointerup',e=>end(e,true));
  w.addEventListener('pointercancel',e=>end(e,false));
  w.addEventListener('lostpointercapture',e=>{if(id!=null&&e.pointerId===id){id=null;dragging=false;syncSk()}});
  /* teclado (flechas): input = vista previa, change = salto */
  sk.addEventListener('input',()=>skUI(+sk.value));
  sk.addEventListener('change',()=>{if(okDur(au.duration))seekTo(sk.value/1000*au.duration)});
});

/* ---------- Pantalla de bloqueo / auriculares ---------- */
if('mediaSession' in navigator){
  const ms=navigator.mediaSession,h=(a,f)=>{try{ms.setActionHandler(a,f)}catch(e){}};
  h('play',()=>au.play());h('pause',()=>au.pause());
  h('previoustrack',prev);h('nexttrack',()=>next(false));
  h('seekbackward',d=>seekTo(au.currentTime-(d.seekOffset||10)));
  h('seekforward',d=>seekTo(au.currentTime+(d.seekOffset||10)));
  h('seekto',d=>seekTo(d.seekTime));
  h('stop',()=>{au.pause();au.currentTime=0});
}

