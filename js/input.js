/* ---------- Deslizar en la lista: fila a la derecha = a la cola (biblioteca); a los lados = cambiar de pestaña ---------- */
{const L=$('list'),ORD=['pls','lib','recent','queue'],TH=70;
 let st=null,swiped=0;
 const tabOf=()=>tabName(view);
 const goTab=d=>{const i=ORD.indexOf(tabOf())+d;if(i<0||i>=ORD.length)return;view=ORD[i];vstack=[];recFor='';render();
   L.classList.remove('slL','slR');void L.offsetWidth;L.classList.add(d>0?'slL':'slR')};
 const reset=r=>{if(!r)return;r.style.transition='transform .55s cubic-bezier(.3,2,.5,1)';r.style.transform='';setTimeout(()=>{r.classList.remove('sw');r.style.transition=''},600)};
 L.addEventListener('pointerdown',e=>{
   if((e.pointerType=='mouse'&&e.button!=0)||e.target.closest('.car,input')){st=null;return}
   st={x:e.clientX,y:e.clientY,id:e.pointerId,dir:0,row:(view=='lib'||isGrp(view))?e.target.closest('.t[data-i]'):null}});
 L.addEventListener('pointermove',e=>{
   if(!st||e.pointerId!=st.id)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;
   if(!st.dir){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){st=null;return}
     if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.5)st.dir=1;else return}
   const r=st.row;if(!r)return;
   if(dx>0){r.classList.add('sw');r.style.transition='none';r.style.transform='translateX('+Math.min(dx*.6,100)+'px)'}
   else{r.style.transition='none';r.style.transform=''}});
 const fin=e=>{
   if(!st||e.pointerId!=st.id)return;const s=st;st=null;if(!s.dir)return;
   swiped=Date.now();const r=s.row,dx=e.clientX-s.x,ok=e.type=='pointerup';
   if(ok&&r&&dx>=TH){const t=tracks[+r.dataset.i];if(t){queue.push(t);qchg();toast('Agregada a la cola');r.classList.add('qa');setTimeout(()=>r.classList.remove('qa'),800)}}
   else if(ok&&!(r&&dx>0)&&Math.abs(dx)>=TH)goTab(dx<0?1:-1);
   reset(r)};
 L.addEventListener('pointerup',fin);L.addEventListener('pointercancel',fin);
 L.addEventListener('click',e=>{if(Date.now()-swiped<350){e.stopPropagation();e.preventDefault()}},true);
}

/* ---------- Teclado: espacio = pausa; mantener espacio = RGB de la bolita ---------- */
{let sp=0,hd=false;
  const typing=e=>/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)&&e.target.type!='range';
  addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code=='Space'){
      if(typing(e))return;e.preventDefault();if(e.repeat||sp)return;
      sp=setTimeout(()=>{sp=-1;hd=true;if(!rgbRAF)rgbStart()},450);return;
    }
    if(typing(e)||e.target.type=='range'||$('fs').hidden||!$('sheet').hidden)return;
    if(e.key=='ArrowLeft'){VZ.step(-1)}else if(e.key=='ArrowRight'){VZ.step(1)}
    else if(e.key=='f'||e.key=='F'){VZ.imm()}
    else if(e.key=='v'||e.key=='V'){VZ.menu()}
    else if(e.key=='Escape'){VZ.immOn?VZ.imm(false):A.fsx()}
  });
  addEventListener('keyup',e=>{
    if(e.code!='Space'||!sp)return;e.preventDefault();clearTimeout(sp);sp=0;
    if(hd){hd=false;rgbStop()}else toggle();
  });
  addEventListener('blur',()=>{if(sp){clearTimeout(sp);sp=0}if(hd){hd=false;rgbStop()}});
}
