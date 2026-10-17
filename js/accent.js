/* ---------- Color de brplayer (bolita) ---------- */
const PAL=[null,'#2563eb','#16a34a','#f59e0b','#9333ea','#06b6d4','#ec4899'];
let accI=+localStorage.getItem('accI')||0,held=false,lp=0,rgbRAF=0,prevAcc='',rgbCol='';
const RS=document.documentElement.style;
const setAcc=c=>c?RS.setProperty('--acc',c):RS.removeProperty('--acc');
setAcc(localStorage.getItem('accC')||PAL[accI]);
/* los mismos colores de la página: el acento por defecto (según tema) + la paleta de la bolita */
const darkNow=()=>{const th=document.documentElement.dataset.theme;return th?th=='dark':matchMedia('(prefers-color-scheme:dark)').matches};
const hex3=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const palRGB=()=>PAL.map(c=>hex3(c||(darkNow()?'#fb7185':'#e11d48')));
const hueOf=([r,g,b])=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return 0;const h=mx==r?((g-b)/d)%6:mx==g?(b-r)/d+2:(r-g)/d+4;return(h*60+360)%360};
function tapBall(){
  if(held){held=false;return}
  moveBall();accI=(accI+1)%PAL.length;setAcc(PAL[accI]);localStorage.setItem('accI',accI);localStorage.removeItem('accC');
}
let rgbSc=null;
function rgbStart(per=600,sc){
  rgbSc=sc||null;prevAcc=RS.getPropertyValue('--acc');const t0=performance.now(),C=palRGB(),n=C.length;document.documentElement.classList.add('rgb');
  const f=t=>{
    const u=(Math.max(0,t-t0)/per)%n,i=Math.floor(u),k=Math.min(1,Math.max(0,(u-i-.2)/.6)),e=k*k*(3-2*k),A=C[i],B=C[(i+1)%n];
    const c=A.map((v,j)=>Math.round(v+(B[j]-v)*e));
    rgbCol='rgb('+c.join(',')+')';if(!rgbSc)window.RGBH=hueOf(c);rgbSc?rgbSc.forEach(e=>e&&e.style.setProperty('--acc',rgbCol)):RS.setProperty('--acc',rgbCol);
    if(au.paused){try{SKFX.once()}catch(_){}}
    rgbRAF=requestAnimationFrame(f)};
  rgbRAF=requestAnimationFrame(f);
}
/* keep=true: al soltar se queda en el último color generado; keep=false: vuelve al color anterior (efecto automático) */
function rgbStop(keep=true){
  clearTimeout(lp);
  if(!rgbRAF)return;
  window.RGBH=null;cancelAnimationFrame(rgbRAF);rgbRAF=0;document.documentElement.classList.remove('rgb');
  if(rgbSc){rgbSc.forEach(e=>e&&e.style.removeProperty('--acc'));rgbSc=null;try{SKFX.once()}catch(_){}return}
  if(keep&&rgbCol){RS.setProperty('--acc',rgbCol);try{localStorage.setItem('accC',rgbCol)}catch(e){}}
  else prevAcc?RS.setProperty('--acc',prevAcc):RS.removeProperty('--acc');
  try{SKFX.once()}catch(_){}
}
{const o=$('orb');
  o.addEventListener('pointerdown',()=>{held=false;clearTimeout(lp);lp=setTimeout(()=>{held=true;rgbStart()},450)});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>o.addEventListener(ev,()=>rgbStop(true)));
  o.addEventListener('contextmenu',e=>e.preventDefault());}

