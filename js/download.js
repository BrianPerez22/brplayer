/* ---------- Descargar canciones del servidor al dispositivo ----------
   Guarda el archivo original (sin tocarlo) en la carpeta de descargas / app Archivos.
   No interfiere con "Añadir canciones" ni con el almacenamiento interno de la app. */
const dling=new Set();
const standalone=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
const dlExt=t=>{const m=/\.([A-Za-z0-9]{2,5})$/.exec(t.name||'');const e=m?m[1].toLowerCase():'';return MIME[e]?e:''};

/* nombre de archivo seguro; si el servidor no incluye extensión se deduce del tipo MIME */
function dlName(t){
  let n=String(t.name||t.title||'cancion').split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*]/g,'_').trim()||'cancion';
  if(!dlExt({name:n})){
    const mt=String(t.mime||'').split(';')[0].trim();
    const e=Object.keys(MIME).find(k=>MIME[k].split(';')[0]==mt);
    n+='.'+(e||'mp3');
  }
  return n;
}

/* Usa la copia en caché si existe (no gasta datos); si no, la descarga mostrando el progreso */
async function dlFetch(t,on){
  if(window.caches){
    try{const m=await caches.match(t.url);if(m){const b=await m.blob();if(b.size){on&&on(1,1);return b}}}catch(e){}
  }
  const r=await fetch(t.url);
  if(!r.ok)throw new Error('HTTP '+r.status);
  const total=+r.headers.get('content-length')||t.size||0,type=r.headers.get('content-type')||'';
  if(!r.body||!r.body.getReader)return await r.blob();
  const rd=r.body.getReader(),parts=[];let got=0;
  for(;;){const{done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;on&&on(got,total)}
  return new Blob(parts,{type});
}

function saveBlob(blob,name){
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),120000);
}

/* En la app instalada (iOS) los enlaces de descarga no funcionan: se usa la hoja de compartir ("Guardar en Archivos") */
async function saveFile(blob,name,title){
  if(standalone()&&navigator.canShare&&navigator.share){
    let f=null;try{f=new File([blob],name,{type:blob.type})}catch(e){}
    if(f&&navigator.canShare({files:[f]})){
      try{await navigator.share({files:[f],title});return'ok'}
      catch(e){return e&&e.name=='AbortError'?'cancel':'ask'} /* sin gesto reciente: se pide un toque */
    }
  }
  saveBlob(blob,name);return'ok';
}

async function downloadTrack(t){
  if(!t){toast('No hay canción seleccionada');return}
  if(!t.remote){toast('Esta canción ya está en este dispositivo');return}
  if(dling.has(t)){toast('Ya se está descargando: '+t.title);return}
  dling.add(t);let last=0;const name=dlName(t);
  try{
    toast('Descargando: '+t.title+'…');
    const raw=await dlFetch(t,(g,tot)=>{
      const n=Date.now();if(n-last<350)return;last=n;
      toast((tot?'Descargando '+Math.min(100,Math.round(g/tot*100))+'%':'Descargando '+(g/1048576).toFixed(1)+' MB')+' · '+t.title)});
    if(!raw.size)throw new Error('Archivo vacío');
    const blob=new Blob([raw],{type:MIME[dlExt(t)]||raw.type||'audio/mpeg'});
    const r=await saveFile(blob,name,t.title);
    if(r=='ask')openSheet('Descarga lista',[['Guardar «'+t.title+'»','dlf',async()=>{
      try{const f=new File([blob],name,{type:blob.type});await navigator.share({files:[f],title:t.title});toast('Guardada: '+name)}
      catch(e){if(!e||e.name!='AbortError'){saveBlob(blob,name);toast('Descargada: '+name)}}}]]);
    else if(r=='ok')toast('Descargada: '+name);
  }catch(e){
    toast(navigator.onLine===false?'Sin conexión: no se puede descargar':'No se pudo descargar: '+t.title);
  }finally{dling.delete(t)}
}

Object.assign(A,{dlcur:()=>{$('inf').hidden=true;downloadTrack(tracks[cur])}});
