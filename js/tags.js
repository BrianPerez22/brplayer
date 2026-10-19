/* ---------- Etiquetas (ID3 / FLAC) ---------- */
const dec=(b,enc)=>{try{let l='windows-1252';if(enc==3)l='utf-8';else if(enc==2)l='utf-16be';else if(enc==1){if(b[0]==0xFE&&b[1]==0xFF){l='utf-16be';b=b.subarray(2)}else{l='utf-16le';if(b[0]==0xFF&&b[1]==0xFE)b=b.subarray(2)}}return new TextDecoder(l).decode(b).split('\0').map(s=>s.trim()).filter(Boolean).join(', ')}catch(e){return''}};
function parseID3(b,ver,t){
  let p=10;(t.meta=t.meta||{})['Etiquetas']='ID3v2.'+ver;
  while(p+10<b.length){
    const id=String.fromCharCode(b[p],b[p+1],b[p+2],b[p+3]);if(b[p]==0)break;
    const sz=ver==4?(b[p+4]<<21)|(b[p+5]<<14)|(b[p+6]<<7)|b[p+7]:((b[p+4]<<24)|(b[p+5]<<16)|(b[p+6]<<8)|b[p+7])>>>0;
    const d=b.subarray(p+10,p+10+sz);p+=10+sz;
    if(id=='TIT2')t.title=dec(d.subarray(1),d[0])||t.title;
    else if(id=='TPE1')t.artist=dec(d.subarray(1),d[0]);
    else if(id=='TALB')t.album=dec(d.subarray(1),d[0]);
    else if(id[0]=='T'&&FR[id]){t.meta[FR[id]]=dec(d.subarray(1),d[0])}
    else if(id=='APIC'&&!t.cover){
      const enc=d[0];let i=1;while(i<d.length&&d[i])i++;const mime=String.fromCharCode(...d.subarray(1,i));i+=2;
      if(enc==1||enc==2){while(i<d.length-1&&!(d[i]==0&&d[i+1]==0))i+=2;i+=2}else{while(i<d.length&&d[i])i++;i++}
      t.cover=new Blob([d.slice(i)],{type:mime.includes('/')?mime:'image/jpeg'});
    }
  }
}
async function parseFlac(f,t){
  let p=4,last=false;
  while(!last&&p<f.size){
    const h=new Uint8Array(await f.slice(p,p+4).arrayBuffer());last=h[0]>>7;const ty=h[0]&127,len=(h[1]<<16)|(h[2]<<8)|h[3];p+=4;
    if((ty==0||ty==4||ty==6)&&len<12e6){
      const b=new Uint8Array(await f.slice(p,p+len).arrayBuffer()),v=new DataView(b.buffer);
      if(ty==0){const m=t.meta=t.meta||{};m['Frecuencia']=((b[10]<<12)|(b[11]<<4)|(b[12]>>4))+' Hz';m['Canales']=((b[12]>>1)&7)+1;m['Bits por muestra']=(((b[12]&1)<<4)|(b[13]>>4))+1;m['Etiquetas']='FLAC (Vorbis)'}
      else if(ty==4){
        let o=4+v.getUint32(0,true);const n=v.getUint32(o,true);o+=4;
        for(let k=0;k<n&&o<b.length;k++){const l=v.getUint32(o,true);o+=4;const s=new TextDecoder().decode(b.subarray(o,o+l));o+=l;const e=s.indexOf('=');if(e<0)continue;const key=s.slice(0,e).toUpperCase(),val=s.slice(e+1);
          if(key=='TITLE')t.title=val;else if(key=='ARTIST')t.artist=val;else if(key=='ALBUM')t.album=val;else(t.meta=t.meta||{})[key]=val}
      }else if(!t.cover){
        let o=4;const ml=v.getUint32(o);o+=4;const mime=new TextDecoder().decode(b.subarray(o,o+ml));o+=ml;const dl=v.getUint32(o);o+=4+dl+16;const il=v.getUint32(o);o+=4;
        t.cover=new Blob([b.slice(o,o+il)],{type:mime||'image/jpeg'});
      }
    }
    p+=len;
  }
}
async function readTags(f){
  const t={title:f.name.replace(/\.[^.]+$/,''),artist:'',album:'',cover:null};
  try{
    const h=new Uint8Array(await f.slice(0,10).arrayBuffer());
    if(h[0]==0x49&&h[1]==0x44&&h[2]==0x33){
      const size=(h[6]<<21)|(h[7]<<14)|(h[8]<<7)|h[9];
      parseID3(new Uint8Array(await f.slice(0,10+Math.min(size,12e6)).arrayBuffer()),h[3],t);
    }else if(h[0]==0x66&&h[1]==0x4C&&h[2]==0x61&&h[3]==0x43)await parseFlac(f,t);
  }catch(e){}
  return t;
}
async function artURL(blob,mx=512){
  if(!blob)return null;
  try{
    const bm=await createImageBitmap(blob);
    const s=Math.min(1,mx/Math.max(bm.width,bm.height)),W=Math.max(1,Math.round(bm.width*s)),H=Math.max(1,Math.round(bm.height*s));
    /* reducción por mitades + suavizado alto: evita el aspecto borroso/dentado al achicar mucho */
    let src=bm,sw=bm.width,sh=bm.height;
    while(sw/2>=W&&sh/2>=H){const c=document.createElement('canvas');sw=c.width=Math.round(sw/2);sh=c.height=Math.round(sh/2);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,sw,sh);src=c}
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,W,H);
    if(bm.close)bm.close();
    return c.toDataURL('image/jpeg',.9);
  }catch(e){return null}
}

