/* ---------- Cola, playlists, compartir y caché ---------- */
let queue=[],view='lib',pls=[],sheetFns=[];
try{pls=JSON.parse(localStorage.getItem('pls')||'[]')}catch(e){}
const savePls=()=>localStorage.setItem('pls',JSON.stringify(pls));
let favs=[];try{favs=JSON.parse(localStorage.getItem('favs')||'[]')}catch(e){}
let vstack=[],homeTab='lib',heroMiss=false,heroTm=0;
const isGrp=v=>/^(ar|al):/.test(v);
const tabName=v=>isGrp(v)?homeTab:v.startsWith('pl')?'pls':v;
/* listas "virtuales" para reproducir en contexto: favoritas, artista y álbum */
const getPl=id=>{id=String(id);
  if(id=='fav')return{id,name:'Favoritas',get items(){return favs}};
  if(isGrp(id))return{id,name:id.slice(3),items:grpOrdered(id).map(key)};
  return pls.find(p=>p.id==id)};
const key=t=>String(t.id);
const plTracks=id=>{const p=getPl(id);if(!p)return[];const m=new Map(tracks.map(t=>[key(t),t]));return p.items.map(k=>m.get(String(k))).filter(Boolean)};
const base=()=>location.href.split('#')[0];
const qchg=()=>{updTabs();if(view=='queue')render()};
async function copy(s){
  try{await navigator.clipboard.writeText(s);return true}catch(e){
    const a=document.createElement('textarea');a.value=s;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();return ok}
}
async function shareT(t,time){
  const p=new URLSearchParams({c:t.sid||t.name});
  if(time&&tracks[cur]===t&&au.currentTime>1)p.set('t',Math.floor(au.currentTime));
  toast(await copy(base()+'#'+p)?'Enlace copiado: '+t.title:'No se pudo copiar el enlace');
}
async function sharePl(id){
  const p=getPl(id);if(!p)return;
  const sids=p.items.filter(k=>String(k).startsWith('srv:')).map(k=>k.slice(4));
  if(!sids.length){toast('Esta lista solo tiene canciones importadas y no se puede compartir');return}
  /* formato corto: #p=Nombre&s=<11 caracteres por canción> */
  const ok=await copy(base()+'#'+new URLSearchParams({p:p.name,s:sids.map(h64).join('')}));
  toast(ok?(sids.length<p.items.length?'Enlace copiado (sin las canciones importadas)':'Enlace de la playlist copiado'):'No se pudo copiar el enlace');
}
function openSheet(title,items){
  sheetFns=items.map(i=>i[2]);$('sht').textContent=title;
  $('shb').innerHTML=items.map((it,k)=>`<button class="sb" data-sf="${k}">${ic(it[1],20)}${esc(it[0])}</button>`).join('');$('sheet').hidden=false;
}
$('sheet').onclick=e=>{
  if(e.target.id=='sheet'){$('sheet').hidden=true;return}
  const b=e.target.closest('[data-sf]');if(b){const f=sheetFns[+b.dataset.sf];$('sheet').hidden=true;f()}
};
function newPl(){
  const n=(prompt('Nombre de la playlist')||'').trim();if(!n)return null;
  const p={id:'p'+Date.now(),name:n,items:[]};pls.push(p);savePls();if(view=='pls')render();return p;
}
function addPl(p,t){if(p.items.includes(key(t)))toast('Ya estaba en '+p.name);else{p.items.push(key(t));savePls();toast('Agregada a '+p.name)}}
function plPick(t){openSheet('Agregar a playlist',[...pls.map(p=>[p.name,'list',()=>addPl(p,t)]),['Nueva playlist…','plus',()=>{const p=newPl();if(p)addPl(p,t)}]])}
function playList(arr,s,id){if(s<0||!arr.length)return;queue=arr.slice(s+1);plCtx={id,keys:new Set(arr.map(key)),done:false};rndNext=null;load(tracks.indexOf(arr[s]),true);qchg()}
function playPl(id){const a=plTracks(id);a.length?playList(a,0,id):toast('La playlist está vacía')}
async function rowMenu(i){
  const t=tracks[i];if(!t)return;
  if(t.remote)await Promise.race([remoteTags(t),new Promise(r=>setTimeout(r,1500))]); /* para conocer artista/álbum */
  const fv=isFav(t);
  const it=[['Reproducir siguiente','next',()=>{queue.unshift(t);qchg();toast('Se reproducirá a continuación')}],
    ['Agregar a la cola','plus',()=>{queue.push(t);qchg();toast('Agregada a la cola')}],
    [fv?'Quitar de favoritos':'Agregar a favoritos',fv?'heartf':'heart',()=>toggleFav(t)],
    ['Agregar a una playlist','list',()=>plPick(t)],
    ['Seleccionar varias','check',()=>enterSel(t)]];
  if(t.artist)it.push(['Ir al artista','user',()=>openGroup('ar:'+t.artist)]);
  if(t.album)it.push(['Ir al álbum','disc',()=>openGroup('al:'+t.album)]);
  if(view.startsWith('pl:'))it.push(['Quitar de esta playlist','close',()=>{const p=getPl(view.slice(3));p.items=p.items.filter(k=>k!=key(t));savePls();render()}]);
  it.push(['Compartir canción','share',()=>shareT(t,false)]);
  if(t.remote)it.push(['Descargar al dispositivo','dlf',()=>downloadTrack(t)]);
  if(!t.remote)it.push(['Eliminar importada','trash',()=>delTrack(i)]);
  openSheet(t.title,it);
}
function plMenu(id){
  const p=getPl(id);if(!p)return;
  openSheet(p.name,[['Reproducir','next',()=>playPl(id)],['Compartir playlist','share',()=>sharePl(id)],
    ['Renombrar','edit',()=>{const n=(prompt('Nuevo nombre',p.name)||'').trim();if(n){p.name=n;savePls();render()}}],
    ['Eliminar playlist','trash',()=>{if(confirm('¿Eliminar la playlist "'+p.name+'"?')){pls=pls.filter(x=>x!==p);savePls();if(view=='pl:'+id)view='pls';render()}}]]);
}
Object.assign(A,{share:()=>{const t=tracks[cur];t?shareT(t,true):toast('No hay canción seleccionada')},newpl:newPl,
  plback:()=>{view='pls';render()},plplay:()=>playPl(view.slice(3)),plshare:()=>sharePl(view.slice(3)),qclear:()=>{queue=[];qchg();render()}});
$('tabs').onclick=e=>{const b=e.target.closest('[data-v]');if(b){view=b.dataset.v;vstack=[];recFor='';render()}};
async function applyHash(){
  const H=new URLSearchParams(location.hash.slice(1));
  const pl=H.get('pl'),pn=H.get('p'),ps=H.get('s');
  const mkPl=(name,items,total)=>{
    if(!items.length){toast('Ninguna canción de esa playlist está en esta biblioteca');return}
    let p=pls.find(x=>x.name==name&&x.items.join('|')==items.join('|'));
    if(!p){p={id:'p'+Date.now(),name,items};pls.push(p);savePls();toast('Playlist importada: '+name+(items.length<total?` (${items.length} de ${total})`:''))}
    view='pl:'+p.id;render()};
  if(pn!=null&&ps){try{ /* formato corto */
    const m=new Map(tracks.filter(t=>t.remote).map(t=>[h64(t.sid),t.sid])),items=[],tot=Math.floor(ps.length/11);
    for(let i=0;i+11<=ps.length;i+=11){const sid=m.get(ps.slice(i,i+11));if(sid!=null)items.push('srv:'+sid)}
    mkPl(pn,items,tot)}catch(e){}}
  else if(pl){try{ /* formato antiguo (nombres completos): se sigue aceptando */
    const o=JSON.parse(pl);mkPl(o.n,o.s.map(n=>'srv:'+n),o.s.length)}catch(e){}}
  const c=H.get('c');if(!c)return false;
  const k=tracks.findIndex(t=>(t.sid||t.name)==c||t.name==c);if(k<0)return false;
  restore=H.get('t')?+H.get('t'):(localStorage.getItem('last')==key(tracks[k])?+localStorage.getItem('pos')||null:null);
  await load(k,false,false);return true;
}

/* ---------- Recientes, más escuchadas y recomendaciones ---------- */
let stats={},plCtx=null,rndNext=null,recFor='',recs=[],counted=false,pt=0;
try{stats=JSON.parse(localStorage.getItem('stats')||'{}')}catch(e){}
const saveStats=()=>{try{localStorage.setItem('stats',JSON.stringify(stats))}catch(e){}};
function bump(t){if(!t)return;const s=stats[key(t)]||(stats[key(t)]={n:0,ts:0});s.n++;s.ts=Date.now();saveStats();if(view=='recent')render()}
function renderRecent(L){
  const m=new Map(tracks.map(t=>[key(t),t]));
  const ent=Object.entries(stats).map(([k,s])=>({tr:m.get(k),n:s.n,ts:s.ts})).filter(e=>e.tr&&e.n>0);
  const car=L.querySelector('.car'),sl=car?car.scrollLeft:0;
  if(!ent.length){L.innerHTML='<div class="bar2"><b>Reproducidas recientemente</b></div><div id="empty">Aún no has reproducido canciones.<br>Aquí verás las últimas y las más escuchadas.</div>';return}
  const rec=[...ent].sort((a,b)=>b.ts-a.ts).slice(0,5),top=[...ent].sort((a,b)=>b.n-a.n||b.ts-a.ts).slice(0,10);
  L.innerHTML=`<div class="bar2"><b>Reproducidas recientemente</b><span class="sp"></span><button data-a="clrstats">Limpiar</button></div>`+rec.map(e=>rowH({t:e.tr,i:tracks.indexOf(e.tr),c:e.n})).join('')+
    `<div class="bar2"><b>Más escuchadas</b></div><div class="car">`+top.map((e,r)=>`<div class="ci${sel.has(e.tr)?' sel':''}" data-i="${tracks.indexOf(e.tr)}"><img class="cv" src="${e.tr.thumbL||e.tr.thumb||GIF}" alt=""><b>${esc(e.tr.title)}</b><small>#${r+1} · ${e.n}×</small></div>`).join('')+`</div>`;
  const c2=L.querySelector('.car');if(c2)c2.scrollLeft=sl;
  top.forEach(e=>wantBig(e.tr));
  L.querySelectorAll('[data-i]').forEach(el=>io.observe(el));
}
function getRecs(id){
  const p=getPl(id);if(!p)return[];const inP=new Set(p.items);
  if(recFor!==id){recs=[];recFor=id}
  recs=recs.filter(t=>tracks.includes(t)&&!inP.has(key(t)));
  if(recs.length<5){
    const pool=tracks.filter(t=>!inP.has(key(t))&&!recs.includes(t));
    for(let i=pool.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[pool[i],pool[j]]=[pool[j],pool[i]]}
    recs=recs.concat(pool.slice(0,5-recs.length));
  }
  return recs;
}
function plRandom(){
  if(!plCtx)return null;
  if(!rndNext||!tracks.includes(rndNext)||rndNext===tracks[cur]||plCtx.keys.has(key(rndNext))){
    const pool=tracks.filter(t=>t!==tracks[cur]&&!plCtx.keys.has(key(t)));
    rndNext=pool.length?pool[Math.random()*pool.length|0]:null;
  }
  return rndNext;
}
Object.assign(A,{recr:()=>{recs=[];render()},clrstats:()=>{if(confirm('¿Borrar el historial de reproducciones?')){stats={};saveStats();render()}}});

