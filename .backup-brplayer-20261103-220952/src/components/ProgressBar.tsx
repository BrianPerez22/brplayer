import { useEffect, useRef, useState } from 'react';
import { au } from '../audio/element';
import { isSeekHold, okDur, seekTo, setRestoreRatio } from '../audio/player';
import { progressFx } from '../fx/progressFx';
import { fmt } from '../lib/util';
import { useAudioTime } from '../hooks/useExternal';

/**
 * Línea de tiempo. El gesto se gestiona con pointer events (no con el `change` del input nativo):
 * tocar la pista salta, arrastrar la bolita desplaza, y siempre se cierra al soltar o cancelar.
 * El <canvas> de atrás dibuja la animación de la barra.
 */
export function ProgressBar() {
  const { time, duration } = useAudioTime();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<number | null>(null); // valor 0–1000 mientras se arrastra
  const hold = useRef(0); // último valor confirmado (evita el rebote visual mientras el navegador salta)
  const g = useRef({ id: null as number | null, grab: 0, thumb: false, x0: 0, y0: 0, t0: 0, moved: false, last: 0 });

  const live = okDur(duration) ? (time / duration) * 1000 : 0;
  const v = drag ?? (isSeekHold() ? hold.current : live);
  const valRef = useRef(v);
  valRef.current = v;

  useEffect(() => progressFx.register(canvas.current as HTMLCanvasElement, () => valRef.current), []);
  useEffect(() => { progressFx.once(); }, [v]);

  const val = (e: React.PointerEvent): number => {
    const r = (wrap.current as HTMLDivElement).getBoundingClientRect(), W = Math.max(1, r.width - 16);
    return Math.round(Math.min(1, Math.max(0, (e.clientX + g.current.grab - r.left - 8) / W)) * 1000);
  };

  const down = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.id != null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = (wrap.current as HTMLDivElement).getBoundingClientRect();
    const tx = r.left + 8 + (valRef.current / 1000) * (r.width - 16);
    s.thumb = Math.hypot(e.clientX - tx, e.clientY - (r.top + r.height / 2)) <= 14;
    s.grab = s.thumb ? tx - e.clientX : 0;
    s.id = e.pointerId; s.x0 = e.clientX; s.y0 = e.clientY; s.t0 = performance.now(); s.moved = false;
    try { (wrap.current as HTMLDivElement).setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    s.last = s.thumb ? valRef.current : val(e);
    setDrag(s.last);
  };
  const move = (e: React.PointerEvent) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    if (Math.abs(e.clientX - s.x0) > 3) s.moved = true;
    s.last = val(e);
    setDrag(s.last);
  };
  const end = (e: React.PointerEvent, commit: boolean) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    s.id = null;
    try { (wrap.current as HTMLDivElement).releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
    if (commit && (s.moved || !s.thumb)) {
      hold.current = s.last;
      if (okDur(au.duration)) seekTo((s.last / 1000) * au.duration); else setRestoreRatio(s.last / 1000);
    } else if (commit && s.thumb && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < 6 && performance.now() - s.t0 < 450) {
      progressFx.next(); /* tocar con precisión la bolita cambia la animación */
    }
    setDrag(null);
  };

  const shown = drag != null && okDur(duration) ? (drag / 1000) * duration : time;

  return (
    <>
      <div
        ref={wrap}
        className="skw"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => end(e, true)}
        onPointerCancel={(e) => end(e, false)}
        onLostPointerCapture={(e) => { if (g.current.id === e.pointerId) { g.current.id = null; setDrag(null); } }}
      >
        <canvas ref={canvas} className="skc" />
        <input
          type="range" className="sk" min={0} max={1000} value={Math.round(v)} aria-label="Posición"
          onChange={(e) => {
            const n = +e.target.value;
            hold.current = n;
            if (okDur(au.duration)) seekTo((n / 1000) * au.duration);
          }}
        />
      </div>
      <div className="flex justify-between text-[13px] tabular-nums text-mut mt-1">
        <span>{fmt(shown)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </>
  );
}
