/** Color de acento (la bolita) y modo RGB. El acento vive en la variable CSS --acc, así todo lo demás lo hereda. */
import { ls } from '../lib/storage';
import { au } from '../audio/element';
import { progressFx } from './progressFx';
import { rm } from '../room/hooks';

/* tonos 600: el texto/ícono blanco encima se lee bien en todos (el acento por defecto cambia con el tema) */
const PAL: Array<string | null> = [null, '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#BD0D54'];
const RS = document.documentElement.style;

/** tono actual del modo RGB (null si no está activo): lo usa el visualizador para teñirse igual */
export const rgbState: { hue: number | null } = { hue: null };

let accI = +(ls.str('accI') || 0) || 0;
let custom = ls.str('accC') || ''; /* color fijo que quedó tras soltar el modo RGB ('' = el de la paleta) */
let rgbSince = 0; /* cuándo empezó el modo RGB (hora de la sala si hay sala) */
let held = false;
let lp = 0;
let rgbRAF = 0;
let prevAcc = '';
let rgbCol = '';
let rgbSc: Array<HTMLElement | null> | null = null;
let faviconColor = '';

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

/* ---------- Colores compartidos (sala de escuchar juntos) ---------- */
/** descripción mínima del acento: índice de la paleta, color fijo opcional, y el inicio del RGB si está activo */
export interface AccLook { i: number; c?: string; r?: number }
/** la sala se engancha aquí: avisa de cada cambio hecho por el usuario y presta su reloj compartido */
export const accHooks: { onChange: (() => void) | null; clock: () => number } = { onChange: null, clock: () => Date.now() };
const emit = (): void => { if (accHooks.onChange) accHooks.onChange(); };
const OKCOL = /^(#[0-9a-f]{6}|rgb\(\d{1,3},\d{1,3},\d{1,3}\))$/i;

export function accLook(): AccLook {
  if (rgbRAF && !rgbSc) return { i: accI, r: rgbSince };
  return custom ? { i: accI, c: custom } : { i: accI };
}

/** valida lo que llega por la red antes de tocar nada */
export function cleanAccLook(x: unknown): AccLook | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const i = o.i;
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= PAL.length) return null;
  if (typeof o.r === 'number' && isFinite(o.r)) return { i, r: o.r };
  if (typeof o.c === 'string' && OKCOL.test(o.c)) return { i, c: o.c };
  return { i };
}

/** aplica el acento de otra persona de la sala (no se guarda en este dispositivo) */
export function applyAccLook(a: AccLook): void {
  if (rgbRAF) rgbStop(false);
  if (a.r != null) { rgbStart(600, undefined, a.r); return; }
  accI = a.i;
  custom = a.c || '';
  setAcc(custom || PAL[accI]);
  syncFavicon();
  progressFx.once();
}

/** al salir de la sala (o apagar la opción) vuelve el color propio, el que está guardado */
export function restoreAcc(): void {
  if (rgbRAF) rgbStop(false);
  accI = +(ls.str('accI') || 0) || 0;
  custom = ls.str('accC') || '';
  setAcc(custom || PAL[accI]);
  syncFavicon();
  progressFx.once();
}

/** favicon plano: usa exactamente el color de acento que ve la interfaz */
export function syncFavicon(): void {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#e11d48';
  if (color === faviconColor) return;
  faviconColor = color;
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="${color}"/></svg>`;
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml,${encodeURIComponent(icon)}`;
}

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
  custom = '';
  setAcc(PAL[accI]);
  syncFavicon();
  if (!rm.look) { ls.setStr('accI', String(accI)); ls.del('accC'); }
  emit();
}

/** `since`: hora (del reloj de la sala) en que empezó el RGB en otro dispositivo, para llevar el mismo color al mismo tiempo */
export function rgbStart(per = 600, sc?: Array<HTMLElement | null>, since?: number): void {
  rgbSc = sc || null;
  prevAcc = RS.getPropertyValue('--acc');
  rgbSince = since ?? accHooks.clock();
  const t0 = performance.now() - Math.max(0, accHooks.clock() - rgbSince), C = palRGB(), n = C.length;
  document.documentElement.classList.add('rgb');
  const f = (t: number) => {
    const u = (Math.max(0, t - t0) / per) % n, i = Math.floor(u);
    const k = Math.min(1, Math.max(0, (u - i - 0.2) / 0.6)), e = k * k * (3 - 2 * k);
    const A = C[i], B = C[(i + 1) % n];
    const c = A.map((v, j) => Math.round(v + (B[j] - v) * e));
    rgbCol = 'rgb(' + c.join(',') + ')';
    if (!rgbSc) rgbState.hue = hueOf(c);
    if (rgbSc) rgbSc.forEach((el) => el && el.style.setProperty('--acc', rgbCol)); else { RS.setProperty('--acc', rgbCol); syncFavicon(); }
    if (au.paused) progressFx.once();
    rgbRAF = requestAnimationFrame(f);
  };
  rgbRAF = requestAnimationFrame(f);
  if (!sc && since == null) emit();
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
  if (keep && rgbCol) { RS.setProperty('--acc', rgbCol); custom = rgbCol; if (!rm.look) ls.setStr('accC', rgbCol); }
  else if (prevAcc) RS.setProperty('--acc', prevAcc); else RS.removeProperty('--acc');
  syncFavicon();
  progressFx.once();
  if (keep) emit();
}

export const isRgb = (): boolean => !!rgbRAF;

/** mantener pulsada la bolita (450 ms) = modo RGB */
export const orbHold = {
  down(): void { held = false; clearTimeout(lp); lp = window.setTimeout(() => { held = true; rgbStart(); }, 450); },
  up(): void { rgbStop(true); },
};
