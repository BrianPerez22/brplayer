/* brplayer · service worker: guarda la app (HTML, CSS, JS) para abrirla sin conexión.
   No toca el audio ni /api/: las canciones nunca se guardan en caché; solo se conserva la última lista del servidor en el almacenamiento local. */
const V='brplayer-shell-v2';
const SHELL=['./','index.html','css/base.css','css/visualizer.css','css/effects.css','css/equalizer.css','css/library.css',
  'js/core.js','js/tags.js','js/list.js','js/playback.js','js/playlists.js','js/favorites.js','js/download.js','js/select.js','js/library.js','js/extras.js',
  'js/accent.js','js/equalizer.js','js/visualizer.js','js/input.js','js/progress-fx.js','js/idle-fx.js','js/main.js','assets/abrir-brplayer.svg'];
const AUDIO=/\.(mp3|flac|m4a|aac|wav|ogg|opus|aif|aiff|alac|caf)$/i;
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('brplayer-shell-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
/* red primero (siempre la versión más nueva); si no hay red, la copia guardada */
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||r.headers.has('range')||u.pathname.includes('/api/')||AUDIO.test(u.pathname))return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&res.type==='basic'){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{})}
    return res;
  }).catch(async()=>{
    const c=await caches.open(V);
    return (await c.match(r,{ignoreSearch:true}))||(r.mode==='navigate'?((await c.match('./'))||(await c.match('index.html'))):null)||Response.error();
  }));
});
