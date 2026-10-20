/* brplayer · núcleo: estado global, utilidades, IndexedDB y biblioteca del servidor */
const $=id=>document.getElementById(id);
const au=$('au');
let loading=true,errN=0,tracks=[],cur=-1,shuffle=false,repeat=0,url=null,hist=[],shufQ=null,dragging=false,restore=null,sortKey=localStorage.getItem('sort')||'name-asc';
const MIME={mp3:'audio/mpeg',flac:'audio/flac',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',opus:'audio/ogg; codecs=opus',aif:'audio/aiff',aiff:'audio/aiff',caf:'audio/x-caf'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{if(!isFinite(s))return'0:00';s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',3000)}

/* ---------- Utilidades: búsqueda sin acentos, hash corto y URLs ---------- */
const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const qv=()=>nz($('q').value);
/* texto normalizado de una canción (se recalcula solo si cambian título, artista o álbum) */
const hay=t=>{const k=t.title+'\u0001'+t.artist+'\u0001'+t.album+'\u0001'+t.name;if(t._hk!==k){t._hk=k;t._hs=nz(t.title+' '+t.artist+' '+t.album+' '+t.name)}return t._hs};
const mq=(t,q)=>!q||hay(t).includes(q);
/* hash de 64 bits en 11 caracteres (base64url): identifica canciones en enlaces cortos */
function h64(s){
  let a=0xdeadbeef,b=0x41c6ce57;s=String(s);
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}
  a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);
  const u=new Uint8Array(8),v=new DataView(u.buffer);v.setUint32(0,a>>>0);v.setUint32(4,b>>>0);
  return btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
/* Codifica la ruta de una URL sin duplicar lo ya codificado: espacios, #, ?, tildes… ya no rompen la reproducción.
   Una cadena de consulta real (?clave=valor) se respeta. */
function encUrl(u){
  u=String(u);const m=/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)?([\s\S]*)$/i.exec(u);let o=m[1]||'',r=m[2],q='';
  const qi=r.search(/\?[\w.~%-]+=/);if(qi>=0){q=r.slice(qi);r=r.slice(0,qi)}
  r=r.split('/').map(s=>s.replace(/%(?![0-9a-f]{2})|[^A-Za-z0-9\-._~!$&'()*+,;=:@%]/gi,c=>{try{return encodeURIComponent(c)}catch(e){return''}})).join('/');
  return o+r+q;
}

/* ---------- Almacenamiento (IndexedDB) ---------- */
const db=new Promise((res,rej)=>{const r=indexedDB.open('player',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=async(mode,fn)=>{const d=await db;return new Promise((res,rej)=>{const t=d.transaction('t',mode);const r=fn(t.objectStore('t'));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})};

/* ---------- Biblioteca del servidor ---------- */
const pd=v=>{if(!v)return 0;if(typeof v=='number')return v<1e12?v*1000:v;const d=Date.parse(v);return isNaN(d)?0:d};
function splitName(n){const b=n.replace(/\.[^.]+$/,'');const k=b.indexOf(' - ');return k>0?{artist:b.slice(0,k).trim(),title:b.slice(k+3).trim()}:{artist:'',title:b}}
let tagc={};try{tagc=JSON.parse(localStorage.getItem('tagc')||'{}')}catch(e){}
let tagSv=0;
function noteTags(t){if(!t.remote)return;tagc[t.sid||t.name]=[t.title,t.artist||'',t.album||'',t.trk||0];try{kmPut(t)}catch(e){}clearTimeout(tagSv);tagSv=setTimeout(()=>{try{localStorage.setItem('tagc',JSON.stringify(tagc))}catch(e){}},1500)}
let srvErr='',srvStale=false;
async function loadServer(){
  let j;srvStale=false;
  try{const r=await fetch('/api/canciones',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);j=await r.json();if(!Array.isArray(j))throw new Error('Formato inesperado');try{localStorage.setItem('srvlist',JSON.stringify(j))}catch(e){}}
  catch(e){j=JSON.parse(localStorage.getItem('srvlist')||'null');if(!j)throw e;srvStale=true}
  const pn=v=>parseInt(String(v==null?'':v).split('/')[0])||0;
  return j.filter(s=>s&&typeof s.nombre=='string'&&s.nombre&&s.url).map(s=>{
    /* `id` opcional del servidor: si existe, renombrar el archivo no pierde favoritos, playlists ni estadísticas */
    const sid=String(s.id!=null&&s.id!==''?s.id:s.nombre),n=splitName(s.nombre);
    const o={id:'srv:'+sid,sid,remote:true,name:s.nombre,url:encUrl(s.url),title:n.title,artist:n.artist,album:'',cover:null,date:pd(s.fecha||s.date||s.mtime||s.modificado||s.modified),size:s.size||s.tamano||0};
    /* etiquetas opcionales que puede mandar el servidor (evita leer 2 MB de cada archivo) */
    const st=s.titulo||s.title,sa=s.artista||s.artist,sl=s.album,sk=s.pista||s.track||s.trk,sc=s.caratula||s.cover;
    if(st)o.title=String(st);if(sa)o.artist=String(sa);if(sl)o.album=String(sl);if(sk)o.trk=pn(sk);
    if(sc&&typeof sc=='string')o.coverUrl=encUrl(sc);
    if(sa||sl){o.tc=1;o.srvTags=1}
    const c=!o.srvTags&&tagc[sid];if(c){o.title=c[0]||o.title;o.artist=c[1]||o.artist;o.album=c[2]||'';o.trk=c[3]||0;o.tc=1}
    return o});
}
/* Lee etiquetas y carátula de la canción actual pidiendo solo los primeros 2 MB */
function remoteTags(t){return t.tagsP||(t.tagsP=_remoteTags(t))}
async function _remoteTags(t){
  if(t.tagsDone)return;t.tagsDone=true;
  if(t.srvTags){try{if(t.coverUrl&&!t.cover){const r=await fetch(t.coverUrl);if(r.ok)t.cover=await r.blob()}}catch(e){t.tagsDone=false;t.tagsP=null}return}
  try{
    let b=null;
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

