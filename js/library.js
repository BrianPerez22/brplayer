/* ---------- Biblioteca del servidor: actualizar, reconectar archivos renombrados y app sin conexión ---------- */
let km={},KN=new Set(),kmTm=0,lastRef=Date.now(),refBusy=0;
try{km=JSON.parse(localStorage.getItem('km')||'{}')}catch(e){}
try{KN=new Set(JSON.parse(localStorage.getItem('ksn')||'[]'))}catch(e){}
const saveKm=()=>{clearTimeout(kmTm);kmTm=setTimeout(()=>{try{localStorage.setItem('km',JSON.stringify(km))}catch(e){}},1500)};
const isUsed=k=>favs.includes(k)||!!stats[k]||pls.some(p=>p.items.includes(k));
/* km guarda nombre y tamaño solo de las canciones con datos del usuario (favoritas, playlists, estadísticas) */
function kmPut(t){
  if(!t||!t.remote||!(t.size>0)||!isUsed(t.id))return;
  const c=km[t.id];if(c&&c[0]==t.name&&c[1]==t.size)return;
  km[t.id]=[t.name,t.size];saveKm();
}

/* Cambia la clave de una canción en favoritos, playlists, estadísticas y etiquetas */
function remapKey(old,nw){
  const rm=a=>[...new Set(a.map(k=>k==old?nw:k))];
  favs=rm(favs);saveFavs();
  pls.forEach(p=>{p.items=rm(p.items)});savePls();
  if(stats[old]){const s=stats[old],e=stats[nw];stats[nw]=e?{n:e.n+s.n,ts:Math.max(e.ts,s.ts)}:s;delete stats[old];saveStats()}
  const so=old.slice(4),sn=nw.slice(4);
  if(tagc[so]){if(!tagc[sn])tagc[sn]=tagc[so];delete tagc[so];try{localStorage.setItem('tagc',JSON.stringify(tagc))}catch(e){}}
  if(localStorage.getItem('last')==old)try{localStorage.setItem('last',nw)}catch(e){}
  km[nw]=km[old];delete km[old];saveKm();
}

/* Si un archivo se renombra en el servidor (y no hay `id`), se reconoce por su tamaño exacto, siempre que sea único */
async function relink(gone,fresh){
  const need=fresh.filter(t=>!(t.size>0)).slice(0,300);
  if(need.length)await Promise.all(need.map(t=>new Promise(r=>qadd(()=>remoteHead(t).then(r,r),true))));
  const cnt=(a,f)=>{const m=new Map();a.forEach(x=>{const k=f(x);m.set(k,(m.get(k)||0)+1)});return m};
  const sized=fresh.filter(t=>t.size>0),gs=cnt(gone,k=>km[k][1]),fs=cnt(sized,t=>t.size);let n=0;
  for(const k of gone){
    const sz=km[k][1],c=sized.filter(t=>t.size==sz);
    if(gs.get(sz)==1&&fs.get(sz)==1&&c.length==1){remapKey(k,c[0].id);n++}
  }
  if(n){render();toast(n==1?'Se reconectó 1 canción renombrada en el servidor':'Se reconectaron '+n+' canciones renombradas en el servidor')}
}

/* Se ejecuta tras cargar la lista del servidor (al abrir y al actualizar) */
async function afterServer(list){
  if(!list||!list.length)return;
  try{
    const fresh=list.filter(t=>!KN.has(h64(t.sid)));
    list.forEach(t=>KN.add(h64(t.sid)));
    try{localStorage.setItem('ksn',JSON.stringify([...KN]))}catch(e){}
    const have=new Set(list.map(t=>t.id));list.forEach(kmPut);
    const used=new Set([...favs,...Object.keys(stats),...pls.flatMap(p=>p.items)].map(String).filter(k=>k.startsWith('srv:')));
    const gone=[...used].filter(k=>!have.has(k)&&km[k]);
    if(gone.length&&fresh.length)await relink(gone,fresh);
    /* se anota el tamaño de las canciones con datos del usuario para poder reconectarlas si se renombran */
    list.forEach(t=>{if(used.has(t.id)&&!t.size&&!(km[t.id]&&km[t.id][1]))qadd(()=>remoteHead(t).then(()=>kmPut(t)))});
  }catch(e){}
}

/* Mezcla la lista nueva con la actual sin perder carátulas ni la canción que suena */
function mergeServer(list){
  const old=new Map(tracks.filter(t=>t.remote).map(t=>[t.id,t])),c=tracks[cur];let added=0;
  const out=list.map(n=>{
    const o=old.get(n.id);if(!o){added++;return n}
    o.name=n.name;o.url=n.url;if(n.date)o.date=n.date;if(n.size)o.size=n.size;
    if(n.srvTags){o.title=n.title;o.artist=n.artist;o.album=n.album;o.trk=n.trk;o.tc=1;o.srvTags=1;o.coverUrl=n.coverUrl}
    return o});
  if(c&&c.remote&&!out.includes(c))out.push(c);
  const removed=[...old.values()].filter(t=>!out.includes(t)).length;
  tracks=out.concat(tracks.filter(t=>!t.remote));
  return{added,removed};
}
async function refreshLib(silent){
  if(refBusy)return;refBusy=1;
  try{
    if(!silent)toast('Actualizando biblioteca…');
    const list=await loadServer();
    if(srvStale){if(!silent)toast('Sin conexión con el servidor');return}
    srvErr='';loading=false;
    const r=mergeServer(list);
    await applySort();afterServer(list);
    const pl=(n,s,p)=>n+' '+(n==1?s:p);
    if(r.added||r.removed){
      if(silent&&!r.added)return;
      toast([r.added&&pl(r.added,'canción nueva','canciones nuevas'),!silent&&r.removed&&pl(r.removed,'quitada','quitadas')].filter(Boolean).join(' · '))
    }else if(!silent)toast('La biblioteca ya está al día');
  }catch(e){
    srvErr=(e&&e.message)||'error';
    if(!silent)toast('No se pudo actualizar la biblioteca');
    if(!tracks.length)render();
  }finally{refBusy=0;lastRef=Date.now()}
}
/* al volver a la app tras un rato, se buscan canciones nuevas en silencio */
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRef>600000)refreshLib(true)});
Object.assign(A,{refl:()=>refreshLib(false),retry:()=>refreshLib(false)});

/* ---------- App sin conexión: service worker (solo con HTTPS / localhost) ---------- */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
}

/* ---------- Modo sin conexión: sin internet, solo suenan las canciones locales ---------- */
function updOff(){const l=$('offl');if(l)l.textContent='Modo sin conexión automático: '+(offMode?(isOff()?'activo ahora':'sí'):'no')}
function offApply(){
  updOff();render();
  if(!offMode||!isOff())return;
  const t=tracks[cur];
  /* si suena una del servidor en streaming (no guardada en el dispositivo), se pasa a una local */
  if(t&&t.remote&&!url){
    const was=!au.paused;au.pause();const i=pick(false);
    if(i>=0){load(i,was);toast('Sin conexión: se reproducen solo canciones locales')}
    else toast('Sin conexión: no hay canciones locales para reproducir');
  }else toast('Sin conexión: solo canciones locales');
}
addEventListener('offline',()=>{offApply()});
addEventListener('online',()=>{updOff();render();if(offMode){toast('Conexión restablecida');refreshLib(true)}});
Object.assign(A,{
  offm:()=>{offMode=!offMode;try{localStorage.setItem('offm',offMode?'1':'0')}catch(e){}
    $('hm').hidden=true;
    if(offMode&&isOff())offApply();else{updOff();render();toast(offMode?'Automático: sin internet solo sonarán las canciones locales; con internet vuelve todo':'Modo sin conexión automático desactivado')}},
  offf:()=>setOnlyOff(false)
});
{const hm=A.hm;A.hm=()=>{updOff();hm()}}
updOff();
