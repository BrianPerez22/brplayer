import { useEffect, useRef } from 'react';
import { goTab } from '../lib/actions';
import { set, useStore } from '../store/useStore';
import { Icon } from './Icon';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { VolumeWidget } from './VolumeWidget';
import { FavButton, MoreButton, NowTitle } from './NowInfo';
import { GIF } from '../lib/util';
import { next, toggle } from '../audio/player';
import * as AE from '../audio/engine';

/** asa para minimizar / expandir (solo móvil): zona táctil grande y gesto de deslizar */
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
  const playing = useStore((s) => s.playing);
  const qn = useStore((s) => s.queue.length);
  const bar = useRef<HTMLDivElement>(null);
  const openFs = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('.lk')) set({ fsOpen: true }); };

  /* la altura real de la barra reserva espacio al final de la lista y recorta la barra lateral */
  useEffect(() => {
    const el = bar.current as HTMLDivElement;
    const put = () => document.documentElement.style.setProperty('--bar-h', el.offsetHeight + 'px');
    put();
    const ro = new ResizeObserver(put);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div id="bar" ref={bar} className={bmin ? 'min' : ''}>
      <Grab />
      <div id="now">
        <img id="cv" className={`cv ${playing ? 'pl' : ''}`} src={cover || GIF} alt="" onClick={openFs} />
        <div id="nt" onClick={openFs}><NowTitle /></div>
        <span className="mini-ctl">
          <button className="ib b-pp-s" onClick={toggle} aria-label="Play/Pausa"><Icon name={playing ? 'pause' : 'play'} size={24} /></button>
          <button className="ib" onClick={() => next(false)} aria-label="Siguiente"><Icon name="next" size={24} /></button>
        </span>
        <FavButton />
        <MoreButton />
        <button className="ib b-exp" onClick={() => set({ fsOpen: true })} aria-label="Pantalla completa"><Icon name="expand" /></button>
      </div>
      <div id="mid">
        <Controls />
        <ProgressBar />
      </div>
      <div id="ext">
        <button className="ib qb" onClick={() => goTab('queue')} aria-label="Cola de reproducción">
          <Icon name="list" size={22} />{qn > 0 && <em>{qn}</em>}
        </button>
        <button className="ib" onClick={() => { AE.init(); set({ eqOpen: true }); }} aria-label="Ecualizador"><Icon name="eq" size={22} /></button>
        <VolumeWidget />
        <button className="ib" onClick={() => set({ fsOpen: true })} aria-label="Pantalla completa"><Icon name="expand" size={22} /></button>
      </div>
    </div>
  );
}
