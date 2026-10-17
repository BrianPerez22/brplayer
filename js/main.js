/* ---------- Icono: bolita de un color distinto en cada carga ---------- */
try{
  const last=parseFloat(localStorage.getItem('favH'));let H=Math.random()*360;
  if(isFinite(last))H=(last+70+Math.random()*220)%360;
  try{localStorage.setItem('favH',H)}catch(e){}
  const mk=(n,bg)=>{const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');
    if(bg){x.fillStyle=bg;x.fillRect(0,0,n,n)}const r=n*(bg?.28:.42),q=x.createRadialGradient(n*.42,n*.38,r*.1,n/2,n/2,r);
    q.addColorStop(0,`hsl(${H},100%,87%)`);q.addColorStop(1,`hsl(${H},100%,65%)`);x.fillStyle=q;x.beginPath();x.arc(n/2,n/2,r,0,Math.PI*2);x.fill();return c.toDataURL('image/png')};
  document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach(l=>l.remove());
  const lk=(rel,href,sz)=>{const l=document.createElement('link');l.rel=rel;l.type='image/png';l.sizes=sz;l.href=href;document.head.appendChild(l)};
  lk('icon',mk(128),'128x128');lk('apple-touch-icon',mk(180,'#17171a'),'180x180');
}catch(e){}

/* ---------- Inicio ---------- */
setPP(false);sync();updTabs();syncFav();updOffLbl();
addEventListener('hashchange',()=>applyHash());
(async()=>{
  render();
  let local=[],srv=[];
  try{
    local=(await tx('readonly',s=>s.getAll()))||[];
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
  }catch(e){}
  try{srv=await loadServer()}catch(e){}
  tracks=srv.concat(local);
  loading=false;
  await applySort();
  markCached();
  if(await applyHash())return;
  if(tracks.length){
    const id=localStorage.getItem('last');let i=tracks.findIndex(t=>String(t.id)==id);
    if(i<0)i=0;restore=+localStorage.getItem('pos')||0;
    await load(i,false,false);
  }else updateNow();
})();
