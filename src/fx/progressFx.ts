/**
 * Barra de progreso viva: cada canción elige al azar un efecto (agua, electricidad, fuego, burbujas, glitch o píxeles).
 * Se dibuja en un <canvas> detrás del <input range>; tocar con precisión la bolita cambia de efecto.
 */
import { au } from '../audio/element';
import { reducedMotion } from '../lib/util';

const TAU = Math.PI * 2;
const NFX = 6;
const calm = reducedMotion();

interface Particle { x: number; y: number; vx?: number; vy: number; l: number; w?: number; ph?: number; r?: number }
interface Glitch { x: number; w: number; dy: number; dx: number; c: number }
class BarState {
  arc: Array<[number, number]> = [];
  at = 0;
  fire: Particle[] = [];
  bub: Particle[] = [];
  gl: Glitch[] = [];
  gt = 0;
  go = 0;
  px: Particle[] = [];
}
interface Bar { c: HTMLCanvasElement; read: () => number; s: BarState; w: number; h: number; d: number }

const bars = new Set<Bar>();
let fx = (Math.random() * NFX) | 0;
let raf = 0;
let last = 0;
let t = 0;
let popUntil = 0;
const root = document.documentElement;

const hz = (a: number, b: number): number => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function drawBar(b: Bar, dt: number, acc: string, mut: string, now: number): void {
  const { c, s: S } = b;
  const W = b.w, H = b.h;
  if (!(W >= 20)) return;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.setTransform(b.d, 0, 0, b.d, 0, 0);
  g.clearRect(0, 0, W, H);
  const p = Math.min(1, Math.max(0, b.read() / 1000)), x0 = 8, x1 = W - 8, xh = x0 + (x1 - x0) * p, cy = H / 2, th = 3, L = xh - x0;
  if (fx !== 5) {
    g.lineCap = 'round'; g.lineWidth = 6; g.globalAlpha = 0.35; g.strokeStyle = mut;
    g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke(); g.globalAlpha = 1;
  } else if (L < 1) {
    const q = 4, ty = Math.round(cy - 6);
    g.fillStyle = mut; g.globalAlpha = 0.32;
    for (let i = 0, n = Math.floor((x1 - x0) / q); i < n; i++) g.fillRect(x0 + i * q, ty + q, q - 1, q - 1);
    g.globalAlpha = 1;
  }
  if (now < popUntil) {
    const k = 1 - (popUntil - now) / 600;
    g.globalAlpha = (1 - k) * 0.7; g.strokeStyle = acc; g.lineWidth = 2;
    g.beginPath(); g.arc(xh, cy, 9 + k * 14, 0, TAU); g.stroke();
    g.globalAlpha = 1; g.lineWidth = 6;
  }
  if (L < 1) return;

  if (fx === 0) { /* agua */
    g.fillStyle = acc; g.beginPath();
    const n = Math.max(2, (L / 3) | 0);
    for (let i = 0; i <= n; i++) { const x = x0 + (L * i) / n; g.lineTo(x, cy - th - Math.sin(x * 0.28 - t * 2.4) * 1.3 - Math.sin(x * 0.11 + t * 1.3) * 0.8); }
    for (let i = n; i >= 0; i--) { const x = x0 + (L * i) / n; g.lineTo(x, cy + th + Math.sin(x * 0.26 + t * 2 - 1) * 1.3 + Math.sin(x * 0.13 - t * 1.1) * 0.8); }
    g.closePath(); g.fill(); g.beginPath(); g.arc(x0, cy, th, 0, TAU); g.fill();
    g.globalAlpha = 0.3; g.fillStyle = '#fff';
    for (let k = 0; k < 4; k++) { const x = x0 + ((t * 16 + (k * L) / 4) % L); g.fillRect(x, cy - 1.6 + Math.sin(t * 3 + k), 7, 1.2); }
    const rp = (t * 0.7) % 1;
    g.globalAlpha = (1 - rp) * 0.55; g.strokeStyle = acc; g.lineWidth = 1.5;
    g.beginPath(); g.arc(xh, cy, 9 + rp * 11, 0, TAU); g.stroke();
    const rq = (t * 0.7 + 0.5) % 1;
    g.globalAlpha = (1 - rq) * 0.35;
    g.beginPath(); g.arc(xh, cy, 9 + rq * 11, 0, TAU); g.stroke();
  } else if (fx === 1) { /* electricidad */
    g.strokeStyle = acc; g.beginPath(); g.moveTo(x0, cy); g.lineTo(xh, cy); g.stroke();
    if (now - S.at > 90) {
      S.at = now; S.arc = [];
      if (Math.random() < 0.72) {
        const n = Math.max(3, (L / 9) | 0);
        for (let i = 0; i <= n; i++) S.arc.push([x0 + (L * i) / n, cy + (i === 0 || i === n ? 0 : (Math.random() - 0.5) * 9)]);
      }
    }
    if (S.arc.length) {
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'butt'; g.lineJoin = 'round';
      for (const [lw, al, col] of [[4, 0.22, acc], [1.2, 0.8, '#fff']] as Array<[number, number, string]>) {
        g.lineWidth = lw; g.globalAlpha = al; g.strokeStyle = col; g.beginPath();
        S.arc.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
        g.stroke();
      }
      g.lineWidth = 1; g.globalAlpha = 0.7; g.strokeStyle = '#fff'; g.beginPath();
      for (let k = 0; k < 3; k++) { const a = Math.random() * TAU, l = 4 + Math.random() * 7; g.moveTo(xh, cy); g.lineTo(xh + Math.cos(a) * l, cy + Math.sin(a) * l); }
      g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
  } else if (fx === 2) { /* fuego */
    g.strokeStyle = acc; g.beginPath(); g.moveTo(x0, cy); g.lineTo(xh, cy); g.stroke();
    for (let k = 0; k < 3; k++) {
      const hh = 6 + Math.sin(t * 14 + k * 2) * 3 + Math.sin(t * 23 + k) * 2, bx = xh - 10 + k * 5;
      g.globalAlpha = 0.5; g.fillStyle = acc; g.beginPath();
      g.moveTo(bx - 3, cy - th + 1);
      g.quadraticCurveTo(bx - 1, cy - th - hh * 0.5, bx + Math.sin(t * 9 + k) * 1.5, cy - th - hh);
      g.quadraticCurveTo(bx + 1, cy - th - hh * 0.5, bx + 3, cy - th + 1);
      g.fill();
    }
    if (dt > 0) {
      const n = 1 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) S.fire.push({ x: xh - Math.random() * 8, y: cy - th, vx: (Math.random() - 0.5) * 6, vy: -(14 + Math.random() * 16), l: 1, w: Math.random() });
      if (Math.random() < 0.4) S.fire.push({ x: x0 + Math.random() * L, y: cy - th, vx: (Math.random() - 0.5) * 4, vy: -(8 + Math.random() * 10), l: 0.7, w: Math.random() });
      if (S.fire.length > 70) S.fire.splice(0, S.fire.length - 70);
    }
    g.globalCompositeOperation = 'lighter';
    for (const f of S.fire) {
      f.x += (f.vx || 0) * dt; f.y += f.vy * dt; f.l -= dt * 1.7;
      if (f.l <= 0) continue;
      const r = 1 + f.l * 2.2;
      g.globalAlpha = f.l * 0.35; g.fillStyle = acc; g.beginPath(); g.arc(f.x, f.y, r * 1.6, 0, TAU); g.fill();
      g.globalAlpha = f.l * 0.8; g.fillStyle = `hsl(${28 + (f.w || 0) * 20},100%,62%)`; g.beginPath(); g.arc(f.x, f.y, r * 0.6, 0, TAU); g.fill();
    }
    S.fire = S.fire.filter((f) => f.l > 0);
    g.globalCompositeOperation = 'source-over';
  } else if (fx === 3) { /* burbujas */
    g.strokeStyle = acc; g.beginPath(); g.moveTo(x0, cy); g.lineTo(xh, cy); g.stroke();
    g.globalAlpha = 0.2; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, cy - 1.5); g.lineTo(xh, cy - 1.5); g.stroke();
    if (dt > 0) {
      if (Math.random() < Math.min(0.9, 0.15 + L / 600)) S.bub.push({ x: x0 + Math.random() * L, y: cy, vy: -(10 + Math.random() * 12), ph: Math.random() * TAU, r: 1 + Math.random() * 2.2, l: 1 });
      if (Math.random() < 0.25) S.bub.push({ x: xh - Math.random() * 6, y: cy, vy: -(12 + Math.random() * 10), ph: Math.random() * TAU, r: 1.2 + Math.random() * 2, l: 1 });
      if (S.bub.length > 40) S.bub.splice(0, S.bub.length - 40);
    }
    g.lineWidth = 1;
    for (const bu of S.bub) {
      const r = bu.r || 1;
      bu.y += bu.vy * dt; bu.x += Math.sin(t * 3 + (bu.ph || 0)) * dt * 6; bu.l -= dt * 1.3;
      if (bu.l <= 0) continue;
      if (bu.l > 0.14) {
        g.globalAlpha = Math.min(1, bu.l * 1.2) * 0.9; g.strokeStyle = acc; g.beginPath(); g.arc(bu.x, bu.y, r, 0, TAU); g.stroke();
        g.globalAlpha = bu.l * 0.15; g.fillStyle = acc; g.fill();
        g.globalAlpha = bu.l * 0.7; g.fillStyle = '#fff';
        const q = Math.max(1, r * 0.45);
        g.fillRect(bu.x - r * 0.5, bu.y - r * 0.5, q, q);
      } else {
        g.globalAlpha = bu.l * 5; g.strokeStyle = acc; g.beginPath(); g.arc(bu.x, bu.y, r * (1 + (0.14 - bu.l) * 14), 0, TAU); g.stroke();
      }
    }
    S.bub = S.bub.filter((bu) => bu.l > 0);
  } else if (fx === 4) { /* glitch */
    if (now - S.gt > (S.go ? 75 : 240 + Math.random() * 520)) {
      S.gt = now; S.go = Math.random() < 0.6 ? 1 : 0; S.gl = [];
      if (S.go) {
        const n = 2 + ((Math.random() * 4) | 0);
        for (let i = 0; i < n; i++) S.gl.push({ x: x0 + Math.random() * L, w: 5 + Math.random() * 36, dy: (Math.random() - 0.5) * 12, dx: (Math.random() - 0.5) * 18, c: Math.random() });
      }
    }
    g.lineCap = 'butt'; g.strokeStyle = acc; g.lineWidth = 6; g.beginPath(); g.moveTo(x0, cy); g.lineTo(xh, cy); g.stroke();
    g.fillStyle = acc; g.fillRect(xh - 1.5, cy - 6, 3, 12);
    if (S.go) {
      g.globalCompositeOperation = 'lighter'; g.lineWidth = 3; g.globalAlpha = 0.8;
      g.strokeStyle = '#ff1744'; g.beginPath(); g.moveTo(x0 - 3, cy - 2.5); g.lineTo(xh - 3, cy - 2.5); g.stroke();
      g.strokeStyle = '#00e5ff'; g.beginPath(); g.moveTo(x0 + 3, cy + 2.5); g.lineTo(xh + 3, cy + 2.5); g.stroke();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      for (const s of S.gl) {
        const a = Math.max(x0, s.x), bb = Math.min(xh + 16, s.x + s.w);
        if (bb <= a) continue;
        g.clearRect(a, cy - 5, bb - a, 10);
        g.fillStyle = s.c < 0.25 ? '#fff' : s.c < 0.5 ? '#00e5ff' : acc;
        g.fillRect(a + s.dx, cy - 3 + s.dy, bb - a, s.c < 0.5 ? 3 : 6);
      }
    }
  } else { /* píxeles */
    const q = 4, R = 3, ty = Math.round(cy - (R * q) / 2), ts = (t * 6) | 0, pc = Math.max(0, Math.floor(L / q)), tot = Math.floor((x1 - x0) / q);
    g.lineCap = 'butt'; g.fillStyle = mut; g.globalAlpha = 0.32;
    for (let i = pc; i < tot; i++) g.fillRect(x0 + i * q, ty + q, q - 1, q - 1);
    g.fillStyle = acc;
    for (let i = 0; i < pc; i++) for (let r = 0; r < R; r++) { g.globalAlpha = r === 1 ? 1 : 0.5 + 0.5 * hz(i + r * 57, ts + (i % 4)); g.fillRect(x0 + i * q, ty + r * q, q - 1, q - 1); }
    g.globalAlpha = 1; g.fillRect(x0 + pc * q, ty + q, q - 1, q - 1);
    g.fillStyle = '#fff'; g.globalAlpha = 0.55 + 0.45 * hz(ts, 3); g.fillRect(x0 + pc * q, ty + q, q - 1, q - 1);
    if (dt > 0) {
      if (Math.random() < 0.55) { const up = Math.random() < 0.5; S.px.push({ x: x0 + Math.max(0, pc - ((Math.random() * 7) | 0)) * q, y: ty + (up ? -q : R * q), vy: up ? -1 : 1, l: 1 }); }
      if (S.px.length > 26) S.px.shift();
    }
    for (const p2 of S.px) {
      p2.y += p2.vy * dt * 18; p2.l -= dt * 1.4;
      if (p2.l <= 0) continue;
      g.globalAlpha = p2.l * 0.85; g.fillStyle = acc; g.fillRect(p2.x, ty + Math.round((p2.y - ty) / q) * q, q - 1, q - 1);
    }
    S.px = S.px.filter((p2) => p2.l > 0);
  }
  g.globalAlpha = 1;
  g.lineCap = 'butt';
}

function draw(dt: number): void {
  const cst = getComputedStyle(root);
  const acc = cst.getPropertyValue('--acc').trim() || '#e11d48';
  const mut = cst.getPropertyValue('--mut').trim() || '#777';
  const now = performance.now();
  bars.forEach((b) => drawBar(b, dt, acc, mut, now));
}

function loop(now: number): void {
  raf = 0;
  if (document.hidden || au.paused) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  if (dt >= 0.032 || !last) { last = now; t += dt; draw(dt); }
  raf = requestAnimationFrame(loop);
}
function kick(): void {
  if (!raf && !calm && !au.paused && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); }
}
function once(): void { if (!raf) draw(0); }

/* cada canción, un efecto distinto */
au.addEventListener('loadstart', () => { fx = (fx + 1 + ((Math.random() * (NFX - 1)) | 0)) % NFX; once(); });
au.addEventListener('play', kick);
['pause', 'timeupdate', 'seeked', 'loadedmetadata'].forEach((ev) => au.addEventListener(ev, once));
document.addEventListener('visibilitychange', () => { kick(); once(); });

/** tocar con precisión la bolita de la barra cambia la animación */
function popLoop(): void { draw(0); if (performance.now() < popUntil) requestAnimationFrame(popLoop); }
function nextFx(): void {
  fx = (fx + 1) % NFX;
  popUntil = performance.now() + 600;
  if (!raf) popLoop();
}

/** registra un canvas; `read` devuelve la posición actual (0–1000). Devuelve la función para soltarlo. */
function register(c: HTMLCanvasElement, read: () => number): () => void {
  const b: Bar = { c, read, s: new BarState(), w: 0, h: 0, d: 1 };
  const ro = new ResizeObserver(() => {
    const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    b.w = r.width; b.h = r.height; b.d = d;
    c.width = Math.round(r.width * d);
    c.height = Math.round(r.height * d);
    once();
  });
  ro.observe(c);
  bars.add(b);
  once();
  return () => { ro.disconnect(); bars.delete(b); };
}

export const progressFx = { register, once, kick, next: nextFx, get fx() { return fx; } };
