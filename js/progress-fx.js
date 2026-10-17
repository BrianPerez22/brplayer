
/* ---------- Barra de progreso: agua, electricidad o fuego (al azar por canción) ---------- */
const SKFX=(()=>{
  const cs=[...document.querySelectorAll('.skc')],root=document.documentElement,TAU=Math.PI*2,calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const NFX=6;let fx=Math.random()*NFX|0,raf=0,last=0,t=0,popUntil=0;const hz=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)};
  cs.forEach(c=>{c._s={arc:[],at:0,fire:[],bub:[],gl:[],gt:0,go:0,px:[]};c._w=0;c._h=0;c._d=1;
    new ResizeObserver(()=>{const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c._w=r.width;c._h=r.height;c._d=d;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);once()}).observe(c)});
  function bar(c,dt,acc,mut,now){
    const W=c._w,H=c._h;if(!(W>=20)||!c._s)return;const g=c.getContext('2d'),S=c._s;g.setTransform(c._d,0,0,c._d,0,0);g.clearRect(0,0,W,H);
    const p=Math.min(1,Math.max(0,c.nextElementSibling.value/1000)),x0=8,x1=W-8,xh=x0+(x1-x0)*p,cy=H/2,th=3,L=xh-x0;
    if(fx!=5){g.lineCap='round';g.lineWidth=6;g.globalAlpha=.35;g.strokeStyle=mut;g.beginPath();g.moveTo(x0,cy);g.lineTo(x1,cy);g.stroke();g.globalAlpha=1}
    else if(L<1){const q=4,ty=Math.round(cy-6);g.fillStyle=mut;g.globalAlpha=.32;for(let i=0,n=Math.floor((x1-x0)/q);i<n;i++)g.fillRect(x0+i*q,ty+q,q-1,q-1);g.globalAlpha=1}
    if(now<popUntil){const k=1-(popUntil-now)/600;g.globalAlpha=(1-k)*.7;g.strokeStyle=acc;g.lineWidth=2;g.beginPath();g.arc(xh,cy,9+k*14,0,TAU);g.stroke();g.globalAlpha=1;g.lineWidth=6}
    if(L<1)return;
    if(fx==0){ /* agua */
      g.fillStyle=acc;g.beginPath();const n=Math.max(2,(L/3)|0);
      for(let i=0;i<=n;i++){const x=x0+L*i/n;g.lineTo(x,cy-th-Math.sin(x*.28-t*2.4)*1.3-Math.sin(x*.11+t*1.3)*.8)}
      for(let i=n;i>=0;i--){const x=x0+L*i/n;g.lineTo(x,cy+th+Math.sin(x*.26+t*2-1)*1.3+Math.sin(x*.13-t*1.1)*.8)}
      g.closePath();g.fill();g.beginPath();g.arc(x0,cy,th,0,TAU);g.fill();
      g.globalAlpha=.3;g.fillStyle='#fff';for(let k=0;k<4;k++){const x=x0+((t*16+k*L/4)%L);g.fillRect(x,cy-1.6+Math.sin(t*3+k),7,1.2)}
      const rp=(t*.7)%1;g.globalAlpha=(1-rp)*.55;g.strokeStyle=acc;g.lineWidth=1.5;g.beginPath();g.arc(xh,cy,9+rp*11,0,TAU);g.stroke();
      const rq=(t*.7+.5)%1;g.globalAlpha=(1-rq)*.35;g.beginPath();g.arc(xh,cy,9+rq*11,0,TAU);g.stroke();
    }else if(fx==1){ /* electricidad */
      g.strokeStyle=acc;g.beginPath();g.moveTo(x0,cy);g.lineTo(xh,cy);g.stroke();
      if(now-S.at>90){S.at=now;S.arc=[];if(Math.random()<.72){const n=Math.max(3,(L/9)|0);for(let i=0;i<=n;i++)S.arc.push([x0+L*i/n,cy+(i==0||i==n?0:(Math.random()-.5)*9)])}}
      if(S.arc.length){g.globalCompositeOperation='lighter';g.lineCap='butt';g.lineJoin='round';
        for(const[lw,al,col]of[[4,.22,acc],[1.2,.8,'#fff']]){g.lineWidth=lw;g.globalAlpha=al;g.strokeStyle=col;g.beginPath();S.arc.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke()}
        g.lineWidth=1;g.globalAlpha=.7;g.strokeStyle='#fff';g.beginPath();for(let k=0;k<3;k++){const a=Math.random()*TAU,l=4+Math.random()*7;g.moveTo(xh,cy);g.lineTo(xh+Math.cos(a)*l,cy+Math.sin(a)*l)}g.stroke();
        g.globalCompositeOperation='source-over'}
    }else if(fx==2){ /* fuego */
      g.strokeStyle=acc;g.beginPath();g.moveTo(x0,cy);g.lineTo(xh,cy);g.stroke();
      for(let k=0;k<3;k++){const hh=6+Math.sin(t*14+k*2)*3+Math.sin(t*23+k)*2,bx=xh-10+k*5;g.globalAlpha=.5;g.fillStyle=acc;g.beginPath();g.moveTo(bx-3,cy-th+1);g.quadraticCurveTo(bx-1,cy-th-hh*.5,bx+Math.sin(t*9+k)*1.5,cy-th-hh);g.quadraticCurveTo(bx+1,cy-th-hh*.5,bx+3,cy-th+1);g.fill()}
      if(dt>0){const n=1+(Math.random()<.5?1:0);for(let i=0;i<n;i++)S.fire.push({x:xh-Math.random()*8,y:cy-th,vx:(Math.random()-.5)*6,vy:-(14+Math.random()*16),l:1,w:Math.random()});
        if(Math.random()<.4)S.fire.push({x:x0+Math.random()*L,y:cy-th,vx:(Math.random()-.5)*4,vy:-(8+Math.random()*10),l:.7,w:Math.random()});if(S.fire.length>70)S.fire.splice(0,S.fire.length-70)}
      g.globalCompositeOperation='lighter';
      for(const f of S.fire){f.x+=f.vx*dt;f.y+=f.vy*dt;f.l-=dt*1.7;if(f.l<=0)continue;const r=1+f.l*2.2;
        g.globalAlpha=f.l*.35;g.fillStyle=acc;g.beginPath();g.arc(f.x,f.y,r*1.6,0,TAU);g.fill();
        g.globalAlpha=f.l*.8;g.fillStyle=`hsl(${28+f.w*20},100,62%)`;g.beginPath();g.arc(f.x,f.y,r*.6,0,TAU);g.fill()}
      S.fire=S.fire.filter(f=>f.l>0);g.globalCompositeOperation='source-over'
    }else if(fx==3){ /* burbujas */
      g.strokeStyle=acc;g.beginPath();g.moveTo(x0,cy);g.lineTo(xh,cy);g.stroke();
      g.globalAlpha=.2;g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.moveTo(x0,cy-1.5);g.lineTo(xh,cy-1.5);g.stroke();
      if(dt>0){if(Math.random()<Math.min(.9,.15+L/600))S.bub.push({x:x0+Math.random()*L,y:cy,vy:-(10+Math.random()*12),ph:Math.random()*TAU,r:1+Math.random()*2.2,l:1});
        if(Math.random()<.25)S.bub.push({x:xh-Math.random()*6,y:cy,vy:-(12+Math.random()*10),ph:Math.random()*TAU,r:1.2+Math.random()*2,l:1});if(S.bub.length>40)S.bub.splice(0,S.bub.length-40)}
      g.lineWidth=1;
      for(const b of S.bub){b.y+=b.vy*dt;b.x+=Math.sin(t*3+b.ph)*dt*6;b.l-=dt*1.3;if(b.l<=0)continue;
        if(b.l>.14){g.globalAlpha=Math.min(1,b.l*1.2)*.9;g.strokeStyle=acc;g.beginPath();g.arc(b.x,b.y,b.r,0,TAU);g.stroke();g.globalAlpha=b.l*.15;g.fillStyle=acc;g.fill();
          g.globalAlpha=b.l*.7;g.fillStyle='#fff';const q=Math.max(1,b.r*.45);g.fillRect(b.x-b.r*.5,b.y-b.r*.5,q,q)}
        else{g.globalAlpha=b.l*5;g.strokeStyle=acc;g.beginPath();g.arc(b.x,b.y,b.r*(1+(.14-b.l)*14),0,TAU);g.stroke()}}
      S.bub=S.bub.filter(b=>b.l>0)
    }else if(fx==4){ /* glitch */
      if(now-S.gt>(S.go?75:240+Math.random()*520)){S.gt=now;S.go=Math.random()<.6?1:0;S.gl=[];
        if(S.go){const n=2+(Math.random()*4|0);for(let i=0;i<n;i++)S.gl.push({x:x0+Math.random()*L,w:5+Math.random()*36,dy:(Math.random()-.5)*12,dx:(Math.random()-.5)*18,c:Math.random()})}}
      g.lineCap='butt';g.strokeStyle=acc;g.lineWidth=6;g.beginPath();g.moveTo(x0,cy);g.lineTo(xh,cy);g.stroke();
      g.fillStyle=acc;g.fillRect(xh-1.5,cy-6,3,12);
      if(S.go){
        g.globalCompositeOperation='lighter';g.lineWidth=3;g.globalAlpha=.8;
        g.strokeStyle='#ff1744';g.beginPath();g.moveTo(x0-3,cy-2.5);g.lineTo(xh-3,cy-2.5);g.stroke();
        g.strokeStyle='#00e5ff';g.beginPath();g.moveTo(x0+3,cy+2.5);g.lineTo(xh+3,cy+2.5);g.stroke();
        g.globalCompositeOperation='source-over';g.globalAlpha=1;
        for(const s of S.gl){const a=Math.max(x0,s.x),b=Math.min(xh+16,s.x+s.w);if(b<=a)continue;
          g.clearRect(a,cy-5,b-a,10);g.fillStyle=s.c<.25?'#fff':s.c<.5?'#00e5ff':acc;g.fillRect(a+s.dx,cy-3+s.dy,b-a,s.c<.5?3:6)}
      }
    }else{ /* pixeles */
      const q=4,R=3,ty=Math.round(cy-R*q/2),ts=(t*6)|0,pc=Math.max(0,Math.floor(L/q)),tot=Math.floor((x1-x0)/q);
      g.lineCap='butt';g.fillStyle=mut;g.globalAlpha=.32;
      for(let i=pc;i<tot;i++)g.fillRect(x0+i*q,ty+q,q-1,q-1);
      g.fillStyle=acc;
      for(let i=0;i<pc;i++)for(let r=0;r<R;r++){g.globalAlpha=r==1?1:.5+.5*hz(i+r*57,ts+i%4);g.fillRect(x0+i*q,ty+r*q,q-1,q-1)}
      g.globalAlpha=1;g.fillRect(x0+pc*q,ty+q,q-1,q-1);g.fillStyle='#fff';g.globalAlpha=.55+.45*hz(ts,3);g.fillRect(x0+pc*q,ty+q,q-1,q-1);
      if(dt>0){if(Math.random()<.55){const up=Math.random()<.5;S.px.push({x:x0+Math.max(0,pc-(Math.random()*7|0))*q,y:ty+(up?-q:R*q),vy:up?-1:1,l:1})}if(S.px.length>26)S.px.shift()}
      for(const p of S.px){p.y+=p.vy*dt*18;p.l-=dt*1.4;if(p.l<=0)continue;g.globalAlpha=p.l*.85;g.fillStyle=acc;g.fillRect(p.x,ty+Math.round((p.y-ty)/q)*q,q-1,q-1)}
      S.px=S.px.filter(p=>p.l>0);
    }
    g.globalAlpha=1;g.lineCap='butt';
  }
  function draw(dt){
    const cst=getComputedStyle(root),acc=cst.getPropertyValue('--acc').trim()||'#e11d48',mut=cst.getPropertyValue('--mut').trim()||'#777',now=performance.now();
    cs.forEach(c=>bar(c,dt,acc,mut,now));
  }
  function loop(now){raf=0;if(document.hidden||au.paused)return;const dt=Math.min(.1,(now-last)/1000);
    if(dt>=.032||!last){last=now;t+=dt;draw(dt)}raf=requestAnimationFrame(loop)}
  function kick(){if(!raf&&!calm&&!au.paused&&!document.hidden){last=0;raf=requestAnimationFrame(loop)}}
  function once(){if(!raf)draw(0)}
  au.addEventListener('loadstart',()=>{fx=(fx+1+(Math.random()*(NFX-1)|0))%NFX;once()});
  /* tocar con precisión la bolita de la barra cambia la animación */
  const popLoop=()=>{draw(0);if(performance.now()<popUntil)requestAnimationFrame(popLoop)};
  function next(){fx=(fx+1)%NFX;popUntil=performance.now()+600;if(!raf)popLoop()}
  cs.forEach(c=>{const w=c.parentElement;let st=null;
    w.addEventListener('pointerdown',e=>{st=e._skThumb?{x:e.clientX,y:e.clientY,t:performance.now()}:null});
    w.addEventListener('pointerup',e=>{if(st&&Math.hypot(e.clientX-st.x,e.clientY-st.y)<6&&performance.now()-st.t<450)next();st=null});
    w.addEventListener('pointercancel',()=>{st=null})});
  au.addEventListener('play',kick);
  ['pause','timeupdate','seeked','loadedmetadata'].forEach(ev=>au.addEventListener(ev,once));
  cs.forEach(c=>c.nextElementSibling.addEventListener('input',once));
  document.addEventListener('visibilitychange',()=>{kick();once()});
  once();
  return{once,kick,get fx(){return fx},setFx(n){fx=n;once()}};
})();

