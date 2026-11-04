/** Color de acento (la bolita) y modo RGB. El acento vive en la variable CSS --acc, así todo lo demás lo hereda. */
import { ls } from '../lib/storage';
import { au } from '../audio/element';
import { progressFx } from './progressFx';

/* tonos 600: el texto/ícono blanco encima se lee bien en todos (el acento por defecto cambia con el tema) */
const PAL: Array<string | null> = [null, '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#BD0D54'];
const RS = document.documentElement.style;

/** tono actual del modo RGB (null si no está activo): lo usa el visualizador para teñirse igual */
export const rgbState: { hue: number | null } = { hue: null };

let accI = +(ls.str('accI') || 0) || 0;
let held = false;
let lp = 0;
let rgbRAF = 0;
let prevAcc = '';
let rgbCol = '';
let rgbSc: Array<HTMLElement | null> | null = null;

/** color del texto sobre el acento: blanco, salvo que el acento sea tan claro que el blanco no se lea */
const lum = (c: string): number | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim()) || null;
  const v = m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : (/rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c) || []).slice(1).map(Number);
  if (v.length !== 3 || v.some((x) => isNaN(x))) return null;
  const f = v.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const setAcc = (c: string | null): void => {
  if (c) {
    RS.setProperty('--acc', c);
    const l = lum(c);
    if (l != null && l > 0.4) RS.setProperty('--on-acc', '#2a0f18'); else RS.removeProperty('--on-acc');
  } else { RS.removeProperty('--acc'); RS.removeProperty('--on-acc'); }
};
setAcc(ls.str('accC') || PAL[accI]);

/* los mismos colores de la página: el acento por defecto (según tema) + la paleta de la bolita */
const darkNow = (): boolean => {
  const th = document.documentElement.dataset.theme;
  return th ? th === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
};
const hex3 = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const palRGB = (): number[][] => PAL.map((c) => hex3(c || (darkNow() ? '#fb7185' : '#e11d48')));
const hueOf = ([r, g, b]: number[]): number => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

/** toque en la bolita: siguiente color de la paleta */
export function tapBall(): void {
  if (held) { held = false; return; }
  accI = (accI + 1) % PAL.length;
  setAcc(PAL[accI]);
  ls.setStr('accI', String(accI));
  ls.del('accC');
}

export function rgbStart(per = 600, sc?: Array<HTMLElement | null>): void {
  rgbSc = sc || null;
  prevAcc = RS.getPropertyValue('--acc');
  const t0 = performance.now(), C = palRGB(), n = C.length;
  document.documentElement.classList.add('rgb');
  const f = (t: number) => {
    const u = (Math.max(0, t - t0) / per) % n, i = Math.floor(u);
    const k = Math.min(1, Math.max(0, (u - i - 0.2) / 0.6)), e = k * k * (3 - 2 * k);
    const A = C[i], B = C[(i + 1) % n];
    const c = A.map((v, j) => Math.round(v + (B[j] - v) * e));
    rgbCol = 'rgb(' + c.join(',') + ')';
    if (!rgbSc) rgbState.hue = hueOf(c);
    if (rgbSc) rgbSc.forEach((el) => el && el.style.setProperty('--acc', rgbCol)); else RS.setProperty('--acc', rgbCol);
    if (au.paused) progressFx.once();
    rgbRAF = requestAnimationFrame(f);
  };
  rgbRAF = requestAnimationFrame(f);
}

/** keep=true: al soltar se queda en el último color generado; keep=false: vuelve al color anterior (efecto automático) */
export function rgbStop(keep = true): void {
  clearTimeout(lp);
  if (!rgbRAF) return;
  rgbState.hue = null;
  cancelAnimationFrame(rgbRAF);
  rgbRAF = 0;
  document.documentElement.classList.remove('rgb');
  if (rgbSc) { rgbSc.forEach((el) => el && el.style.removeProperty('--acc')); rgbSc = null; progressFx.once(); return; }
  if (keep && rgbCol) { RS.setProperty('--acc', rgbCol); ls.setStr('accC', rgbCol); }
  else if (prevAcc) RS.setProperty('--acc', prevAcc); else RS.removeProperty('--acc');
  progressFx.once();
}

export const isRgb = (): boolean => !!rgbRAF;

/** mantener pulsada la bolita (450 ms) = modo RGB */
export const orbHold = {
  down(): void { held = false; clearTimeout(lp); lp = window.setTimeout(() => { held = true; rgbStart(); }, 450); },
  up(): void { rgbStop(true); },
};

/* ---------- Icono: bolita de un color distinto en cada carga ---------- */
export function paintFavicon(): void {
  try {
    const last = parseFloat(ls.str('favH') || '');
    let H = Math.random() * 360;
    if (isFinite(last)) H = (last + 70 + Math.random() * 220) % 360;
    ls.setStr('favH', String(H));
    const mk = (n: number, bg?: string): string => {
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const x = c.getContext('2d') as CanvasRenderingContext2D;
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, n, n); }
      const r = n * (bg ? 0.28 : 0.42), q = x.createRadialGradient(n * 0.42, n * 0.38, r * 0.1, n / 2, n / 2, r);
      q.addColorStop(0, `hsl(${H},100%,87%)`);
      q.addColorStop(1, `hsl(${H},100%,65%)`);
      x.fillStyle = q;
      x.beginPath();
      x.arc(n / 2, n / 2, r, 0, Math.PI * 2);
      x.fill();
      return c.toDataURL('image/png');
    };
    document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach((l) => l.remove());
    const lk = (rel: string, href: string, sz: string) => {
      const l = document.createElement('link');
      l.rel = rel; l.type = 'image/png'; l.setAttribute('sizes', sz); l.href = href;
      document.head.appendChild(l);
    };
    lk('icon', mk(128), '128x128');
    lk('apple-touch-icon', mk(180, '#17171a'), '180x180');
  } catch { /* sin canvas */ }
}
