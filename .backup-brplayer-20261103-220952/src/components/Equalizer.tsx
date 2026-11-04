import { useEffect, useRef } from 'react';
import { set, useStore } from '../store/useStore';
import { Icon } from './Icon';
import { VolumeWidget } from './VolumeWidget';
import * as AE from '../audio/engine';
import { useEq } from '../hooks/useExternal';

const SLIDERS = [
  ['w', 'Amplitud', 0, 2.5, 0.05],
  ['r', 'Sala', 0, 1, 0.02],
  ['v', 'Giro', 0.02, 0.5, 0.01],
  ['d', 'Distancia', 1, 8, 0.1],
] as const;

const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--acc') || '#e11d48';

function sizeCanvas(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  if (!r.width) return null;
  c.width = r.width * d;
  c.height = r.height * d;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.scale(d, d);
  return { g, W: r.width, H: r.height };
}

/** Ecualizador de 10 bandas con presets + sonido 3D (envolvente, sala, 8D giratorio) */
export function Equalizer() {
  const open = useStore((s) => s.eqOpen);
  const S = useEq();
  const curve = useRef<HTMLCanvasElement>(null);
  const radar = useRef<HTMLCanvasElement>(null);
  const upd = () => { AE.apply(); AE.save(); };

  /* curva de respuesta: se redibuja con cada cambio */
  useEffect(() => {
    if (!open || !curve.current) return;
    const z = sizeCanvas(curve.current);
    if (!z) return;
    const { g, W, H } = z, cv = AE.curve();
    g.strokeStyle = '#8884'; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.strokeStyle = accent(); g.lineWidth = 2.5; g.beginPath();
    cv.forEach((v, i) => {
      const x = (i / (cv.length - 1)) * W, y = H / 2 - (Math.max(-14, Math.min(14, v)) / 14) * (H / 2 - 6);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    });
    g.stroke();
  });

  /* radar del 3D: se anima mientras el panel está abierto */
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const loop = () => {
      const c = radar.current, z = c && sizeCanvas(c);
      if (z) {
        const { g, W, H } = z, x0 = W / 2, y0 = H / 2, R = Math.min(W, H) / 2 - 14, s = AE.S.sp, acc = accent();
        g.strokeStyle = '#8886'; g.lineWidth = 1;
        [0.33, 0.66, 1].forEach((k) => { g.beginPath(); g.arc(x0, y0, R * k, 0, 6.2832); g.stroke(); });
        g.fillStyle = '#888'; g.beginPath(); g.arc(x0, y0, 7, 0, 6.2832); g.fill(); g.fillRect(x0 - 2, y0 - 12, 4, 6);
        const dot = (x: number, y: number) => { g.fillStyle = acc; g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fill(); };
        if (!s.on) { g.fillStyle = '#888'; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText('3D apagado', x0, H - 6); }
        else if (s.m === 'o8') {
          const a = AE.th(AE.getCtx() ? (AE.getCtx() as AudioContext).currentTime : performance.now() / 1000);
          dot(x0 + Math.sin(a) * (R * s.d) / 8, y0 + Math.cos(a) * (R * s.d) / 8);
        } else {
          const k = Math.min(1, 0.35 + s.w / 3) * R;
          dot(x0 - k * 0.8, y0 - k * 0.5); dot(x0 + k * 0.8, y0 - k * 0.5);
          g.strokeStyle = acc; g.globalAlpha = 0.4; g.beginPath(); g.arc(x0, y0, R * (0.45 + s.r * 0.5), 0, 6.2832); g.stroke(); g.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const band = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    const r = (e.currentTarget.querySelector('.tr') as HTMLElement).getBoundingClientRect();
    S.g[i] = Math.round((12 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 24) * 2) / 2;
    S.pre = ''; S.on = true;
    upd();
  };

  const o8 = S.sp.m === 'o8';

  return (
    <div id="eq" className="ovl" hidden={!open} onClick={(e) => { if (e.target === e.currentTarget) set({ eqOpen: false }); }}>
      <div className="card">
        <div className="mh">
          <b>Ecualizador</b>
          <span className="flex items-center gap-2">
            <button className={`tg ${S.on ? 'on' : ''}`} aria-label="Activar ecualizador" onClick={() => { S.on = !S.on; upd(); }} />
            <button className="ib" onClick={() => set({ eqOpen: false })} aria-label="Cerrar"><Icon name="close" /></button>
          </span>
        </div>
        <div className="vl"><span>Volumen</span><VolumeWidget big /><small>{Math.round(S.vol * 100)}%</small></div>
        <canvas id="eqc" ref={curve} />
        <div className="chips">
          {Object.keys(AE.PRESETS).map((k) => (
            <button key={k} className={`chip ${S.pre === k ? 'on' : ''}`} onClick={() => { S.g = AE.PRESETS[k].slice(); S.pre = k; S.on = true; upd(); }}>{k}</button>
          ))}
        </div>
        <div id="eqb">
          {AE.F0.map((_, i) => (
            <div
              key={i} className="bd"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); band(i, e); }}
              onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) band(i, e); }}
              onDoubleClick={() => { S.g[i] = 0; S.pre = ''; S.on = true; upd(); }}
            >
              <small className="v">{(S.g[i] > 0 ? '+' : '') + S.g[i]}</small>
              <div className="tr"><div className="th" style={{ top: ((12 - S.g[i]) / 24) * 100 + '%' }} /></div>
              <small>{AE.LB[i]}</small>
            </div>
          ))}
        </div>
        <div className="mh">
          <b>Sonido 3D</b>
          <button className={`tg ${S.sp.on ? 'on' : ''}`} aria-label="Activar sonido 3D" onClick={() => { S.sp.on = !S.sp.on; upd(); }} />
        </div>
        <div className="chips">
          {(Object.keys(AE.MODES) as AE.SpatialMode[]).map((k) => (
            <button key={k} className={`chip ${S.sp.on && S.sp.m === k ? 'on' : ''}`}
              onClick={() => { const m = AE.MODES[k]; S.sp.m = k; S.sp.w = m.w; S.sp.r = m.r; S.sp.on = true; upd(); }}>{AE.MODES[k].n}</button>
          ))}
        </div>
        <canvas id="spr" ref={radar} />
        <div id="sps">
          {SLIDERS.map(([k, n, mn, mx, st]) => (
            <label key={k} className={!S.sp.on || (k === 'w' ? o8 : k === 'v' || k === 'd' ? !o8 : false) ? 'dis' : ''}>
              <span>{n}</span>
              <input
                type="range" min={mn} max={mx} step={st} value={S.sp[k]}
                onChange={(e) => { const v = +e.target.value; if (k === 'v') AE.setSpin(v); else S.sp[k] = v; S.sp.on = true; upd(); }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
