import { useRef } from 'react';
import { set, useStore } from '../store/useStore';
import { Icon } from './Icon';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { Orb } from './Orb';
import { VolumeWidget } from './VolumeWidget';
import { FavButton, InfoButton, NowTitle, ShareButton } from './NowInfo';
import { GIF } from '../lib/util';

/** asa para minimizar / expandir: zona táctil grande y gesto de deslizar */
function Grab() {
  const bmin = useStore((s) => s.bmin);
  const y0 = useRef<number | null>(null);
  const moved = useRef(false);
  const end = (e: React.PointerEvent) => {
    if (y0.current == null) return;
    if (!moved.current && e.type === 'pointerup') set({ bmin: !bmin });
    y0.current = null;
  };
  return (
    <div
      id="bgrab" role="button" aria-label="Minimizar o expandir controles"
      onPointerDown={(e) => { y0.current = e.clientY; moved.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        if (y0.current == null) return;
        const d = e.clientY - y0.current;
        if (Math.abs(d) > 18) { moved.current = true; set({ bmin: d > 0 }); y0.current = e.clientY; }
      }}
      onPointerUp={end}
      onPointerCancel={end}
    ><i /></div>
  );
}

export function PlayerBar() {
  const bmin = useStore((s) => s.bmin);
  const cover = useStore((s) => s.coverSrc);
  const openFs = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('.lk')) set({ fsOpen: true }); };
  return (
    <div id="bar" className={bmin ? 'min' : ''}>
      <Grab />
      <div id="now" className="mb-3.5 flex items-center gap-3">
        <img id="cv" className="cv" src={cover || GIF} alt="" onClick={openFs} />
        <div id="nt" className="min-w-0 flex-1" onClick={openFs}><NowTitle /></div>
        <VolumeWidget />
        <FavButton />
        <ShareButton />
        <InfoButton />
        <button className="ib" onClick={() => set({ fsOpen: true })} aria-label="Pantalla completa"><Icon name="expand" /></button>
      </div>
      <ProgressBar />
      <Controls />
      <div className="ex mt-2 flex items-center gap-3"><Orb hold className="!flex-1" /></div>
    </div>
  );
}
