/**
 * Controlador de reproducción: carga de canciones, siguiente/anterior, aleatorio, repetir, cola,
 * listas en contexto, saltos en la línea de tiempo, velocidad, temporizador de apagado y Media Session.
 * Es código imperativo sobre el <audio>; el estado visible vive en el store.
 */
import type { PlayCtx, Track } from '../types';
import { au } from './element';
import { emitSync } from './sync';
import { pos, updateNow } from './nowPlaying';
import { S, set, toast } from '../store/useStore';
import { okT, plTracks } from '../store/selectors';
import { key } from '../lib/util';
import { ls } from '../lib/storage';
import { SPEEDS } from '../lib/constants';
import { cacheTrack, caching, cachedBlob } from '../lib/audioCache';
import { ensureThumb } from '../lib/thumbs';
import { rm } from '../room/hooks';

/* ---------- Estado de trabajo (no necesita repintar) ---------- */
let url: string | null = null; // URL de objeto de la fuente actual (si es local o precargada)
let hist: Track[] = [];
let shufQ: Track[] | null = null;
let plCtx: PlayCtx | null = null;
let rndNext: Track | null = null;
let restore: number | null = null; // segundos a los que saltar al cargar
let restoreR: number | null = null; // lo mismo, como fracción (si aún no se conoce la duración)
let loadTok = 0;
let counted = false;
let errN = 0;
let pt = 0;
let lastSave = 0;
let seekUntil = 0;
let seekTm = 0;
let seekFixing = false;

export const streaming = (): boolean => !url;
export const setRestore = (sec: number | null): void => { restore = sec; };
export const setRestoreRatio = (r: number | null): void => { restoreR = r; };
export const resetShuffle = (): void => { shufQ = null; };
export const shufInsert = (t: Track): void => { if (shufQ) shufQ.splice((Math.random() * (shufQ.length + 1)) | 0, 0, t); };
export const forgetTrack = (t: Track): void => { hist = hist.filter((x) => x !== t); };
export const clearHistory = (): void => { hist = []; shufQ = null; };
export const clearCtx = (): void => { plCtx = null; rndNext = null; };
export const isSeekHold = (): boolean => performance.now() < seekUntil;
export const okDur = (d: number): boolean => isFinite(d) && d > 0;

const cur = (): Track | undefined => S().tracks[S().cur];

/* ---------- Cola ---------- */
export function setQueue(q: Track[]): void {
  set({ queue: q });
  preload();
}

/** siguiente canción prevista (para precargarla) */
function peek(): Track | null {
  let s = S();
  /* limpia de la cola lo que ya no existe */
  const alive = s.queue.filter((q) => s.tracks.includes(q));
  if (alive.length !== s.queue.length) { set({ queue: alive }); s = S(); }
  const q = s.queue.find((x) => okT(x, s));
  if (q) return q;
  if (plCtx && !s.repeat) { const r = plRandom(); if (r && okT(r, s)) return r; }
  if (plCtx && s.repeat === 1) { const a = plTracks(plCtx.id, s).filter((t) => okT(t, s)); if (a.length) return a[0]; }
  const n = s.tracks.length;
  if (!n) return null;
  if (s.shuffle && n > 1) {
    if (shufQ) shufQ = shufQ.filter((t) => s.tracks.includes(t) && t !== s.tracks[s.cur] && okT(t, s));
    if (!shufQ || !shufQ.length) { if (shufQ && !s.repeat) return null; mkQ(); }
    return (shufQ && shufQ[0]) || null;
  }
  for (let g = 1; g <= n; g++) {
    const k = s.cur + g;
    if (k >= n && s.repeat !== 1) return null;
    const t = s.tracks[k % n];
    if (okT(t, s) && k % n !== s.cur) return t;
  }
  return null;
}

export function preload(): void {
  const n = peek();
  if (n) void cacheTrack(n);
}

/** otra canción al azar fuera de la lista que sonaba (cuando esta termina) */
function plRandom(): Track | null {
  if (!plCtx) return null;
  const { tracks, cur: c } = S();
  if (!rndNext || !tracks.includes(rndNext) || rndNext === tracks[c] || plCtx.keys.has(key(rndNext))) {
    const ctx = plCtx;
    const pool = tracks.filter((t) => t !== tracks[c] && !ctx.keys.has(key(t)));
    rndNext = pool.length ? pool[(Math.random() * pool.length) | 0] : null;
  }
  return rndNext;
}

/* ---------- Cargar y reproducir ---------- */
export async function load(i: number, play: boolean, push = true): Promise<void> {
  const { tracks } = S();
  if (i < 0 || i >= tracks.length) return;
  const t = tracks[i];
  if (!okT(t)) { toast('Sin conexión: esa canción es del servidor'); return; }
  /* en una sala solo suena música del servidor: lo local no se comparte, así que no se reproduce */
  if (rm.role !== 'none' && !t.remote) { toast('En la sala solo suena música del servidor'); return; }
  /* en una sala, quien no es anfitrión no carga por su cuenta: se lo pide al anfitrión y luego sigue su estado */
  if (rm.role === 'guest' && !rm.applying) { if (play) rm.cmd({ a: 'play', t }); return; }
  const tok = ++loadTok;
  seekUntil = 0;
  clearTimeout(seekTm);
  restoreR = null;
  const prevCur = S().cur;
  if (push && prevCur >= 0 && prevCur !== i) { hist.push(tracks[prevCur]); if (hist.length > 200) hist.shift(); }
  if (shufQ) shufQ = shufQ.filter((x) => x !== t);
  set({ cur: i });
  if (url) { URL.revokeObjectURL(url); url = null; }
  let src = t.url as string;
  if (t.remote) {
    const b = await cachedBlob(src);
    if (b) {
      const u = URL.createObjectURL(b);
      if (tok !== loadTok) { URL.revokeObjectURL(u); return; }
      url = u; src = u; t.cached = true;
    }
    if (tok !== loadTok) return;
  } else { url = URL.createObjectURL(t.blob as Blob); src = url; }
  au.src = src;
  au.loop = S().repeat === 2 && rm.role !== 'guest';
  counted = false;
  /* anfitrión con invitados: la sala fija un instante de arranque común (rm.defer) en vez de sonar ya */
  if (play && !rm.defer(t, restore ?? 0)) { const p = au.play(); if (p) p.catch(() => {}); }
  rm.loaded(t, play, restore ?? 0);
  await updateNow();
  if (play) requestAnimationFrame(() => document.querySelector('.t.on')?.scrollIntoView({ block: 'nearest' }));
  try { history.replaceState(null, '', rm.code ? '#room=' + rm.code : '#' + new URLSearchParams({ c: t.sid || t.name })); } catch { /* sin history */ }
  ls.setStr('last', String(t.id));
  t.th = false;
  ensureThumb(t, true);
  setTimeout(() => {
    if (cur() !== t) return;
    const n = peek();
    (n ? cacheTrack(n) : Promise.resolve()).then(() => { if (cur() === t) void cacheTrack(t); });
  }, 1500);
}

/** Aleatorio: ronda sin repeticiones */
function mkQ(): void {
  const { tracks, cur: c } = S();
  const a = tracks.filter((t) => t !== tracks[c] && okT(t));
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  shufQ = a;
}

/** índice de la canción que sigue (-1 si no hay) */
export function pick(auto: boolean): number {
  let s = S();
  const { tracks } = s;
  const n = tracks.length;
  if (!n) return -1;
  const qi = s.queue.findIndex((q) => okT(q, s) && tracks.includes(q));
  if (qi >= 0) {
    const q = s.queue[qi];
    set({ queue: s.queue.filter((_, k) => k !== qi) });
    preload();
    return tracks.indexOf(q);
  }
  if (plCtx && !s.repeat) {
    const r = plRandom();
    if (r && okT(r, s)) {
      rndNext = null;
      if (!plCtx.done) { plCtx.done = true; toast('Lista terminada: sigue música aleatoria'); }
      return tracks.indexOf(r);
    }
  }
  if (plCtx && s.repeat === 1) {
    const a = plTracks(plCtx.id, s).filter((t) => okT(t, s));
    if (a.length) { set({ queue: a.slice(1) }); preload(); return tracks.indexOf(a[0]); }
  }
  if (s.shuffle && n > 1) {
    if (shufQ) shufQ = shufQ.filter((t) => tracks.includes(t) && t !== tracks[s.cur] && okT(t, s));
    if (!shufQ || !shufQ.length) { if (shufQ && auto && !s.repeat) return -1; mkQ(); }
    s = S();
    const t = shufQ && shufQ.shift();
    return t ? tracks.indexOf(t) : -1;
  }
  let i = s.cur + 1;
  for (let g = 0; g < n; g++, i++) {
    if (i >= n) { if (s.repeat === 1 || !auto) i = 0; else return -1; }
    if (okT(tracks[i], s)) return i;
  }
  return -1;
}

let slpEnd = false;

export function next(auto = false): void {
  if (rm.role === 'guest') { if (!auto) rm.cmd({ a: 'next' }); return; } /* el anfitrión decide la siguiente */
  if (auto && slpEnd) { slpStop('Temporizador: fin de la canción'); return; }
  const i = pick(auto);
  if (i < 0) {
    au.pause();
    const f = S().tracks.findIndex((t) => okT(t));
    if (!S().shuffle && f >= 0) void load(f, false);
    return;
  }
  void load(i, true);
}

export function prev(): void {
  if (rm.role === 'guest') { rm.cmd({ a: 'prev' }); return; }
  if (au.currentTime > 3) { au.currentTime = 0; return; }
  const { tracks, cur: c } = S();
  while (hist.length) {
    const t = hist.pop() as Track, i = tracks.indexOf(t);
    if (i >= 0 && okT(t)) { void load(i, true, false); return; }
  }
  for (let g = 1, n = tracks.length; g <= n; g++) {
    const i = (((c - g) % n) + n) % n;
    if (okT(tracks[i])) { void load(i, true, false); return; }
  }
}

/** reproducir/pausar; en una sala, un invitado se lo pide a la sala (o solo se suma si la sala ya suena) */
export function setPlay(v: boolean): void {
  if (rm.role === 'guest') {
    if (v && rm.playing) { const p = au.play(); if (p) p.catch(() => {}); return; }
    rm.cmd({ a: v ? 'resume' : 'pause' });
    return;
  }
  if (v) { const p = au.play(); if (p) p.catch(() => {}); } else { rm.cancel(); au.pause(); }
}

export function toggle(): void {
  const { tracks, cur: c } = S();
  if (rm.role !== 'guest' && c < 0 && tracks.length) { void load(0, true); return; }
  setPlay(au.paused);
}

/** canción aleatoria de toda la biblioteca */
export function rand(): void {
  const { tracks, cur: c } = S();
  if (!tracks.length) return;
  clearCtx();
  const cs = tracks.map((_, i) => i).filter((i) => okT(tracks[i]) && i !== c);
  if (!cs.length) { toast('No hay canciones disponibles sin conexión'); return; }
  void load(cs[(Math.random() * cs.length) | 0], true);
}

/** tocar una canción suelta (fuera de una lista): se olvida el contexto */
export function playSingle(i: number): void { clearCtx(); void load(i, true); }

/** tocar una canción de la cola: sale de la cola y suena */
export function playFromQueue(qi: number, i: number): void {
  set({ queue: S().queue.filter((_, k) => k !== qi) });
  preload();
  void load(i, true);
}

export function playList(arr: Track[], s: number, id: string): void {
  if (s < 0 || !arr.length) return;
  plCtx = { id, keys: new Set(arr.map(key)), done: false };
  rndNext = null;
  set({ queue: arr.slice(s + 1) });
  void load(S().tracks.indexOf(arr[s]), true);
  preload();
}

export function playPl(id: string): void {
  const a = plTracks(id);
  if (a.length) playList(a, 0, id); else toast('La playlist está vacía');
}

export function toggleShuffle(): void {
  const v = !S().shuffle;
  set({ shuffle: v });
  shufQ = null;
  toast(v ? 'Aleatorio activado' : 'Aleatorio desactivado');
  preload();
}

export function cycleRepeat(): void {
  const r = ((S().repeat + 1) % 3) as 0 | 1 | 2;
  set({ repeat: r });
  au.loop = r === 2;
  toast(['Repetir: desactivado', 'Repetir toda la lista', 'Repetir esta canción'][r]);
  preload();
}

/* ---------- Estadísticas ---------- */
export function bump(t: Track | undefined): void {
  if (!t) return;
  const k = key(t);
  set((s) => {
    const c = s.stats[k] || { n: 0, ts: 0 };
    return { stats: { ...s.stats, [k]: { n: c.n + 1, ts: Date.now() } } };
  });
}

/* ---------- Línea de tiempo ---------- */
const inSeek = (x: number): boolean => {
  const r = au.seekable;
  for (let i = 0; i < r.length; i++) if (x >= r.start(i) - 0.5 && x <= r.end(i) + 0.5) return true;
  return false;
};

export function seekTo(sec: number): void {
  if (rm.role === 'guest') { if (isFinite(sec)) rm.cmd({ a: 'seek', p: Math.max(0, sec) }); return; }
  seekLocal(sec);
}

/** salta en este dispositivo (en una sala lo usa la propia sala para seguir al anfitrión) */
export function seekLocal(sec: number): void {
  const t = cur();
  if (!t || !isFinite(sec)) return;
  const d = au.duration;
  sec = okDur(d) ? Math.min(Math.max(0, sec), Math.max(0, d - 0.25)) : Math.max(0, sec);
  /* servidor sin soporte de rangos: el navegador no puede saltar a lo no descargado → se baja el archivo y se continúa desde ahí */
  if (t.remote && !url && au.readyState >= 1 && !inSeek(sec)) { void seekFix(t, sec); return; }
  seekUntil = performance.now() + 1500;
  try { au.currentTime = sec; } catch { /* aún sin metadatos */ }
  pos();
  clearTimeout(seekTm);
  let n = 0;
  const chk = () => {
    if (cur() !== t || au.loop || au.ended) return;
    if (au.seeking && n++ < 3) { seekTm = window.setTimeout(chk, 1200); return; }
    if (Math.abs(au.currentTime - sec) > 4 && !inSeek(sec)) void seekFix(t, sec); else emitSync();
  };
  seekTm = window.setTimeout(chk, 1200);
}

async function seekFix(t: Track, sec: number): Promise<void> {
  if (!t.remote || url || seekFixing) return;
  seekFixing = true;
  const was = !au.paused;
  try {
    toast('Descargando la canción para poder saltar…');
    if (caching.has(t)) { while (caching.has(t)) await new Promise((r) => setTimeout(r, 300)); } else await cacheTrack(t);
    if (cur() !== t) return;
    const b = await cachedBlob(t.url as string);
    if (!b) { toast('No se puede saltar en esta canción'); emitSync(); return; }
    const u = URL.createObjectURL(b);
    if (cur() !== t || url) { URL.revokeObjectURL(u); return; }
    url = u; t.cached = true; restore = sec; seekUntil = performance.now() + 2500;
    au.src = u;
    au.loop = S().repeat === 2;
    if (was) { const p = au.play(); if (p) p.catch(() => {}); }
  } catch { toast('No se puede saltar en esta canción'); emitSync(); } finally { seekFixing = false; }
}

/* ---------- Velocidad (conserva el tono) ---------- */
let spd = parseFloat(ls.str('spd') || '');
if (!(SPEEDS as readonly number[]).includes(spd)) spd = 1;
export function applySpeed(): void {
  au.defaultPlaybackRate = spd;
  au.playbackRate = spd;
  try {
    au.preservesPitch = true;
    (au as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
  } catch { /* sin soporte */ }
}
export function setSpeed(v: number): void {
  spd = v;
  ls.setStr('spd', String(v));
  applySpeed();
  set({ speed: v });
}
set({ speed: spd });

/* ---------- Temporizador de apagado: minutos fijos o al terminar la canción ---------- */
let slpAt = 0;
let slpTm = 0;
const slpClear = (): void => { clearTimeout(slpTm); slpAt = 0; slpEnd = false; };
function slpStop(msg?: string): void { slpClear(); au.pause(); toast(msg || 'Temporizador: reproducción detenida'); }
export function sleepIn(min: number): void {
  slpClear();
  slpAt = Date.now() + min * 60000;
  slpTm = window.setTimeout(() => slpStop(), min * 60000);
  toast('Se detendrá en ' + min + ' min');
}
export function sleepAtEnd(): void { slpClear(); slpEnd = true; toast('Se detendrá al terminar la canción'); }
export function sleepOff(): void { slpClear(); toast('Temporizador desactivado'); }
export const sleepActive = (): boolean => !!(slpAt || slpEnd);
export const sleepLabel = (): string =>
  slpAt ? 'Temporizador: ' + Math.max(1, Math.ceil((slpAt - Date.now()) / 60000)) + ' min'
    : slpEnd ? 'Temporizador: fin de la canción' : 'Temporizador de apagado';

/* ---------- Eventos del <audio> y Media Session ---------- */
let started = false;
export function initPlayer(): void {
  if (started) return;
  started = true;
  const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;

  au.addEventListener('play', () => { set({ playing: true }); if (ms) ms.playbackState = 'playing'; });
  au.addEventListener('pause', () => { set({ playing: false }); if (ms) ms.playbackState = 'paused'; });
  au.addEventListener('ended', () => {
    if (rm.role === 'guest') return; /* en una sala, el anfitrión decide qué suena después */
    if (S().repeat === 2) { au.currentTime = 0; void au.play(); } else next(true);
  });
  au.addEventListener('playing', () => {
    errN = 0;
    if (!counted && S().cur >= 0) { counted = true; bump(cur()); }
  });
  au.addEventListener('error', () => {
    const t = cur();
    if (!t) return;
    toast('No se puede reproducir: ' + t.name);
    if (++errN > 3) { toast('Varios errores seguidos: reproducción detenida'); return; }
    if (S().tracks.length > 1) setTimeout(() => next(true), 800);
  });
  au.addEventListener('loadedmetadata', () => {
    if (restore != null) { au.currentTime = restore; restore = null; }
    if (restoreR != null && okDur(au.duration)) { au.currentTime = restoreR * au.duration; restoreR = null; }
    pos();
  });
  au.addEventListener('timeupdate', () => {
    if (S().repeat === 2 && au.duration && pt > au.duration - 3 && au.currentTime < 3) bump(cur());
    pt = au.currentTime;
    if (slpAt && Date.now() >= slpAt) slpStop(); /* respaldo si el temporizador se retrasa en segundo plano */
    const n = Date.now();
    if (n - lastSave > 2000) { lastSave = n; ls.setStr('pos', String(au.currentTime)); pos(); }
  });
  au.addEventListener('seeked', () => { seekUntil = 0; emitSync(); });
  ['loadstart', 'loadedmetadata'].forEach((ev) => au.addEventListener(ev, applySpeed));
  au.addEventListener('ratechange', () => pos());
  applySpeed();

  if (ms) {
    const h = (a: MediaSessionAction, f: MediaSessionActionHandler) => { try { ms.setActionHandler(a, f); } catch { /* acción no soportada */ } };
    h('play', () => setPlay(true));
    h('pause', () => setPlay(false));
    h('previoustrack', prev);
    h('nexttrack', () => next(false));
    /* IMPORTANTE (iPhone/iPad): si hay manejadores de seekbackward/seekforward, iOS los muestra en el Centro de control y la
       pantalla de bloqueo EN LUGAR de los botones de canción anterior/siguiente (saltos de ±10 s). Por eso se quitan a propósito;
       "seekto" sí se conserva porque solo habilita arrastrar la barra de tiempo del sistema. */
    try { ms.setActionHandler('seekbackward', null); ms.setActionHandler('seekforward', null); } catch { /* acción no soportada */ }
    h('seekto', (d) => { if (d.seekTime != null) seekTo(d.seekTime); });
    h('stop', () => { au.pause(); au.currentTime = 0; });
  }
}
