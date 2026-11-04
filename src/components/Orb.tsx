import { useState } from 'react';
import { useStore } from '../store/useStore';
import { orbHold, tapBall } from '../fx/accent';

/** Bolita de color: tocar cambia el acento, mantener pulsada activa el modo RGB. Con `onTap` solo ejecuta esa acción (cambiar animación). */
export function Orb({ onTap, hold = false, className = '' }: { onTap?: () => void; hold?: boolean; className?: string }) {
  const playing = useStore((s) => s.playing);
  const [left, setLeft] = useState(12);
  const nudge = (el: HTMLElement) => {
    const ball = el.firstElementChild as HTMLElement;
    setLeft(6 + Math.random() * Math.max(0, el.clientWidth - ball.offsetWidth - 12));
  };
  return (
    <div
      role="button"
      aria-label={hold ? 'Bolita de color: toca para cambiar el color, mantén pulsada para el modo RGB' : 'Cambiar animación'}
      title={hold ? 'Toca: cambia el color · Mantén: modo RGB' : undefined}
      className={`orb ${hold ? 'hold' : ''} ${playing ? 'play' : ''} ${className}`}
      onClick={(e) => { nudge(e.currentTarget); if (onTap) onTap(); else tapBall(); }}
      onPointerDown={hold ? orbHold.down : undefined}
      onPointerUp={hold ? orbHold.up : undefined}
      onPointerCancel={hold ? orbHold.up : undefined}
      onPointerLeave={hold ? orbHold.up : undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      <i className="bl" style={{ left }} />
    </div>
  );
}
