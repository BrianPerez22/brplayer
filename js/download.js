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

/* Usa la copia de la precarga si existe (no gasta datos); si no, descarga el archivo mostrando el progreso */
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

/* Safari exige un toque nuevo para abrir la hoja de compartir: se ofrece un botón */
function askSave(blob,name,title){
  openSheet('Descarga lista',[['Guardar «'+title+'»','dlf',async()=>{
    try{const f=new File([blob],name,{type:blob.type});await navigator.share({files:[f],title});toast('Guardada: '+name)}
    catch(e){if(!e||e.name!='AbortError'){saveBlob(blob,name);toast('Descargada: '+name)}}}]]);
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
    if(r=='ask')askSave(blob,name,t.title);
    else if(r=='ok')toast('Descargada: '+name);
  }catch(e){
    toast(navigator.onLine===false?'Sin conexión: no se puede descargar':'No se pudo descargar: '+t.title);
  }finally{dling.delete(t)}
}

/* ---------- Varias canciones: un único ZIP (sin compresión) ---------- */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=-1;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^-1)>>>0};
async function makeZip(files){ /* files: [{name,blob}] */
  const enc=new TextEncoder(),parts=[],cen=[],d=new Date();let off=0;
  const tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  for(const f of files){
    const nm=enc.encode(f.name),sz=f.blob.size,crc=crc32(new Uint8Array(await f.blob.arrayBuffer()));
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);
    h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);
    parts.push(h.buffer,nm,f.blob);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,tm,true);c.setUint16(14,dt,true);
    c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cen.push(c.buffer,nm);off+=30+nm.length+sz;
  }
  const csz=cen.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csz,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:'application/zip'});
}
let dlBusy=false;
async function downloadMany(list){
  const srv=[...new Set((list||[]).filter(t=>t&&t.remote))];
  if(!srv.length){toast('Las canciones elegidas ya están en este dispositivo');return}
  if(srv.length==1)return downloadTrack(srv[0]);
  if(dlBusy){toast('Ya hay una descarga múltiple en curso');return}
  const est=srv.reduce((a,t)=>a+(t.size||0),0);
  if(est>400*1048576&&!confirm('La selección pesa unos '+Math.round(est/1048576)+' MB y se prepara en la memoria del dispositivo. ¿Continuar?'))return;
  dlBusy=true;const files=[],used=new Set();let fails=0;
  try{
    for(let i=0;i<srv.length;i++){
      const t=srv[i];let last=0;
      try{
        toast('Descargando '+(i+1)+'/'+srv.length+' · '+t.title);
        const raw=await dlFetch(t,(g,tot)=>{const n=Date.now();if(n-last<400)return;last=n;
          toast('Descargando '+(i+1)+'/'+srv.length+(tot?' · '+Math.min(100,Math.round(g/tot*100))+'%':'')+' · '+t.title)});
        if(!raw.size)throw new Error('vacío');
        const base=dlName(t),m=/^(.*?)(\.[^.]+)?$/.exec(base);let n=base,k=1;
        while(used.has(n.toLowerCase()))n=m[1]+' ('+(++k)+')'+(m[2]||'');
        used.add(n.toLowerCase());files.push({name:n,blob:raw});
      }catch(e){fails++}
    }
    if(!files.length){toast(navigator.onLine===false?'Sin conexión: no se puede descargar':'No se pudo descargar ninguna canción');return}
    toast('Preparando el ZIP…');
    const z=await makeZip(files),name='canciones-'+new Date().toLocaleDateString('en-CA')+' ('+files.length+').zip';
    const r=await saveFile(z,name,'Canciones');
    if(r=='ask')askSave(z,name,files.length+' canciones');
    else if(r=='ok')toast('ZIP listo: '+files.length+(files.length==1?' canción':' canciones')+(fails?' · '+fails+' fallaron':''));
  }catch(e){toast('No se pudo preparar la descarga')}
  finally{dlBusy=false}
}

Object.assign(A,{dlcur:()=>{$('inf').hidden=true;downloadTrack(tracks[cur])}});
