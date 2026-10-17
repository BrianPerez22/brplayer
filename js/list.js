/* ---------- Iconos ---------- */
const P={menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',eq:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',shuf:'<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',prev:'<path d="M6 5v14"/><path d="M19 5v14L8 12z" fill="currentColor"/>',next:'<path d="M18 5v14"/><path d="M5 5v14l11-7z" fill="currentColor"/>',play:'<path d="M7 4v16l13-8z" fill="currentColor"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',rep:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',rep1:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="m11 10 1-1v6"/>',close:'<path d="M6 6l12 12M18 6 6 18"/>',sort:'<path d="M4 7h9M4 12h6M4 17h3M17 5v14m0 0-3-3m3 3 3-3"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',down:'<path d="m6 9 6 6 6-6"/>',dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 5 5 9-10"/>',more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',back:'<path d="m15 6-6 6 6 6"/>',list:'<path d="M4 6h16M4 12h16M4 18h10"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',viz:'<path d="M4 20v-7M8 20V5M12 20v-10M16 20V3M20 20v-9"/>',full:'<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',next2:'<path d="m9 6 6 6-6 6"/>',heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',heartf:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',disc:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',dl:'<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>'};
const ic=(n,s=22)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
const FR={TPE2:'Artista del álbum',TRCK:'Pista',TPOS:'Disco',TYER:'Año',TDRC:'Año',TCON:'Género',TCOM:'Compositor',TPUB:'Editorial',TENC:'Codificado por',TSSE:'Software',TBPM:'BPM',TKEY:'Tonalidad',TLAN:'Idioma',TCOP:'Copyright',TDAT:'Fecha',TIT3:'Subtítulo',TOPE:'Artista original'};
const GIF='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const fsz=b=>(b>=1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB')+' ('+b.toLocaleString('es')+' bytes)';
const sub=t=>[t.artist,t.album].filter(Boolean).join(' · ')||t.name;
/* artista y álbum son tocables: abren su página */
const subH=t=>{const p=[];if(t.artist)p.push(`<span class="lk" data-ar="${esc(t.artist)}">${esc(t.artist)}</span>`);if(t.album)p.push(`<span class="lk" data-al="${esc(t.album)}">${esc(t.album)}</span>`);return p.length?p.join(' · '):esc(t.name)};
const cdH=t=>offOn&&t.cached?`<span class="cd">${ic('dl',13)}</span>`:'';
document.querySelectorAll('[data-ic]').forEach(e=>e.insertAdjacentHTML('afterbegin',ic(e.dataset.ic,e.dataset.s||20)));
const setPP=p=>{document.querySelectorAll('.b-pp').forEach(b=>b.innerHTML=ic(p?'pause':'play',28));$('orb').classList.toggle('play',p)};
function sync(){document.querySelectorAll('.b-shuf').forEach(b=>b.classList.toggle('on',shuffle));
  document.querySelectorAll('.b-rep').forEach(b=>{b.classList.toggle('on',repeat>0);b.innerHTML=ic(repeat==2?'rep1':'rep',+(b.dataset.s||24))})}

/* ---------- Cola de tareas (carátulas y etiquetas) ---------- */
const Q=[];let busy=0;
function qadd(fn,front){front?Q.unshift(fn):Q.push(fn);pump()}
function pump(){while(busy<3&&Q.length){busy++;Q.shift()().catch(()=>{}).finally(()=>{busy--;pump()})}}
function ensureThumb(t,front){
  if(t.th)return;t.th=1;
  qadd(async()=>{
    if(t.remote)await remoteTags(t);
    if(t.cover&&!t.thumb)t.thumb=await artURL(t.cover,160);
    updRow(t);if(tracks[cur]===t)updateNow();
  },front);
}
/* versión grande (360 px) para el carrusel de Recientes: se hace solo para las que se muestran ahí */
function wantBig(t){
  if(t.thumbL||t.thB)return;t.thB=1;
  qadd(async()=>{
    if(t.remote)await remoteTags(t);
    if(t.cover&&!t.thumbL)t.thumbL=await artURL(t.cover,360);
    updRow(t);
  },true);
}
async function remoteHead(t){
  if(t.headDone||(t.date&&t.size))return;t.headDone=1;
  try{const r=await fetch(t.url,{method:'HEAD'});if(!r.ok)return;
    const l=+r.headers.get('content-length');if(l&&!t.size)t.size=l;
    const m=Date.parse(r.headers.get('last-modified')||'');if(m&&!t.date)t.date=m;
    t.mime=t.mime||r.headers.get('content-type')||''}catch(e){}
}

/* ---------- Añadir archivos ---------- */
$('file').onchange=async e=>{
  const files=[...e.target.files];e.target.value='';let n=0;
  for(const f of files){
    if(tracks.some(t=>t.name==f.name&&t.size==f.size))continue;
    toast(`Importando ${++n}/${files.length}…`);
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    const blob=new Blob([f],{type:MIME[ext]||f.type||'audio/mpeg'});
    const tg=await readTags(f);
    const rec={name:f.name,size:f.size,blob,title:tg.title,artist:tg.artist,album:tg.album,cover:tg.cover,meta:tg.meta,date:f.lastModified,mime:blob.type};
    try{rec.id=await tx('readwrite',s=>s.add(rec))}catch(err){rec.id=Date.now()+Math.random();toast('No se pudo guardar; solo en esta sesión')}
    tracks.push(rec);if(shufQ)shufQ.splice(Math.random()*(shufQ.length+1)|0,0,rec);
    sortTracks();render();
  }
  toast(n?'Listo: '+n+' canción(es)':'Ya estaban añadidas');
  if(cur<0&&tracks.length)load(0,false);
};

/* ---------- Orden ---------- */
const SO=[['name-asc','Nombre (A–Z)'],['name-desc','Nombre (Z–A)'],['artist-asc','Artista (A–Z)'],['artist-desc','Artista (Z–A)'],['album-asc','Álbum (A–Z)'],['album-desc','Álbum (Z–A)'],['date-desc','Fecha (más reciente)'],['date-asc','Fecha (más antigua)']];
if(!SO.some(o=>o[0]==sortKey))sortKey='name-asc';
const cmp=(a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base',numeric:true});
function sortTracks(){
  const c=tracks[cur],[k,d]=sortKey.split('-'),m=d=='desc'?-1:1;
  tracks.sort((a,b)=>m*(k=='date'?(a.date||0)-(b.date||0):k=='artist'?cmp(a.artist||'~',b.artist||'~')||cmp(a.title,b.title):k=='album'?cmp(a.album||'~',b.album||'~')||(trk(a)-trk(b))||cmp(a.title,b.title):cmp(a.title,b.title)));
  cur=c?tracks.indexOf(c):-1;
}
async function applySort(){
  if(/^(album|artist)/.test(sortKey))scanTags();
  if(sortKey.startsWith('date')){
    const rem=tracks.filter(t=>t.remote&&!t.date);
    if(rem.length){toast('Obteniendo fechas…');await Promise.all(rem.map(t=>new Promise(r=>qadd(()=>remoteHead(t).then(r),true))))}
  }
  sortTracks();render();
}
function toggleMenu(){
  const m=$('menu');if(!m.hidden){m.hidden=true;return}
  m.innerHTML=SO.map(([k,l])=>`<button data-s="${k}">${l}${k==sortKey?ic('check',18):''}</button>`).join('');m.hidden=false;
}
$('menu').onclick=async e=>{
  const b=e.target.closest('[data-s]');if(!b)return;
  sortKey=b.dataset.s;localStorage.setItem('sort',sortKey);$('menu').hidden=true;
  await applySort();toast('Orden: '+SO.find(o=>o[0]==sortKey)[1]);
};

/* ---------- Lista ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);const t=tracks[+e.target.dataset.i];if(t)ensureThumb(t)}}),{rootMargin:'200px'});
const rowH=({t,i,k,c,ap,fv})=>`<div class="t${i==cur?' on':''}" data-i="${i}"${k!=null?` data-qi="${k}"`:''}><img class="cv th" src="${t.thumb||GIF}" alt=""><div class="i"><b>${esc(t.title)}${cdH(t)}</b><small>${subH(t)}</small></div>${c?`<span class="cnt">${c}×</span>`:''}${k!=null?`<button class="x" data-qr="${k}" aria-label="Quitar de la cola">${ic('close',18)}</button>`:''}${ap?`<button class="ib" data-ap="${i}" aria-label="Agregar a la playlist">${ic('plus',20)}</button>`:''}${fv?`<button class="ib on" data-fv="${i}" aria-label="Quitar de favoritas">${ic('heartf',20)}</button>`:''}<button class="ib" data-m="${i}" aria-label="Más opciones">${ic('more',20)}</button></div>`;
function listFor(){
  const q=$('q').value.toLowerCase();let a;
  if(view=='queue')a=queue.map((t,k)=>({t,i:tracks.indexOf(t),k}));
  else if(view.startsWith('pl:'))a=plTracks(view.slice(3)).map(t=>({t,i:tracks.indexOf(t)}));
  else a=tracks.map((t,i)=>({t,i}));
  return a.filter(({t,i})=>i>=0&&(!q||(t.title+t.artist+t.album+t.name).toLowerCase().includes(q)));
}
function updTabs(){
  document.querySelectorAll('#tabs [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==tabName(view)));
  $('qn').textContent=queue.length?'('+queue.length+')':'';
}
function render(){
  const L=$('list');updTabs();
  if(view=='pls'){renderFav(L);return}
  if(isGrp(view)){renderGroup(L);return}
  if(view=='recent'){renderRecent(L);return}
  let head='',msg;
  if(view=='queue'){head=`<div class="bar2"><b>Cola de reproducción</b><span class="sp"></span><button data-a="qclear">Vaciar</button></div>`;msg='La cola está vacía.<br>Usa el botón de tres puntos de una canción para agregarla.'}
  else if(view.startsWith('pl:')){const p=getPl(view.slice(3));if(!p){view='pls';render();return}
    head=`<div class="bar2"><button class="ib" data-a="plback" aria-label="Volver">${ic('back',22)}</button><b>${esc(p.name)}</b><span class="sp"></span><button data-a="plplay">${ic('play',16)}Reproducir</button><button data-a="plshare" aria-label="Compartir playlist">${ic('share',18)}</button></div>`;msg='Esta playlist está vacía.<br>Agrega canciones desde el botón de tres puntos.'}
  else if(!tracks.length)msg=loading?'Cargando biblioteca…':'No hay canciones.<br>Revisa el servidor o toca <b>Añadir</b> para importar archivos.';
  else msg='Sin resultados.';
  const a=listFor();let recH='';
  if(view.startsWith('pl:')){const rs=getRecs(view.slice(3));if(rs.length)recH=`<div class="bar2"><b>Recomendaciones</b><span class="sp"></span><button class="ib" data-a="recr" aria-label="Otras recomendaciones">${ic('dice',20)}</button></div>`+rs.map(t=>rowH({t,i:tracks.indexOf(t),ap:1})).join('')}
  if(view=='lib'&&tracks.length&&!$('q').value)head=`<div class="t" data-a="rand"><div class="plc">${ic('dice',22)}</div><div class="i"><b>Random</b><small>Canción aleatoria</small></div></div>`;
  L.innerHTML=head+(a.length?a.map(rowH).join(''):`<div id="empty">${msg}</div>`)+recH;
  L.querySelectorAll('.t[data-i]').forEach(el=>io.observe(el));
}
function updRow(t){
  const i=tracks.indexOf(t);if(i<0)return;
  document.querySelectorAll('[data-i="'+i+'"]').forEach(el=>{
    const im=el.querySelector('img');if(im)im.src=(el.classList.contains('ci')&&t.thumbL)||t.thumb||GIF;
    const b=el.querySelector('b'),isT=el.classList.contains('t');if(b){if(isT)b.innerHTML=esc(t.title)+cdH(t);else b.textContent=t.title}
    if(isT)el.querySelector('small').innerHTML=subH(t);
  });
  document.querySelectorAll('[data-ct="'+i+'"]').forEach(im=>{im.src=t.thumbL||t.thumb||GIF});
  if(heroMiss&&isGrp(view)){clearTimeout(heroTm);heroTm=setTimeout(()=>{if(isGrp(view)&&heroMiss)render()},700)}
}
$('q').oninput=render;
$('list').onclick=e=>{
  const g=s=>e.target.closest(s);let x;
  if(g('[data-ar],[data-al]'))return; /* artista / álbum: lo gestiona el listener global */
  if(x=g('[data-ap]')){const t=tracks[+x.dataset.ap],p=getPl(view.slice(3));if(t&&p){addPl(p,t);recs=recs.filter(r=>r!==t);render()}return}
  if(x=g('[data-fv]')){const t=tracks[+x.dataset.fv];if(t)toggleFav(t);return}
  if(x=g('[data-m]'))return rowMenu(+x.dataset.m);
  if(x=g('[data-qr]')){queue.splice(+x.dataset.qr,1);qchg();render();return}
  if(x=g('[data-pm]'))return plMenu(x.dataset.pm);
  if(x=g('[data-po]')){view='pl:'+x.dataset.po;recFor='';render();return}
  const r=g('[data-i]');if(!r)return;
  const t=tracks[+r.dataset.i];if(!t)return;
  const cx=ctxFor(),arr=cx?cx.arr:[],k=arr.indexOf(t);
  if(k>=0)playList(arr,k,cx.id);
  else if(view=='queue'){queue.splice(+r.dataset.qi,1);qchg();load(+r.dataset.i,true)}
  else{plCtx=null;rndNext=null;load(+r.dataset.i,true)}
};
async function delTrack(i){
  const t=tracks[i];try{await tx('readwrite',s=>s.delete(t.id))}catch(_){}
  tracks.splice(i,1);hist=hist.filter(x=>x!==t);queue=queue.filter(x=>x!==t);
  if(i==cur){au.pause();au.removeAttribute('src');cur=-1;tracks.length?load(Math.min(i,tracks.length-1),false):updateNow()}else if(i<cur)cur--;
  render();
}
async function clr(){
  if(!tracks.some(t=>!t.remote)){toast('No hay canciones importadas');return}
  if(!confirm('¿Borrar las canciones importadas en este dispositivo? La biblioteca del servidor no se toca.'))return;
  try{await tx('readwrite',s=>s.clear())}catch(_){}
  const c=tracks[cur];tracks=tracks.filter(t=>t.remote);hist=[];shufQ=null;queue=queue.filter(t=>t.remote);
  if(c&&!c.remote){au.pause();au.removeAttribute('src');cur=-1;updateNow()}else cur=c?tracks.indexOf(c):-1;
  render();
}

