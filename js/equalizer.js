/* ---------- Motor de audio: ecualizador de 10 bandas + sonido 3D ---------- */
const AE=(()=>{
const F0=[32,64,125,250,500,1000,2000,4000,8000,16000],LB=['32','64','125','250','500','1k','2k','4k','8k','16k'];
const PR={Plano:[0,0,0,0,0,0,0,0,0,0],'Graves+':[6,5,4,2,0,0,0,0,0,0],'Agudos+':[0,0,0,0,0,1,3,5,6,6],Vocal:[-2,-2,-1,1,3,4,3,1,0,-1],Rock:[5,4,2,-1,-2,-1,2,4,5,5],Pop:[-1,1,3,4,3,0,-1,-1,1,2],Electrónica:[6,5,2,0,-2,2,1,3,5,5],Clásica:[0,0,0,0,0,0,-2,-2,-2,-4],Jazz:[3,2,1,2,-2,-2,0,1,2,3]};
const MD={env:{n:'Envolvente',w:1.7,r:.2},sala:{n:'Sala',w:1.3,r:.5},o8:{n:'8D giratorio',w:1,r:.15}};
const def={on:false,g:F0.map(()=>0),pre:'Plano',sp:{on:false,m:'env',w:1.7,r:.2,v:.12,d:3}};
let S;try{S=Object.assign({},def,JSON.parse(localStorage.getItem('eq')||'{}'))}catch(e){S=def}
S.sp=Object.assign({},def.sp,S.sp);
const save=()=>{try{localStorage.setItem('eq',JSON.stringify(S))}catch(e){}};
let ac=null,an=null,N={},fl=[],oc=null,ofl=[],th0=0,t0=0,tm=0;
const th=t=>th0+6.2832*S.sp.v*(t-t0);
const mkF=(c,f,i)=>{const b=c.createBiquadFilter();b.type=i?i==9?'highshelf':'peaking':'lowshelf';b.frequency.value=f;b.Q.value=1.1;return b};
function ir(){const n=ac.sampleRate*2.4|0,b=ac.createBuffer(2,n,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<n;i++){const t=i/n;lp+=(Math.random()*2-1-lp)*(.9-.75*t);d[i]=lp*Math.pow(1-t,2.4)}}return b}
function init(){
  if(an)return true;
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
    const u=au.currentSrc||au.src;
    if(u&&!u.startsWith('blob:')&&new URL(u,location.href).origin!=location.origin){toast('Ecualizador y visualizador no disponibles: el audio es de otro dominio');return false}
    if(navigator.audioSession)navigator.audioSession.type='playback';
    const c=new C(),g=()=>c.createGain();
    const st=g();st.channelCount=2;st.channelCountMode='explicit';st.channelInterpretation='speakers';
    const n={pre:g()},f=F0.map((x,i)=>mkF(c,x,i));
    st.connect(n.pre);let p=n.pre;f.forEach(b=>{p.connect(b);p=b});
    const sin=g();p.connect(sin);
    const sp=c.createChannelSplitter(2),mg=c.createChannelMerger(2);n.x=[g(),g(),g(),g()];
    sin.connect(sp);sp.connect(n.x[0],0);sp.connect(n.x[1],1);sp.connect(n.x[2],0);sp.connect(n.x[3],1);
    n.x[0].connect(mg,0,0);n.x[1].connect(mg,0,0);n.x[2].connect(mg,0,1);n.x[3].connect(mg,0,1);
    n.A=g();mg.connect(n.A);
    n.pn=c.createPanner();n.pn.panningModel='HRTF';n.pn.distanceModel='inverse';n.pn.refDistance=1;n.pn.rolloffFactor=.4;
    n.B=g();sin.connect(n.pn);n.pn.connect(n.B);
    const dl=c.createDelay(.1);dl.delayTime.value=.02;const cv=c.createConvolver();ac=c;cv.buffer=ir();n.W=g();sin.connect(dl);dl.connect(cv);cv.connect(n.W);
    const lm=c.createDynamicsCompressor();lm.threshold.value=-4;lm.knee.value=6;lm.ratio.value=12;lm.attack.value=.003;lm.release.value=.25;
    const a=c.createAnalyser();a.fftSize=2048;a.smoothingTimeConstant=.78;a.minDecibels=-88;a.maxDecibels=-18;
    [n.A,n.B,n.W].forEach(x=>x.connect(lm));lm.connect(a);a.connect(c.destination);
    c.createMediaElementSource(au).connect(st); /* al final: si algo falla antes, el audio sigue normal */
    N=n;fl=f;an=a;t0=c.currentTime;
    c.onstatechange=()=>{if(c.state!='running'&&!au.paused)c.resume().catch(()=>{})};
    apply();c.resume().catch(()=>{});return true;
  }catch(e){an=null;return false}
}
function orbit(on){
  clearInterval(tm);tm=0;if(!on)return;
  const p=N.pn,k=()=>{const T=ac.currentTime,R=S.sp.d;
    if(p.positionX){const X=p.positionX,Z=p.positionZ;X.cancelScheduledValues(T);Z.cancelScheduledValues(T);X.setValueAtTime(R*Math.sin(th(T)),T);Z.setValueAtTime(R*Math.cos(th(T)),T);
      for(let i=1;i<=24;i++){const t=T+i*.05;X.linearRampToValueAtTime(R*Math.sin(th(t)),t);Z.linearRampToValueAtTime(R*Math.cos(th(t)),t)}}
    else p.setPosition(R*Math.sin(th(T)),0,R*Math.cos(th(T)))};
  k();tm=setInterval(k,p.positionX?400:50);
}
function apply(){
  if(!an)return;const T=ac.currentTime,s=S.sp,set=(p,v)=>p.setTargetAtTime(v,T,.05);
  fl.forEach((b,i)=>set(b.gain,S.on?S.g[i]:0));
  set(N.pre.gain,Math.pow(10,-(S.on?Math.max(0,...S.g):0)*.5/20));
  const o8=s.on&&s.m=='o8',w=s.on?s.w:1;
  set(N.x[0].gain,(1+w)/2);set(N.x[3].gain,(1+w)/2);set(N.x[1].gain,(1-w)/2);set(N.x[2].gain,(1-w)/2);
  set(N.A.gain,o8?0:1);set(N.B.gain,o8?1+.4*(s.d-1):0);set(N.W.gain,s.on?s.r*.9:0);
  orbit(o8);
}
function curve(){
  if(!oc){const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;oc=new O(1,1,44100);ofl=F0.map((x,i)=>mkF(oc,x,i))}
  const n=96,fr=new Float32Array(n),m=new Float32Array(n),ph=new Float32Array(n),o=new Array(n).fill(1);
  for(let i=0;i<n;i++)fr[i]=20*Math.pow(1000,i/(n-1));
  ofl.forEach((b,i)=>{b.gain.value=S.on?S.g[i]:0;b.getFrequencyResponse(fr,m,ph);for(let k=0;k<n;k++)o[k]*=m[k]});
  return o.map(v=>20*Math.log10(v));
}
/* restaurar ajustes guardados al reproducir (hace falta un gesto del usuario, que es el propio play) */
au.addEventListener('play',()=>{if(S.on||S.sp.on)init()});
return{init,apply,save,curve,th,S,PR,MD,F0,LB,get ac(){return ac},get an(){return an},
  setV(v){const T=ac?ac.currentTime:0;th0=th(T);t0=T;S.sp.v=v}};
})();

/* ---------- Panel del ecualizador ---------- */
{
const S=AE.S,q=x=>document.querySelector(x);
document.body.insertAdjacentHTML('beforeend',`<div id="eq" class="ovl" hidden><div class="card"><div class="mh"><b>Ecualizador</b><span style="display:flex;gap:8px;align-items:center"><button class="tg" id="eqon" aria-label="Activar ecualizador"></button><button class="ib" data-a="eqx" aria-label="Cerrar">${ic('close')}</button></span></div><canvas id="eqc"></canvas><div id="eqp" class="chips"></div><div id="eqb"></div><div class="mh"><b>Sonido 3D</b><button class="tg" id="spon" aria-label="Activar sonido 3D"></button></div><div id="spm" class="chips"></div><canvas id="spr"></canvas><div id="sps"></div></div></div>`);
const bands=AE.F0.map((f,i)=>{
  const b=document.createElement('div');b.className='bd';b.innerHTML=`<small class="v">0</small><div class="tr"><div class="th"></div></div><small>${AE.LB[i]}</small>`;
  const mv=e=>{const r=b.querySelector('.tr').getBoundingClientRect();setB(i,Math.round((12-Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))*24)*2)/2)};
  b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);mv(e)};b.onpointermove=e=>{if(b.hasPointerCapture(e.pointerId))mv(e)};b.ondblclick=()=>setB(i,0);
  $('eqb').appendChild(b);return b});
const upd=()=>{AE.apply();AE.save();ui()};
function setB(i,v){S.g[i]=v;S.pre='';S.on=true;upd()}
Object.keys(AE.PR).forEach(k=>{const c=document.createElement('button');c.className='chip';c.textContent=k;c.onclick=()=>{S.g=AE.PR[k].slice();S.pre=k;S.on=true;upd()};c.dataset.k=k;$('eqp').appendChild(c)});
Object.entries(AE.MD).forEach(([k,m])=>{const c=document.createElement('button');c.className='chip';c.textContent=m.n;c.onclick=()=>{S.sp.m=k;S.sp.w=m.w;S.sp.r=m.r;S.sp.on=true;upd()};c.dataset.k=k;$('spm').appendChild(c)});
const SL=[['w','Amplitud',0,2.5,.05],['r','Sala',0,1,.02],['v','Giro',.02,.5,.01],['d','Distancia',1,8,.1]];
SL.forEach(([k,n,mn,mx,st])=>{const l=document.createElement('label');l.innerHTML=`<span>${n}</span><input type="range" min="${mn}" max="${mx}" step="${st}">`;l.dataset.k=k;
  l.querySelector('input').oninput=e=>{const v=+e.target.value;k=='v'?AE.setV(v):S.sp[k]=v;S.sp.on=true;upd()};$('sps').appendChild(l)});
$('eqon').onclick=()=>{S.on=!S.on;upd()};$('spon').onclick=()=>{S.sp.on=!S.sp.on;upd()};
function ui(){
  $('eqon').classList.toggle('on',S.on);$('spon').classList.toggle('on',S.sp.on);
  bands.forEach((b,i)=>{b.querySelector('.th').style.top=(12-S.g[i])/24*100+'%';b.querySelector('.v').textContent=(S.g[i]>0?'+':'')+S.g[i]});
  document.querySelectorAll('#eqp .chip').forEach(c=>c.classList.toggle('on',c.dataset.k==S.pre));
  document.querySelectorAll('#spm .chip').forEach(c=>c.classList.toggle('on',S.sp.on&&c.dataset.k==S.sp.m));
  const o8=S.sp.m=='o8';
  document.querySelectorAll('#sps label').forEach(l=>{const k=l.dataset.k;l.querySelector('input').value=S.sp[k];l.classList.toggle('dis',!S.sp.on||(k=='w'?o8:(k=='v'||k=='d')?!o8:false))});
  const c=$('eqc'),r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(!r.width)return;
  c.width=r.width*d;c.height=r.height*d;const g=c.getContext('2d');g.scale(d,d);const W=r.width,H=r.height,cv=AE.curve();
  g.strokeStyle='#8884';g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2);g.stroke();
  g.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--acc')||'#e11d48';g.lineWidth=2.5;g.beginPath();
  cv.forEach((v,i)=>{const x=i/(cv.length-1)*W,y=H/2-Math.max(-14,Math.min(14,v))/14*(H/2-6);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();
}
function radar(){
  if($('eq').hidden)return;
  const c=$('spr'),r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  if(r.width){c.width=r.width*d;c.height=r.height*d;const g=c.getContext('2d');g.scale(d,d);const W=r.width,H=r.height,x0=W/2,y0=H/2,R=Math.min(W,H)/2-14,s=S.sp,acc=getComputedStyle(document.documentElement).getPropertyValue('--acc')||'#e11d48';
    g.strokeStyle='#8886';g.lineWidth=1;[.33,.66,1].forEach(k=>{g.beginPath();g.arc(x0,y0,R*k,0,6.2832);g.stroke()});
    g.fillStyle='#888';g.beginPath();g.arc(x0,y0,7,0,6.2832);g.fill();g.fillRect(x0-2,y0-12,4,6);
    const dot=(x,y,a=1)=>{g.globalAlpha=a;g.fillStyle=acc;g.beginPath();g.arc(x,y,9,0,6.2832);g.fill();g.globalAlpha=1};
    if(!s.on){g.fillStyle='#888';g.font='12px sans-serif';g.textAlign='center';g.fillText('3D apagado',x0,H-6)}
    else if(s.m=='o8'){const a=AE.th(AE.ac?AE.ac.currentTime:performance.now()/1000);dot(x0+Math.sin(a)*R*s.d/8,y0+Math.cos(a)*R*s.d/8)}
    else{const k=Math.min(1,.35+s.w/3)*R,e=s.r*18;dot(x0-k*.8,y0-k*.5);dot(x0+k*.8,y0-k*.5);g.strokeStyle=acc;g.globalAlpha=.4;g.beginPath();g.arc(x0,y0,R*(.45+s.r*.5)+e*0,0,6.2832);g.stroke();g.globalAlpha=1}}
  requestAnimationFrame(radar);
}
Object.assign(A,{eq:()=>{AE.init();$('eq').hidden=false;ui();radar()},eqx:()=>{$('eq').hidden=true}});
$('eq').addEventListener('click',e=>{if(e.target.id=='eq')$('eq').hidden=true});
}

