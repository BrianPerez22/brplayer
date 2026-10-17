/* ---------- Visualizador (análisis real del audio, estilo Windows Media Player) ---------- */
const VZ=(()=>{
const cv=$('vz'),g=cv.getContext('2d'),st=$('stage'),fsEl=$('fs'),TAU=Math.PI*2;
let ac=null,an=null,F=new Uint8Array(1024),T=new Uint8Array(2048).fill(128),on=0,w=0,h=0,raf=0,last=0,idle=0,immOn=false,ht=0,lt=0,fsOn=false,wl=null,rdy=-1,chk=0;
let mi=0;
const S={b:new Float32Array(96),bass:0,mid:0,hi:0,lvl:0,beat:0,hit:0,t:0,dt:.016,hue:210,avg:0,lb:0,amp:.3,g:1};
const hs=(a,s,l,o=1)=>`hsla(${(((a%360)+360)%360)|0},${s}%,${l}%,${o})`;
const rgb=(a,s,l)=>{a=((a%360)+360)%360;s/=100;l/=100;const k=n=>(n+a/30)%12,q=s*Math.min(l,1-l),f=n=>l-q*Math.max(-1,Math.min(k(n)-3,9-k(n),1));return[f(0)*255,f(8)*255,f(4)*255]};
const B=x=>{x=Math.max(0,Math.min(1,x))*95;const i=x|0,f=x-i;return S.b[i]*(1-f)+S.b[Math.min(95,i+1)]*f};
const fade=a=>{g.globalCompositeOperation='source-over';g.fillStyle=`rgba(0,0,0,${a})`;g.fillRect(0,0,w,h)};
const ring=(cx,cy,r,amp,n,k)=>{g.beginPath();for(let j=0;j<=n;j++){const a=j/n*TAU,rr=r+(T[(j*k)%2048]-128)/128*amp*S.g;j?g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):g.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}g.stroke()};

/* ----- Modos ----- */
const M=[
{n:'Carátula'},
{n:'Barras y ondas',i(){this.pk=new Float32Array(64)},d(){
  fade(1);const n=w<520?36:64,bw=w/n,pk=this.pk,gh=h*.78;
  const gr=g.createLinearGradient(0,h,0,h*.1);gr.addColorStop(0,hs(S.hue,90,42));gr.addColorStop(1,hs(S.hue+80,95,62));
  for(let i=0;i<n;i++){const v=B(i/(n-1));pk[i]=Math.max(v,pk[i]-S.dt*.45);
    g.fillStyle=gr;g.fillRect(i*bw+1,h-v*gh,bw-2,v*gh);
    g.fillStyle='#fff';g.fillRect(i*bw+1,h-pk[i]*gh-5,bw-2,3)}
  g.globalCompositeOperation='lighter';g.lineWidth=2.5;g.strokeStyle=hs(S.hue+180,100,65,.9);g.beginPath();
  for(let x=0;x<=w;x+=3){const y=h*.34+(T[(x/w*1024)|0]-128)/128*h*.22*S.g;x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();g.globalCompositeOperation='source-over'}},
{n:'Ambiente',d(){
  fade(.2);g.globalCompositeOperation='lighter';
  for(let k=0;k<8;k++){const v=B(k/8*.8),x=w*(.5+.38*Math.sin(S.t*.11*(k+1)+k*2)),y=h*(.5+.38*Math.cos(S.t*.09*(k+2)+k*1.7)),r=Math.min(w,h)*(.18+v*.5+S.beat*.12);
    const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,hs(S.hue+k*45,90,55,.3+v*.45));gr.addColorStop(1,hs(S.hue+k*45,90,50,0));
    g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  g.globalCompositeOperation='source-over'}},
{n:'Batería',i(){this.a=new Float32Array(10)},d(){
  fade(.2);g.globalCompositeOperation='lighter';g.lineJoin='round';const cx=w/2,cy=h/2,R=Math.min(w,h)*.5;
  for(let k=0;k<9;k++){const v=B(k/9*.85),n=3+k%5,r=R*(.1+k*.1)*(1+v*.3+S.beat*.12);this.a[k]+=S.dt*(k%2?1:-1)*(.3+k*.1+v*2.5);
    g.strokeStyle=hs(S.hue+k*38,95,58,.35+v*.6);g.lineWidth=1.5+v*7;g.beginPath();
    for(let j=0;j<=n;j++){const a=this.a[k]+j/n*TAU,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;j?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
  g.globalCompositeOperation='source-over'}},
{n:'Alquimia',i(){this.p=Array.from({length:180},()=>({a:Math.random()*TAU,r:Math.random(),s:(Math.random()-.5)*2,k:Math.random()}))},d(){
  fade(.14);g.globalCompositeOperation='lighter';const cx=w/2,cy=h/2,R=Math.min(w,h)/2;
  for(const p of this.p){const v=B(p.k*.9);p.a+=p.s*S.dt*(.6+S.hi*5+v*2);
    const rad=R*(.12+.75*p.r)*(1+v*.6+S.beat*.3),x=cx+Math.cos(p.a)*rad*1.1,y=cy+Math.sin(p.a*1.3+p.k*3)*rad*.85;
    g.fillStyle=hs(S.hue+p.k*120,95,60,.35+v*.65);g.beginPath();g.arc(x,y,1.2+v*4.5,0,TAU);g.fill()}
  g.globalCompositeOperation='source-over'}},
{n:'Sol',i(){this.a=0},d(){
  fade(.28);this.a+=S.dt*(.15+S.mid*1.2);g.globalCompositeOperation='lighter';
  const cx=w/2,cy=h/2,R=Math.min(w,h)/2,r0=R*.28*(1+S.beat*.14),n=120;g.lineCap='round';g.lineWidth=Math.max(2,R*TAU*.3/n);
  for(let i=0;i<n;i++){const m=i<n/2?i/(n/2):(n-i)/(n/2),v=B(m*.92),a=this.a+i/n*TAU,c=Math.cos(a),s=Math.sin(a),l=v*R*.62+2;
    g.strokeStyle=hs(S.hue+m*140,95,50+v*20,.85);g.beginPath();g.moveTo(cx+c*r0,cy+s*r0);g.lineTo(cx+c*(r0+l),cy+s*(r0+l));g.stroke()}
  g.lineCap='butt';g.lineWidth=2;g.strokeStyle=hs(S.hue+180,100,70,.9);ring(cx,cy,r0*.8,r0*.5,128,16);g.globalCompositeOperation='source-over'}},
{n:'Osciloscopio',crt:1,d(){
  fade(.22);g.globalCompositeOperation='lighter';const cx=w/2,cy=h/2;
  g.strokeStyle='rgba(60,255,120,.07)';g.lineWidth=1;g.beginPath();for(let i=1;i<8;i++){g.moveTo(w/8*i,0);g.lineTo(w/8*i,h);g.moveTo(0,h/8*i);g.lineTo(w,h/8*i)}g.stroke();
  for(const[lw,al]of[[8,.1],[2,.9]]){g.lineWidth=lw;g.strokeStyle=`rgba(90,255,140,${al})`;g.beginPath();
    for(let i=0;i<1024;i+=2){const x=cx+(T[i]-128)/128*S.g*w*.5,y=cy+(T[i+48]-128)/128*S.g*h*.5;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
  g.fillStyle='rgba(90,255,140,.7)';g.font='12px monospace';g.fillText('OSC  XY  '+(S.lvl*100|0)+'%',12,20);g.globalCompositeOperation='source-over'}},
{n:'Túnel',s:.6,i(){g.fillStyle='#000';g.fillRect(0,0,w,h)},d(){
  g.globalCompositeOperation='source-over';g.save();g.globalAlpha=.9;g.translate(w/2,h/2);g.rotate(.006+Math.sin(S.t*.4)*.01+S.mid*.015);
  const z=1.015+S.bass*.035+S.beat*.025;g.scale(z,z);g.drawImage(g.canvas,-w/2,-h/2,w,h);g.restore();fade(.035);
  g.globalCompositeOperation='lighter';const cx=w/2+Math.sin(S.t*.7)*w*.08,cy=h/2+Math.cos(S.t*.9)*h*.08,R=Math.min(w,h)*.22*(1+S.beat*.35);
  g.lineWidth=3;g.strokeStyle=hs(S.hue,100,60,.9);ring(cx,cy,R,R*.7,96,21);
  if(S.hit){g.strokeStyle=hs(S.hue+120,100,70,.8);g.lineWidth=6;g.beginPath();g.arc(cx,cy,R*1.5,0,TAU);g.stroke()}
  for(let i=0;i<24;i++){const a=i/24*TAU+S.t,v=B(i/24),q=3+v*8;g.fillStyle=hs(S.hue+i*15,100,60,v);g.fillRect(cx+Math.cos(a)*R*1.8,cy+Math.sin(a)*R*1.8,q,q)}
  g.globalCompositeOperation='source-over'}},
{n:'Espectrograma',i(){g.fillStyle='#000';g.fillRect(0,0,w,h)},d(){
  const dx=2;g.globalCompositeOperation='source-over';g.drawImage(g.canvas,-dx,0,w,h);
  for(let y=0;y<h;y+=3){const v=B(1-y/h);g.fillStyle=hs(270-v*270+S.hue*.15,100,Math.min(60,v*70));g.fillRect(w-dx,y,dx,3)}
  if(S.hit){g.fillStyle='rgba(255,255,255,.45)';g.fillRect(w-dx,0,dx,h)}}},
{n:'Montañas',i(){this.r=[];this.tm=0},d(){
  this.tm+=S.dt;if(this.tm>.07){this.tm=0;const a=new Float32Array(56);for(let i=0;i<56;i++)a[i]=B(i/55);this.r.unshift(a);if(this.r.length>30)this.r.pop()}
  fade(1);const N=30,x0=w*.12,ww=w*.76,top=h*.2,bot=h*.9;g.lineWidth=1.6;g.lineJoin='round';
  for(let k=this.r.length-1;k>=0;k--){const y=bot-(bot-top)*k/N,q=1-k/N,r=this.r[k];g.beginPath();g.moveTo(x0,y);
    for(let i=0;i<56;i++)g.lineTo(x0+i/55*ww,y-r[i]*h*.26*Math.pow(Math.sin(i/55*Math.PI),.7)*(1-k/N*.4));
    g.lineTo(x0+ww,y);g.closePath();g.fillStyle='#000';g.fill();g.strokeStyle=hs(S.hue+k*3,90,45+q*30,.25+q*.75);g.stroke()}}},
{n:'Estrellas',i(){this.st=Array.from({length:320},()=>({x:Math.random()*2-1,y:Math.random()*2-1,z:.1+Math.random()*.9,c:Math.random()*60}))},d(){
  fade(.25);g.globalCompositeOperation='lighter';g.lineCap='round';
  /* velocidad base propia: se ve bien aunque la música esté pausada o en silencio */
  const sp=(.5+S.bass*1.8+S.beat*1.5)*S.dt,cx=w/2+Math.sin(S.t*.5)*w*.06*(1+S.mid*3),cy=h/2+Math.cos(S.t*.4)*h*.05*(1+S.mid*3),m=Math.max(w,h)*.3;
  for(const s of this.st){const z0=s.z+sp+.004;s.z-=sp;const x1=cx+s.x/s.z*m,y1=cy+s.y/s.z*m;
    if(!isFinite(x1+y1+s.z)||s.z<.04||Math.abs(x1-cx)>w*.8||Math.abs(y1-cy)>h*.8){s.x=Math.random()*2-1;s.y=Math.random()*2-1;s.z=1;continue}
    const q=1-s.z,rx=x1-cx,ry=y1-cy,rl=Math.hypot(rx,ry)||1,len=Math.max(Math.hypot(x1-(cx+s.x/z0*m),y1-(cy+s.y/z0*m)),2+q*6);
    g.lineWidth=.9+q*2.4;g.strokeStyle=hs(S.hue+s.c,70,80,Math.min(1,.5+q*2));g.beginPath();g.moveTo(x1-rx/rl*len,y1-ry/rl*len);g.lineTo(x1,y1);g.stroke()}
  g.lineCap='butt';g.globalCompositeOperation='source-over'}},
{n:'Fuegos',i(){this.p=[];this.r=[];this.lt=0},d(){
  fade(.2);g.globalCompositeOperation='lighter';
  if(S.hit||(S.t-this.lt>1.4&&S.lvl>.12)){this.lt=S.t;this.r.push({x:w*(.15+Math.random()*.7),y:h,ty:h*(.15+Math.random()*.4),h:Math.random()*360})}
  for(const r of this.r){r.y-=h*1.1*S.dt;g.fillStyle='#fff';g.fillRect(r.x-1,r.y,2,8);
    if(r.y<=r.ty){r.d=1;const n=(40+S.lvl*80)|0;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=(.2+Math.random()*.8)*Math.min(w,h)*(.35+S.lvl*.5);this.p.push({x:r.x,y:r.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,h:r.h+Math.random()*40})}}}
  this.r=this.r.filter(r=>!r.d);
  for(const p of this.p){p.vy+=h*.35*S.dt;p.vx*=.985;p.vy*=.985;p.x+=p.vx*S.dt;p.y+=p.vy*S.dt;p.l-=S.dt*.7;g.fillStyle=hs(p.h,100,60,Math.max(0,p.l));g.fillRect(p.x,p.y,2.5,2.5)}
  this.p=this.p.filter(p=>p.l>0);if(this.p.length>900)this.p.splice(0,this.p.length-900);g.globalCompositeOperation='source-over'}},
{n:'Plasma',i(){const o=this.o=document.createElement('canvas');this.pw=w<500?72:110;this.ph=Math.max(2,Math.round(this.pw*h/w));o.width=this.pw;o.height=this.ph;this.c=o.getContext('2d');this.im=this.c.createImageData(this.pw,this.ph);this.pal=new Uint8Array(768)},d(){
  const{pw,ph,im,pal}=this,D=im.data;
  for(let i=0;i<256;i++){const c=rgb(S.hue+i*1.1,95,Math.max(6,(Math.sin(i/256*TAU*3)*.5+.5)*(38+S.lvl*40)));pal[i*3]=c[0];pal[i*3+1]=c[1];pal[i*3+2]=c[2]}
  const t=S.t*(.6+S.mid*.8),f=1+S.bass*1.5,ar=ph/pw*6;
  for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){const u=x/pw*6,v=y/ph*ar;
    const q=Math.sin(u*f+t)+Math.sin(v*1.3*f-t*1.2)+Math.sin((u+v)*.8+t*.7)+Math.sin(Math.hypot(u-3+Math.sin(t*.5)*2,v-ar/2)*1.8*f-t*2);
    const k=((((q+4)*32)+S.t*30+S.beat*40)|0)&255,o=(y*pw+x)*4;D[o]=pal[k*3];D[o+1]=pal[k*3+1];D[o+2]=pal[k*3+2];D[o+3]=255}
  this.c.putImageData(im,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(this.o,0,0,w,h)}},
{n:'Bola',i(){const R=Math.min(w,h);this.r=R*.07;this.x=w*(.3+Math.random()*.4);this.y=h*(.3+Math.random()*.4);this.sp=R*.38;
  const a=(Math.random()*4|0)*Math.PI/2+.5+Math.random()*.5;this.vx=Math.cos(a)*this.sp;this.vy=Math.sin(a)*this.sp;
  this.h=22;this.err=0;this.jt=0;this.cf=0;this.rg=0;this.nb=0;this.nc=0;this.cp=[]},
busy(){return this.err>0||this.cf>.02},
poke(px,py){if(Math.hypot(px-this.x,py-this.y)>this.r*2.2)return false;this.err=2.6;this.jt=0;this.rg=1;idle=0;kick();return true},
d(){
  fade(.2);const dt=S.dt,k=1+S.bass*1.4+S.beat;
  if(this.err>0){this.err-=dt;this.jt-=dt;this.h+=dt*420;
    if(this.jt<=0){this.jt=.06+Math.random()*.1;const a=Math.random()*TAU,v=this.sp*(2+Math.random()*2.5);this.vx=Math.cos(a)*v;this.vy=Math.sin(a)*v}
    if(this.err<=0){const m=Math.hypot(this.vx,this.vy)||1;this.vx*=this.sp/m;this.vy*=this.sp/m}}
  const r=this.r*(1+S.beat*.25+S.bass*.15);let hx=0,hy=0;
  this.x+=this.vx*k*dt;this.y+=this.vy*k*dt;
  if(this.x<r){this.x=r;this.vx=Math.abs(this.vx);hx=1}else if(this.x>w-r){this.x=w-r;this.vx=-Math.abs(this.vx);hx=1}
  if(this.y<r){this.y=r;this.vy=Math.abs(this.vy);hy=1}else if(this.y>h-r){this.y=h-r;this.vy=-Math.abs(this.vy);hy=1}
  const x=this.x,y=this.y;
  if(hx||hy){this.h+=70+Math.random()*50;this.nb++;this.rg=1;
    if(hx&&hy){this.cf=1;this.nc++;for(let i=0;i<150;i++){const a=Math.random()*TAU,v=Math.min(w,h)*(.2+Math.random()*.9);this.cp.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,h:Math.random()*360,s:2+Math.random()*4})}}}
  const cf=this.cf;if(cf>.02)this.h+=dt*900*cf;
  const hue=window.RGBH!=null?window.RGBH:this.h;
  g.globalCompositeOperation='lighter';
  /* esquina: todo se llena de color */
  if(cf>.01){const lg=g.createLinearGradient(0,0,w,h);for(let i=0;i<=6;i++)lg.addColorStop(i/6,hs(i*60+S.t*240,100,55,cf*.5));g.fillStyle=lg;g.fillRect(0,0,w,h);
    g.fillStyle=`rgba(255,255,255,${cf*.2})`;g.fillRect(0,0,w,h);
    g.fillStyle=hs(S.t*500,100,80,cf);g.font='bold '+(Math.min(w,h)*.09|0)+'px -apple-system,sans-serif';g.textAlign='center';g.fillText('¡ESQUINA!',w/2,h/2);g.textAlign='start';this.cf*=Math.pow(.05,dt)}
  for(const c of this.cp){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=h*.4*dt;c.l-=dt*.9;if(c.l>0){g.fillStyle=hs(c.h+S.t*200,100,62,c.l);g.fillRect(c.x,c.y,c.s,c.s)}}
  this.cp=this.cp.filter(c=>c.l>0);
  if(this.rg>.01){g.lineWidth=3;g.strokeStyle=hs(hue,100,70,this.rg);g.beginPath();g.arc(x,y,r*(1+(1-this.rg)*2.5),0,TAU);g.stroke();this.rg*=Math.pow(.03,dt)}
  /* aura: late con la música */
  const ar=r*(2.4+S.bass*3.2+S.beat*2.2+cf*2);
  let gr=g.createRadialGradient(x,y,r*.6,x,y,ar);gr.addColorStop(0,hs(hue,100,65,.55+S.beat*.35));gr.addColorStop(.5,hs(hue+40,100,60,.12+S.mid*.35));gr.addColorStop(1,hs(hue+80,100,55,0));
  g.fillStyle=gr;g.fillRect(x-ar,y-ar,ar*2,ar*2);
  g.lineCap='round';g.lineWidth=Math.max(2,r*.12);
  for(let i=0;i<64;i++){const m=i<32?i/32:(64-i)/32,v=B(m*.9),a=i/64*TAU+S.t*.4,c=Math.cos(a),n=Math.sin(a),r0=r*1.15,l=r*(.2+v*2.3+S.beat*.4)*(1+cf*.6);
    g.strokeStyle=hs(cf>.02?i*5.6+S.t*300:hue+m*90,100,62,.22+v*.65);g.beginPath();g.moveTo(x+c*r0,y+n*r0);g.lineTo(x+c*(r0+l),y+n*(r0+l));g.stroke()}
  g.lineCap='butt';g.lineWidth=2;g.strokeStyle=hs(hue+180,100,72,.65);ring(x,y,r*1.9+S.bass*r,r*.6,96,21);
  g.globalCompositeOperation='source-over';
  gr=g.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r);gr.addColorStop(0,hs(hue,100,86));gr.addColorStop(1,hs(hue,95,64));
  g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  g.fillStyle='rgba(255,255,255,.55)';g.font='12px monospace';g.fillText('rebotes '+this.nb+' · esquinas '+this.nc,12,h-12)}}
];
const N=M.length;

/* ----- Audio ----- */
function conn(){
  if(!AE.init())return false;
  if(an!==AE.an){ac=AE.ac;an=AE.an;F=new Uint8Array(an.frequencyBinCount);T=new Uint8Array(an.fftSize).fill(128)}
  if(ac.state!='running')ac.resume().catch(()=>{});return true;
}
function ana(now){
  const dt=Math.max(.001,Math.min(.05,(now-last)/1000||.016));last=now;S.dt=dt;S.t+=dt;
  if(an){an.getByteFrequencyData(F);an.getByteTimeDomainData(T)}
  let mx=0;for(let i=0;i<2048;i+=2){const d=Math.abs(T[i]-128);if(d>mx)mx=d}
  S.amp=Math.max(mx/128,S.amp*.996);S.g=Math.min(3,.7/Math.max(.12,S.amp));
  for(let i=0;i<96;i++){const a=Math.floor(2*Math.pow(380,i/96)),z=Math.max(a+1,Math.floor(2*Math.pow(380,(i+1)/96)));let s=0;for(let k=a;k<z;k++)s+=F[k];S.b[i]=Math.min(1,s/(z-a)/255*(1+i/96*.8))}
  const av=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=S.b[i];return s/(b-a)};
  S.bass=av(0,12)||0;S.mid=av(12,50)||0;S.hi=av(50,96)||0;S.lvl=S.bass*.4+S.mid*.4+S.hi*.2;
  S.avg=S.avg*.96+S.bass*.04;S.hit=0;
  if(S.bass>S.avg*1.28+.04&&S.bass>.3&&S.t-S.lb>.2){S.hit=1;S.lb=S.t;S.beat=1}
  S.beat*=Math.pow(.02,dt);
  S.hue=window.RGBH!=null?window.RGBH:(S.hue+dt*14+S.hit*25)%360;
}
function frame(now){
  raf=0;if(!on||mi<1||document.hidden)return;
  if(rdy!==mi){size();if(rdy!==mi){raf=requestAnimationFrame(frame);return}}
  if(++chk>20){chk=0;const r=st.getBoundingClientRect();if(Math.abs(r.width-w)>1||Math.abs(r.height-h)>1)size()}
  ana(now);try{M[mi].d()}catch(e){console.error(e);rdy=-1}
  if(au.paused&&S.lvl<.004&&!(M[mi].busy&&M[mi].busy())){if(++idle>90)return}else idle=0;
  raf=requestAnimationFrame(frame);
}
function kick(){idle=0;if(!raf&&on&&mi>0&&!document.hidden){last=performance.now();raf=requestAnimationFrame(frame)}}

/* ----- Tamaño y modos ----- */
function size(){
  const r=st.getBoundingClientRect();if(r.width<2||r.height<2||mi<1)return;
  w=r.width;h=r.height;const m=M[mi],dev=Math.max(.75,Math.min(2,devicePixelRatio||1,Math.sqrt(1.8e6/(w*h)))),sc=(typeof m.s=='number'?m.s:1)*dev;
  cv.width=Math.round(w*sc);cv.height=Math.round(h*sc);g.setTransform(cv.width/w,0,0,cv.height/h,0,0);
  g.globalCompositeOperation='source-over';g.fillStyle='#000';g.fillRect(0,0,w,h);if(m.i)m.i();rdy=mi;
}
let lbT=0;
function fit(){if(!on||mi<1)return;const r=st.getBoundingClientRect();if(Math.abs(r.width-w)>1||Math.abs(r.height-h)>1||rdy!==mi){size();kick()}}
const settle=()=>[60,200,500,1000].forEach(d=>setTimeout(fit,d));
function lab(t){const e=$('vlab');e.textContent=t;e.classList.add('show');clearTimeout(lbT);lbT=setTimeout(()=>e.classList.remove('show'),1600);$('vmn').textContent=t}
function setMode(i){
  mi=(i+N)%N;
  st.classList.toggle('v',mi>0);st.toggleAttribute('data-crt',!!M[mi].crt);
  cancelAnimationFrame(raf);raf=0;
  if(mi>0){size();if(on&&!conn())lab('Visualizador sin acceso al audio');kick()}
  lab(M[mi].n);if(immOn)hud(true);
}
function mini(){$('vmc').src=$('fcv').src;$('vmt').textContent=$('ftt').textContent;$('vma').textContent=$('fta').textContent}
function hud(v){clearTimeout(ht);fsEl.classList.toggle('hud',v);if(v){mini();ht=setTimeout(()=>fsEl.classList.remove('hud'),3200)}}
function imm(v){
  if(v===undefined)v=!immOn;
  if(v&&mi==0)setMode(1);
  immOn=v;fsEl.classList.toggle('imm',v);hud(v);
  try{
    if(v){const r=(fsEl.requestFullscreen||fsEl.webkitRequestFullscreen);r&&Promise.resolve(r.call(fsEl)).catch(()=>{});
      navigator.wakeLock&&navigator.wakeLock.request('screen').then(l=>wl=l).catch(()=>{})}
    else{if(document.fullscreenElement||document.webkitFullscreenElement)(document.exitFullscreen||document.webkitExitFullscreen).call(document);if(wl){wl.release();wl=null}}
  }catch(e){}
  requestAnimationFrame(()=>{size();kick()});settle();
}
function open(){on=1;conn();setMode(mi);hud(false)}
function close(){if(immOn)imm(false);on=0;cancelAnimationFrame(raf);raf=0}

/* ----- Eventos ----- */
new ResizeObserver(()=>{if(on){size();kick()}}).observe(st);
addEventListener('orientationchange',()=>setTimeout(()=>{if(on){size();kick()}},350));addEventListener('resize',()=>{if(on)settle()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(ac&&!au.paused&&ac.state!='running')ac.resume().catch(()=>{});kick()}});
au.addEventListener('play',()=>{if(on){conn();kick()}});
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{
  settle();if(document.fullscreenElement||document.webkitFullscreenElement)fsOn=true;else if(fsOn){fsOn=false;if(immOn)imm(false)}}));
{let px=0,py=0,pd=0;
  st.addEventListener('pointerdown',e=>{if(e.target.closest('#vhud'))return;px=e.clientX;py=e.clientY;pd=1});
  st.addEventListener('pointerup',e=>{if(!pd)return;pd=0;const dx=e.clientX-px,dy=e.clientY-py;
    if(M[mi].poke&&Math.abs(dx)<12&&Math.abs(dy)<12){const r=st.getBoundingClientRect();if(M[mi].poke(e.clientX-r.left,e.clientY-r.top))return}
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)setMode(mi+(dx<0?1:-1));
    else if(immOn&&Math.abs(dx)<12&&Math.abs(dy)<12)hud(!fsEl.classList.contains('hud'))});
  st.addEventListener('pointercancel',()=>pd=0);
  st.addEventListener('pointermove',e=>{if(immOn&&e.pointerType=='mouse')hud(true)});
}
{const f=()=>{if(immOn)hud(true)};
  new MutationObserver(f).observe($('ftt'),{childList:true,characterData:true,subtree:true});
  new MutationObserver(f).observe($('fcv'),{attributes:true,attributeFilter:['src']})}
return{open,close,imm,kick,step:d=>setMode(mi+d),menu:()=>{if(immOn)hud(true);openSheet('Visualización',M.map((m,k)=>[m.n,k==mi?'check':'viz',()=>setMode(k)]))},get immOn(){return immOn}};
})();

Object.assign(A,{
  fs:()=>{$('fs').hidden=false;VZ.open()},
  fsx:()=>{VZ.close();$('fs').hidden=true},
  vzm:VZ.menu,vzf:()=>VZ.imm(),vprev:()=>VZ.step(-1),vnext:()=>VZ.step(1),
  vorb:()=>{document.querySelectorAll('.orb').forEach(o=>{const b=o.firstElementChild;b.style.left=(6+Math.random()*Math.max(0,o.clientWidth-b.offsetWidth-12))+'px'});VZ.step(1)}
});
{const orbs=()=>{document.querySelectorAll('.orb').forEach(o=>o.classList.toggle('play',!au.paused));document.body.classList.toggle('pl',!au.paused)};
  ['play','pause'].forEach(ev=>au.addEventListener(ev,orbs));orbs();
  const bar=$('bar'),setMin=v=>{bar.classList.toggle('min',v);document.body.classList.toggle('bmin',v);try{localStorage.setItem('bmin',v?1:0)}catch(e){}};
  setMin(localStorage.getItem('bmin')=='1');A.bmin=()=>setMin(!bar.classList.contains('min'))}

{const g=$('bgrab'),bar=$('bar'),set=v=>{bar.classList.toggle('min',v);document.body.classList.toggle('bmin',v);try{localStorage.setItem('bmin',v?1:0)}catch(e){}};
 let y0=null,moved=false;
 g.addEventListener('pointerdown',e=>{y0=e.clientY;moved=false;g.setPointerCapture(e.pointerId)});
 g.addEventListener('pointermove',e=>{if(y0==null)return;const d=e.clientY-y0;if(Math.abs(d)>18){moved=true;set(d>0);y0=e.clientY}});
 const end=e=>{if(y0==null)return;if(!moved&&e.type=='pointerup')set(!bar.classList.contains('min'));y0=null};
 g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
}

