/* brplayer · núcleo: estado global, utilidades, IndexedDB y biblioteca del servidor */
const $=id=>document.getElementById(id);
const au=$('au');
let loading=true,errN=0,tracks=[],cur=-1,shuffle=false,repeat=0,url=null,hist=[],shufQ=null,dragging=false,restore=null,sortKey=localStorage.getItem('sort')||'name-asc';
const MIME={mp3:'audio/mpeg',flac:'audio/flac',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',opus:'audio/ogg; codecs=opus',aif:'audio/aiff',aiff:'audio/aiff',caf:'audio/x-caf'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{if(!isFinite(s))return'0:00';s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',3000)}

/* ---------- Almacenamiento (IndexedDB) ---------- */
const db=new Promise((res,rej)=>{const r=indexedDB.open('player',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=async(mode,fn)=>{const d=await db;return new Promise((res,rej)=>{const t=d.transaction('t',mode);const r=fn(t.objectStore('t'));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})};

/* ---------- Biblioteca del servidor ---------- */
const pd=v=>{if(!v)return 0;if(typeof v=='number')return v<1e12?v*1000:v;const d=Date.parse(v);return isNaN(d)?0:d};
function splitName(n){const b=n.replace(/\.[^.]+$/,'');const k=b.indexOf(' - ');return k>0?{artist:b.slice(0,k).trim(),title:b.slice(k+3).trim()}:{artist:'',title:b}}
let tagc={};try{tagc=JSON.parse(localStorage.getItem('tagc')||'{}')}catch(e){}
let tagSv=0;
function noteTags(t){if(!t.remote)return;tagc[t.name]=[t.title,t.artist||'',t.album||'',t.trk||0];clearTimeout(tagSv);tagSv=setTimeout(()=>{try{localStorage.setItem('tagc',JSON.stringify(tagc))}catch(e){}},1500)}
async function loadServer(){
  let j;
  try{const r=await fetch('/api/canciones',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);j=await r.json();if(!Array.isArray(j))throw new Error('Formato inesperado');try{localStorage.setItem('srvlist',JSON.stringify(j))}catch(e){}}
  catch(e){j=JSON.parse(localStorage.getItem('srvlist')||'null');if(!j)throw e}
  return j.filter(s=>s&&typeof s.nombre=='string'&&s.nombre&&s.url).map(s=>{const n=splitName(s.nombre);
    const o={id:'srv:'+s.nombre,remote:true,name:s.nombre,url:s.url,title:n.title,artist:n.artist,album:'',cover:null,date:pd(s.fecha||s.date||s.mtime||s.modificado||s.modified),size:s.size||s.tamano||0};
    const c=tagc[s.nombre];if(c){o.title=c[0]||o.title;o.artist=c[1]||o.artist;o.album=c[2]||'';o.trk=c[3]||0;o.tc=1}
    return o});
}
/* Lee etiquetas y carátula de la canción actual pidiendo solo los primeros 2 MB */
function remoteTags(t){return t.tagsP||(t.tagsP=_remoteTags(t))}
async function _remoteTags(t){
  if(t.tagsDone)return;t.tagsDone=true;
  try{
    let b=null;
    if(window.caches){try{const m=await caches.match(t.url);if(m){const fb=await m.blob();if(!t.size)t.size=fb.size;b=fb.slice(0,2097152)}}catch(e){}}
    if(!b){
      const ctl=new AbortController();
      const r=await fetch(t.url,{headers:{Range:'bytes=0-2097151'},signal:ctl.signal});
      const cr=/\/(\d+)$/.exec(r.headers.get('content-range')||'');if(cr)t.size=+cr[1];
      const lm=Date.parse(r.headers.get('last-modified')||'');if(lm&&!t.date)t.date=lm;
      t.mime=t.mime||r.headers.get('content-type')||'';
      if(r.status!==206){ctl.abort();return}
      b=await r.blob();
    }
    const tg=await readTags(new File([b],t.name));
    const fn=t.name.replace(/\.[^.]+$/,'');
    if(tg.title&&tg.title!==fn)t.title=tg.title;
    if(tg.artist)t.artist=tg.artist;
    if(tg.album)t.album=tg.album;
    if(tg.cover)t.cover=tg.cover;
    if(tg.meta)t.meta=tg.meta;
    {const m=tg.meta||{};t.trk=parseInt(String(m['Pista']||m['TRACKNUMBER']||'').split('/')[0])||0}
    t.tc=1;noteTags(t);
  }catch(e){t.tagsDone=false;t.tagsP=null}
}

