import { useRef, useState } from 'react';
import { setVol } from '../audio/engine';
import { useEq } from '../hooks/useExternal';
import { useStore } from '../store/useStore';

let vLast = 0.6;

/** Altavoz con ondas animadas y píldora con "gota". Junto al corazón en escritorio; en el ecualizador, siempre desplegado (`big`). */
export function VolumeWidget({ big = false, className = '' }: { big?: boolean; className?: string }) {
  const eq = useEq();
  const playing = useStore((s) => s.playing);
  const track = useRef<HTMLDivElement>(null);
  const [dr, setDr] = useState(false);

  const p = Math.round(eq.vol * 100);
  const level = p === 0 ? 0 : p < 34 ? 1 : p < 67 ? 2 : 3;
  const set = (x: number) => setVol(Math.round(Math.min(1, Math.max(0, x)) * 100) / 100);
  const fromX = (e: React.PointerEvent) => {
    const r = (track.current as HTMLDivElement).getBoundingClientRect();
    set((e.clientX - r.left) / r.width);
  };

  return (
    <div
      className={`vw ${big ? 'big' : ''} ${playing ? 'pl' : ''} ${dr ? 'dr' : ''} ${className}`}
      data-l={level}
      style={{ ['--v' as string]: p + '%' }}
      onWheel={(e) => { set(eq.vol - Math.sign(e.deltaY) * 0.05); }}
    >
      <button
        className="vb" aria-label="Silenciar / activar sonido" title={`Volumen: ${p}%`}
        onClick={() => { if (eq.vol > 0) { vLast = eq.vol; set(0); } else set(vLast || 0.6); }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" />
          <path className="w w1" d="M15.2 9.6a3.6 3.6 0 0 1 0 4.8" />
          <path className="w w2" d="M17.7 7.3a7 7 0 0 1 0 9.4" />
          <path className="w w3" d="M20.2 5a10.2 10.2 0 0 1 0 14" />
          <path className="x" d="m15.5 9.5 5 5m0-5-5 5" />
        </svg>
      </button>
      <div className="vp">
        <div
          ref={track} className="vt" role="slider" tabIndex={0} aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDr(true); fromX(e); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromX(e); }}
          onPointerUp={() => setDr(false)}
          onPointerCancel={() => setDr(false)}
          onKeyDown={(e) => {
            const d = ({ ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 } as Record<string, number>)[e.key];
            if (d) { set(eq.vol + d); e.preventDefault(); }
          }}
        >
          <i className="vf" /><b className="vk" /><span className="vn">{p}</span>
        </div>
      </div>
    </div>
  );
}
