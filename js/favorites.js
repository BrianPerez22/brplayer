/* ---------- Favoritos, artista / álbum, etiquetas y modo sin conexión ---------- */
const trk=t=>t.trk||parseInt(String((t.meta&&(t.meta['Pista']||t.meta['TRACKNUMBER']))||'').split('/')[0])||0;
const nk=x=>String(x||'').trim().toLowerCase();
const shufArr=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const nCan=n=>n+(n==1?' canción':' canciones');
const isFav=t=>favs.includes(key(t));
const saveFavs=()=>{try{localStorage.setItem('favs',JSON.stringify(favs))}catch(e){}};
const favTracks=()=>{const m=new Map(tracks.map(t=>[key(t),t]));return favs.map(k=>m.get(k)).filter(Boolean)};
function syncFav(){
  const t=tracks[cur],f=!!(t&&isFav(t));
  document.querySelectorAll('.b-fav').forEach(b=>{b.classList.toggle('on',f);b.innerHTML=ic(f?'heartf':'heart',+(b.dataset.s||22))});
}
function toggleFav(t){
  if(!t)return;const k=key(t),i=favs.indexOf(k);
  if(i>=0){favs.splice(i,1);toast('Quitada de favoritos')}else{favs.unshift(k);toast('Agregada a favoritos')}
  saveFavs();syncFav();if(view=='pls')render();
}

/* canciones de un artista ('ar:Nombre') o álbum ('al:Nombre'); el álbum va en orden de pista */
function grpOrdered(v){
  const n=nk(v.slice(3)),isA=v.startsWith('ar:');
  const a=tracks.filter(t=>nk(isA?t.artist:t.album)==n);
  if(!isA&&a.some(trk))a.sort((x,y)=>(trk(x)||9999)-(trk(y)||9999));
  return a;
}
function ctxFor(){
  if(view.startsWith('pl:'))return{id:view.slice(3),arr:plTracks(view.slice(3))};
  if(view=='pls')return{id:'fav',arr:favTracks()};
  if(isGrp(view))return{id:view,arr:grpOrdered(view)};
  return null;
}
function openGroup(v){
  if(!v.slice(3).trim())return;
  $('sheet').hidden=true;$('inf').hidden=true;$('fs').hidden=true;
  if(view!==v){vstack.push(view);if(vstack.length>30)vstack.shift();if(!isGrp(view))homeTab=view.startsWith('pl')?'pls':view}
  view=v;recFor='';$('q').value='';render();scrollTo(0,0);scanTags();
}

/* pestaña corazón: playlists en carrusel + lista de canciones favoritas */
function renderFav(L){
  const car=L.querySelector('.car'),sl=car?car.scrollLeft:0,q=qv();
  const cards=pls.map(p=>{const f=plTracks(p.id)[0],i=f?tracks.indexOf(f):-1;if(f){ensureThumb(f);wantBig(f)}
    return `<div class="ci" data-po="${esc(p.id)}"><img class="cv"${i>=0?` data-ct="${i}"`:''} src="${f?(f.thumbL||f.thumb||GIF):GIF}" alt=""><button class="pm" data-pm="${esc(p.id)}" aria-label="Opciones">${ic('more',18)}</button><b>${esc(p.name)}</b><small>${nCan(p.items.length)}</small></div>`}).join('');
  const fa=favTracks().filter(t=>mq(t,q));
  L.innerHTML=`<div class="bar2"><b>Playlists</b></div><div class="car">${cards}<div class="ci" data-a="newpl"><div class="nw">${ic('plus',30)}</div><b>Nueva</b><small>Crear playlist</small></div></div>`+
    `<div class="bar2"><b>Mis favoritas</b>${favs.length?`<span class="cnt">${favs.length}</span>`:''}<span class="sp"></span>${fa.length?`<button data-a="favplay">${ic('play',16)}Reproducir</button><button class="ib" data-a="favshuf" aria-label="Aleatorio">${ic('shuf',20)}</button>`:''}</div>`+
    (fa.length?fa.map(t=>rowH({t,i:tracks.indexOf(t),fv:1})).join(''):`<div id="empty">${q?'Sin resultados.':'Aún no tienes canciones favoritas.<br>Toca el corazón del reproductor o usa los tres puntos de una canción.'}</div>`);
  const c2=L.querySelector('.car');if(c2)c2.scrollLeft=sl;
  L.querySelectorAll('.t[data-i]').forEach(el=>io.observe(el));
}

/* página de artista / álbum */
function renderGroup(L){
  const isA=view.startsWith('ar:'),name=view.slice(3),all=grpOrdered(view),q=qv();
  const a=all.filter(t=>mq(t,q));
  const car=L.querySelector('.car'),sl=car?car.scrollLeft:0;
  all.slice(0,4).forEach(t=>ensureThumb(t));
  const cv=ts=>{const f=ts.find(t=>t.thumbL||t.thumb)||ts[0];if(f){ensureThumb(f);wantBig(f)}return f?{i:tracks.indexOf(f),src:f.thumbL||f.thumb||GIF,ok:!!(f.thumbL||f.thumb)}:{i:-1,src:GIF,ok:false}};
  const h=cv(all);heroMiss=!h.ok&&all.length>0;
  let meta,extra='';
  if(isA){
    const m=new Map();all.forEach(t=>{if(t.album){const k=nk(t.album);if(!m.has(k))m.set(k,{n:t.album,ts:[]});m.get(k).ts.push(t)}});
    meta=nCan(all.length)+(m.size?` · ${m.size} álbum${m.size>1?'es':''}`:'');
    if(m.size>1)extra=`<div class="bar2"><b>Álbumes</b></div><div class="car">`+[...m.values()].map(g=>{const c=cv(g.ts);return `<div class="ci" data-al="${esc(g.n)}"><img class="cv"${c.i>=0?` data-ct="${c.i}"`:''} src="${c.src}" alt=""><b>${esc(g.n)}</b><small>${nCan(g.ts.length)}</small></div>`}).join('')+`</div>`;
  }else{
    const ar=[...new Set(all.map(t=>t.artist).filter(Boolean))];
    meta=(ar.length==1?`<span class="lk" data-ar="${esc(ar[0])}">${esc(ar[0])}</span> · `:ar.length>1?'Varios artistas · ':'')+nCan(all.length);
  }
  L.innerHTML=`<div class="bar2"><button class="ib" data-a="gback" aria-label="Volver">${ic('back',22)}</button><span style="color:var(--mut)">${isA?'Artista':'Álbum'}</span></div>`+
    `<div class="gh"><img class="cv"${h.i>=0?` data-ct="${h.i}"`:''} src="${h.src}" alt=""><div class="tx"><b>${esc(name)}</b><small>${meta}</small>${all.length?`<div class="gb"><button data-a="gplay">${ic('play',16)}Reproducir</button><button data-a="gshuf">${ic('shuf',16)}Aleatorio</button></div>`:''}</div></div>`+
    extra+`<div class="bar2"><b>Canciones</b><span class="cnt">${a.length}</span></div>`+
    (a.length?a.map(t=>rowH({t,i:tracks.indexOf(t)})).join(''):`<div id="empty">${scanning?'Leyendo datos de las canciones…':'No hay canciones.'}</div>`);
  const c2=L.querySelector('.car');if(c2)c2.scrollLeft=sl;
  L.querySelectorAll('.t[data-i]').forEach(el=>io.observe(el));
}

/* Lee artista/álbum/pista de todas las canciones del servidor que aún no se conocen (una sola vez; queda guardado) */
let scanning=0,scanDone=0,scanTot=0,scanTm=0;
function afterScan(){const need=/^(album|artist)/.test(sortKey);if(need)sortTracks();if(need||isGrp(view))render()}
function scanTags(){
  if(scanning)return;
  const todo=tracks.filter(t=>t.remote&&!t.tc&&!t.scn);
  if(!todo.length)return;
  scanning=1;scanDone=0;scanTot=todo.length;toast('Leyendo datos de '+todo.length+' canciones…');
  todo.forEach(t=>{t.scn=1;qadd(async()=>{
    try{
      await remoteTags(t);
      if(t.cover&&!t.thumb)t.thumb=await artURL(t.cover,160);
      t.th=1;
      /* se suelta la carátula grande para no llenar la memoria; se vuelve a leer si la canción suena */
      if(tracks[cur]!==t&&t.cover&&t.thumb){t.cover=null;t.tagsDone=false;t.tagsP=null}
    }finally{
      updRow(t);scanDone++;
      if(scanDone>=scanTot){scanning=0;clearTimeout(scanTm);scanTm=0;toast('Datos de canciones listos');afterScan()}
      else if(!scanTm)scanTm=setTimeout(()=>{scanTm=0;afterScan()},1500);
    }
  })});
}

Object.assign(A,{
  fav:()=>{const t=tracks[cur];t?toggleFav(t):toast('No hay canción seleccionada')},
  gback:()=>{view=vstack.pop()||'lib';recFor='';render();scrollTo(0,0)},
  gplay:()=>{const a=grpOrdered(view);a.length?playList(a,0,view):toast('No hay canciones')},
  gshuf:()=>{const a=grpOrdered(view);a.length?playList(shufArr(a),0,view):toast('No hay canciones')},
  favplay:()=>{const a=favTracks();a.length?playList(a,0,'fav'):toast('No hay favoritas')},
  favshuf:()=>{const a=favTracks();a.length?playList(shufArr(a),0,'fav'):toast('No hay favoritas')}
});

