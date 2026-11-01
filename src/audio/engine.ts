/**
 * Motor de audio (Web Audio): volumen maestro, ecualizador de 10 bandas, sonido 3D
 * (envolvente, sala y 8D giratorio) y analizador para el visualizador.
 *
 * Cadena: <audio> → preamp → 10 filtros → [ensanchador estéreo | panner HRTF 8D | reverb] → limitador → analizador → volumen → salida.
 */
import { au } from './element';
import { ls } from '../lib/storage';
import { toast } from '../store/useStore';

export const F0 = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const LB = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'] as const;

export const PRESETS: Record<string, number[]> = {
  Plano: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Graves+': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Agudos+': [0, 0, 0, 0, 0, 1, 3, 5, 6, 6],
  Vocal: [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1],
  Rock: [5, 4, 2, -1, -2, -1, 2, 4, 5, 5],
  Pop: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2],
  Electrónica: [6, 5, 2, 0, -2, 2, 1, 3, 5, 5],
  Clásica: [0, 0, 0, 0, 0, 0, -2, -2, -2, -4],
  Jazz: [3, 2, 1, 2, -2, -2, 0, 1, 2, 3],
};

export type SpatialMode = 'env' | 'sala' | 'o8';
export const MODES: Record<SpatialMode, { n: string; w: number; r: number }> = {
  env: { n: 'Envolvente', w: 1.7, r: 0.2 },
  sala: { n: 'Sala', w: 1.3, r: 0.5 },
  o8: { n: '8D giratorio', w: 1, r: 0.15 },
};

export interface Spatial { on: boolean; m: SpatialMode; w: number; r: number; v: number; d: number }
export interface EqState { vol: number; on: boolean; g: number[]; pre: string; sp: Spatial }

const def = (): EqState => ({
  vol: 1, on: false, g: F0.map(() => 0), pre: 'Plano',
  sp: { on: false, m: 'env', w: 1.7, r: 0.2, v: 0.12, d: 3 },
});

const loaded = ls.get<Partial<EqState>>('eq', {});
const d0 = def();
export const S: EqState = { ...d0, ...loaded, sp: { ...d0.sp, ...(loaded.sp || {}) } };
S.vol = Math.min(1, Math.max(0, +S.vol));
if (!isFinite(S.vol)) S.vol = 1;
if (!Array.isArray(S.g) || S.g.length !== F0.length) S.g = d0.g;

/* ---------- Suscripción para React ---------- */
const listeners = new Set<() => void>();
let ver = 0;
export const eqSubscribe = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const eqVersion = (): number => ver;
const emit = (): void => { ver++; listeners.forEach((l) => l()); };

interface Nodes {
  pre: GainNode; x: GainNode[]; A: GainNode; B: GainNode; W: GainNode; V: GainNode; pn: PannerNode;
}

let ac: AudioContext | null = null;
let an: AnalyserNode | null = null;
let N: Nodes | null = null;
let fl: BiquadFilterNode[] = [];
let oc: OfflineAudioContext | null = null;
let ofl: BiquadFilterNode[] = [];
let th0 = 0, t0 = 0, tm = 0;

/** ángulo del 8D en el instante t */
export const th = (t: number): number => th0 + 6.2832 * S.sp.v * (t - t0);

const mkF = (c: BaseAudioContext, f: number, i: number): BiquadFilterNode => {
  const b = c.createBiquadFilter();
  b.type = i ? (i === 9 ? 'highshelf' : 'peaking') : 'lowshelf';
  b.frequency.value = f;
  b.Q.value = 1.1;
  return b;
};

/** respuesta al impulso de la "sala" (ruido filtrado que decae) */
function impulse(c: AudioContext): AudioBuffer {
  const n = (c.sampleRate * 2.4) | 0, b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += (Math.random() * 2 - 1 - lp) * (0.9 - 0.75 * t);
      d[i] = lp * Math.pow(1 - t, 2.4);
    }
  }
  return b;
}

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };

export function init(): boolean {
  if (an) return true;
  try {
    const w = window as WindowWithWebkit;
    const C = window.AudioContext || w.webkitAudioContext;
    if (!C) return false;
    const u = au.currentSrc || au.src;
    if (u && !u.startsWith('blob:') && new URL(u, location.href).origin !== location.origin) {
      toast('Ecualizador y visualizador no disponibles: el audio es de otro dominio');
      return false;
    }
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
    const c = new C();
    const g = () => c.createGain();
    const st = g();
    st.channelCount = 2; st.channelCountMode = 'explicit'; st.channelInterpretation = 'speakers';
    const pre = g();
    const f = F0.map((x, i) => mkF(c, x, i));
    st.connect(pre);
    let p: AudioNode = pre;
    f.forEach((b) => { p.connect(b); p = b; });
    const sin = g();
    p.connect(sin);
    /* ensanchador estéreo: mezcla cruzada de canales (w>1 amplía, w<1 estrecha) */
    const sp = c.createChannelSplitter(2), mg = c.createChannelMerger(2);
    const x = [g(), g(), g(), g()];
    sin.connect(sp);
    sp.connect(x[0], 0); sp.connect(x[1], 1); sp.connect(x[2], 0); sp.connect(x[3], 1);
    x[0].connect(mg, 0, 0); x[1].connect(mg, 0, 0); x[2].connect(mg, 0, 1); x[3].connect(mg, 0, 1);
    const A = g();
    mg.connect(A);
    /* 8D: panner HRTF que orbita */
    const pn = c.createPanner();
    pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = 1; pn.rolloffFactor = 0.4;
    const B = g();
    sin.connect(pn); pn.connect(B);
    /* sala: retardo + convolución */
    const dl = c.createDelay(0.1);
    dl.delayTime.value = 0.02;
    const cv = c.createConvolver();
    ac = c;
    cv.buffer = impulse(c);
    const W = g();
    sin.connect(dl); dl.connect(cv); cv.connect(W);
    /* limitador + analizador */
    const lm = c.createDynamicsCompressor();
    lm.threshold.value = -4; lm.knee.value = 6; lm.ratio.value = 12; lm.attack.value = 0.003; lm.release.value = 0.25;
    const a = c.createAnalyser();
    a.fftSize = 2048; a.smoothingTimeConstant = 0.78; a.minDecibels = -88; a.maxDecibels = -18;
    [A, B, W].forEach((n) => n.connect(lm));
    lm.connect(a);
    const V = g(); /* volumen maestro: funciona sin EQ ni 3D (en iOS au.volume no hace nada) */
    a.connect(V);
    V.connect(c.destination);
    c.createMediaElementSource(au).connect(st); /* al final: si algo falla antes, el audio sigue normal */
    N = { pre, x, A, B, W, V, pn };
    fl = f;
    an = a;
    t0 = c.currentTime;
    c.onstatechange = () => { if (c.state !== 'running' && !au.paused) c.resume().catch(() => {}); };
    apply();
    c.resume().catch(() => {});
    return true;
  } catch {
    an = null;
    return false;
  }
}

function orbit(on: boolean): void {
  clearInterval(tm);
  tm = 0;
  if (!on || !N || !ac) return;
  const p = N.pn, c = ac;
  const k = () => {
    const T = c.currentTime, R = S.sp.d;
    if (p.positionX) {
      const X = p.positionX, Z = p.positionZ;
      X.cancelScheduledValues(T); Z.cancelScheduledValues(T);
      X.setValueAtTime(R * Math.sin(th(T)), T); Z.setValueAtTime(R * Math.cos(th(T)), T);
      for (let i = 1; i <= 24; i++) {
        const t = T + i * 0.05;
        X.linearRampToValueAtTime(R * Math.sin(th(t)), t);
        Z.linearRampToValueAtTime(R * Math.cos(th(t)), t);
      }
    } else p.setPosition(R * Math.sin(th(T)), 0, R * Math.cos(th(T)));
  };
  k();
  tm = window.setInterval(k, p.positionX ? 400 : 50);
}

export function apply(): void {
  if (!an || !ac || !N) return;
  const T = ac.currentTime, s = S.sp, n = N;
  const setP = (p: AudioParam, v: number) => p.setTargetAtTime(v, T, 0.05);
  setP(n.V.gain, S.vol * S.vol);
  fl.forEach((b, i) => setP(b.gain, S.on ? S.g[i] : 0));
  setP(n.pre.gain, Math.pow(10, -(S.on ? Math.max(0, ...S.g) : 0) * 0.5 / 20));
  const o8 = s.on && s.m === 'o8', w = s.on ? s.w : 1;
  setP(n.x[0].gain, (1 + w) / 2); setP(n.x[3].gain, (1 + w) / 2);
  setP(n.x[1].gain, (1 - w) / 2); setP(n.x[2].gain, (1 - w) / 2);
  setP(n.A.gain, o8 ? 0 : 1);
  setP(n.B.gain, o8 ? 1 + 0.4 * (s.d - 1) : 0);
  setP(n.W.gain, s.on ? s.r * 0.9 : 0);
  orbit(o8);
}

/** curva de respuesta del ecualizador (dB en 96 puntos de 20 Hz a 20 kHz) */
export function curve(): number[] {
  if (!oc) {
    const w = window as WindowWithWebkit;
    const O = window.OfflineAudioContext || w.webkitOfflineAudioContext;
    if (!O) return new Array(96).fill(0);
    oc = new O(1, 1, 44100);
    ofl = F0.map((x, i) => mkF(oc as OfflineAudioContext, x, i));
  }
  const n = 96, fr = new Float32Array(n), m = new Float32Array(n), ph = new Float32Array(n), o = new Array<number>(n).fill(1);
  for (let i = 0; i < n; i++) fr[i] = 20 * Math.pow(1000, i / (n - 1));
  ofl.forEach((b, i) => {
    b.gain.value = S.on ? S.g[i] : 0;
    b.getFrequencyResponse(fr, m, ph);
    for (let k = 0; k < n; k++) o[k] *= m[k];
  });
  return o.map((v) => 20 * Math.log10(v));
}

export function save(): void {
  ls.set('eq', S);
  emit();
}

export function setVol(v: number): void {
  S.vol = Math.min(1, Math.max(0, v));
  save();
  if (an) apply();
  else if (!init()) { try { au.volume = S.vol; } catch { /* iOS: sin efecto */ } }
}

/** velocidad de giro del 8D sin saltos de posición */
export function setSpin(v: number): void {
  const T = ac ? ac.currentTime : 0;
  th0 = th(T);
  t0 = T;
  S.sp.v = v;
}

export const getCtx = (): AudioContext | null => ac;
export const getAnalyser = (): AnalyserNode | null => an;

/* restaurar ajustes guardados al reproducir (hace falta un gesto del usuario, que es el propio play) */
au.addEventListener('play', () => {
  if (S.on || S.sp.on || S.vol < 1) {
    if (!init() && S.vol < 1) { try { au.volume = S.vol; } catch { /* iOS: sin efecto */ } }
  }
});
