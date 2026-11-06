/**
 * Escuchar juntos: salas sin servidor propio ni base de datos.
 *
 * - Quien crea la sala es el ANFITRIÓN: su reproductor manda. Los demás son INVITADOS y siguen su estado.
 * - Todos los mensajes viajan por un "buzón" público (MQTT sobre WebSocket, ver mqtt.ts) en un tema con el código de la sala.
 *   El primer carácter del código dice qué broker usa la sala, así todos llegan al mismo.
 * - La música NUNCA pasa por la sala ni por el anfitrión: cada dispositivo la baja directo del servidor. Por el buzón solo
 *   viajan mensajes pequeños ("suena X, en esta posición, desde este instante"). En la sala solo suena música del servidor.
 * - Las canciones se identifican con h64(sid): todos deben tener la misma biblioteca del servidor.
 * - Arranque programado: al cambiar de canción el anfitrión fija un instante común unos cientos de ms en el futuro; todos
 *   cargan la canción mientras tanto y le dan al play a la vez (en vez de que el anfitrión arranque y los demás lleguen tarde).
 * - Los colores (acento, modo RGB y tema claro/oscuro) también se comparten; al salir vuelve el color propio.
 * - Cualquiera puede pausar, saltar, mover la barra y agregar canciones a la cola; el anfitrión aplica la orden y
 *   publica el estado nuevo (canción, posición, si suena, cola, miembros). Un reloj compartido (ping/pong) compensa la demora.
 * - Si el anfitrión sale, la sala se cierra; a cada invitado le sigue sonando lo que tenía.
 */
import { create } from 'zustand';
import type { Track } from '../types';
import { au } from '../audio/element';
import { load, next, playSingle, prev, seekLocal, setQueue, setRestore } from '../audio/player';
import { S, set, toast, useStore } from '../store/useStore';
import { accHooks, accLook, applyAccLook, cleanAccLook, restoreAcc, type AccLook } from '../fx/accent';
import { getTheme, type Theme } from '../lib/theme';
import { h64 } from '../lib/util';
import { ls } from '../lib/storage';
import { copy } from '../lib/links';
import { Mqtt } from './mqtt';
import { rm, type RoomCmd } from './hooks';

/* ---------- Estado visible (la interfaz lo lee con useRoom) ---------- */
export interface Member { id: string; name: string; host: boolean }
interface RoomUi {
  role: 'none' | 'host' | 'guest';
  code: string;
  /** idle: sin sala · connecting: conectando o buscando la sala · live: dentro y sincronizado */
  status: 'idle' | 'connecting' | 'live';
  members: Member[];
  /** ventana de la sala abierta */
  open: boolean;
  /** código de una sala a la que te invitaron por enlace (pide confirmar con un toque) */
  invite: string;
  name: string;
  /** latencia (ms) de ida y vuelta con el anfitrión; 0 si aún no se midió */
  lag: number;
  /** compartir colores con la sala */
  syncLook: boolean;
}
export const useRoom = create<RoomUi>()(() => ({
  role: 'none', code: '', status: 'idle', members: [], open: false, invite: '', name: ls.str('rname') || '', lag: 0, syncLook: ls.str('rlook') !== '0',
}));
const ui = useRoom.setState;

export const openRoom = (): void => { ui({ open: true }); };
export const closeRoomUi = (): void => { ui({ open: false, invite: '' }); };
export function setRoomName(v: string): void { ls.setStr('rname', v); ui({ name: v }); }
export function setSyncLook(v: boolean): void {
  ls.setStr('rlook', v ? '1' : '0');
  ui({ syncLook: v });
  if (rm.role === 'none') return;
  if (v) { rm.look = true; lookV = 0; if (rm.role === 'host') emitLook(); } else dropLook();
}

/* ---------- Códigos y enlaces ---------- */
/** servicios de buzón públicos (el primero que responda); el primer carácter del código indica cuál */
const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081'];
const DIGITS = '234';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randStr = (n: number, alphabet = ALPHA): string => {
  const a = crypto.getRandomValues(new Uint8Array(n));
  return [...a].map((x) => alphabet[x % alphabet.length]).join('');
};

/** acepta el código con o sin guion, en minúsculas, o un enlace completo; devuelve '' si no es válido */
export function normCode(raw: string): string {
  let s = String(raw || '');
  const m = /room=([A-Za-z0-9-]+)/.exec(s);
  if (m) s = m[1];
  s = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 8 || !DIGITS.includes(s[0]) || ![...s.slice(1)].every((c) => ALPHA.includes(c))) return '';
  return s;
}
export const fmtCode = (c: string): string => (c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c);
export const roomLink = (code = rm.code): string => location.href.split('#')[0] + '#room=' + code;

export async function copyRoomLink(): Promise<void> {
  if (!rm.code) return;
  toast((await copy(roomLink())) ? 'Enlace de la sala copiado' : 'No se pudo copiar el enlace');
}
export async function copyRoomCode(): Promise<void> {
  if (!rm.code) return;
  toast((await copy(fmtCode(rm.code))) ? 'Código copiado' : 'No se pudo copiar el código');
}
export async function shareRoom(): Promise<void> {
  if (!rm.code) return;
  if (navigator.share) {
    try { await navigator.share({ title: 'brplayer', text: 'Escuchemos juntos en brplayer', url: roomLink() }); return; } catch { /* cancelado */ }
  }
  void copyRoomLink();
}

/* ---------- Identidad ---------- */
const me = randStr(10, 'abcdefghijklmnopqrstuvwxyz0123456789');
export const myId = (): string => me;
const clean = (n: unknown): string => String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
const myName = (): string => clean(useRoom.getState().name) || 'Invitado ' + me.slice(0, 3).toUpperCase();

/* ---------- Canciones: se identifican con h64(sid) ---------- */
const hOf = (t: Track): string => h64(String(t.sid || t.name));
let libKey: Track[] | null = null;
let libMap = new Map<string, Track>();
function lib(): Map<string, Track> {
  const tr = S().tracks;
  if (libKey !== tr) {
    libKey = tr;
    libMap = new Map();
    for (const t of tr) if (t.remote) libMap.set(hOf(t), t);
  }
  return libMap;
}
const mapSids = (list: string[] | undefined): Track[] =>
  (Array.isArray(list) ? list : []).map((h) => lib().get(h)).filter((t): t is Track => !!t);

/* ---------- Mensajes ---------- */
interface Msg {
  k: string; f: string; n?: string; a?: string; s?: string; q?: string[]; p?: number; c?: number; h?: number; to?: string;
  cur?: string; pl?: number; pos?: number; ts?: number; m?: Array<[string, string]>; host?: boolean;
  r?: number; lk?: { a?: unknown; th?: unknown }; lv?: number; v?: number;
}

let net: Mqtt | null = null;
let curCode = '';
let attempt = 0; /* sube al cancelar: los intentos en curso se descartan */
let timers: number[] = [];
let kickTm = 0;
let reTm = 0;
let reTry = 0;

/* anfitrión */
const peers = new Map<string, { n: string; seen: number; rtt: number }>();
let pend: { at: number; pos: number } | null = null; /* arranque programado de la canción que acaba de cargar */
let pendTm = 0;
let loadedSid = ''; /* canción que ya está cargada en el reproductor (la actual puede estar aún descargándose) */

/* invitado */
let hostId = '';
let gotState = false;
let joinAt = 0;
let lastState = 0;
let offset = 0; /* reloj del anfitrión − reloj propio (ms) */
let bestRtt = Infinity;
let forceReload = false;
let lastLoadAt = 0;
let loading = false; /* se pidió cargar una canción y aún no llegaron sus metadatos */
let tickN = 0;
let tapWarned = false;
let missingWarned = '';
let localWarned = false;
let unlocked = false;
let unlockTok = 0;
let unlockPos = 0;
let curRtt = 0; /* latencia reciente con el anfitrión (ms) */
let lastMsg: Msg | null = null; /* último estado del anfitrión: sirve para corregir el desfase entre estados */
let startTm = 0;
let lastFixAt = 0;
let lookV = 0; /* versión de los colores de la sala (hora del anfitrión del último cambio) */
let lookBusy = false;

/** diferencia máxima (s) que se tolera antes de saltar a la posición correcta */
const DRIFT = 0.45;

function send(m: Omit<Msg, 'f'>): void {
  if (net) net.publish(JSON.stringify({ ...m, f: me }));
}

/* ---------- Conexión ---------- */
async function openNet(code: string, my: number): Promise<void> {
  const c = new Mqtt('brp_' + me, 'brplayer/v1/' + code);
  c.onMessage = onText;
  c.onClose = () => { if (net === c) { net = null; onNetClose(); } };
  await c.connect(BROKERS[DIGITS.indexOf(code[0])]);
  if (my !== attempt) { c.close(); throw new Error('cancelado'); }
  net = c;
}

const inRoom = (): boolean => rm.role !== 'none';

function onNetClose(): void {
  if (rm.role === 'none') return;
  ui({ status: 'connecting' });
  toast('Se cayó la conexión con la sala: reconectando…');
  reconnect();
}

function reconnect(): void {
  clearTimeout(reTm);
  reTm = window.setTimeout(async () => {
    if (rm.role === 'none') return;
    try {
      await openNet(curCode, attempt);
      reTry = 0;
      lastState = Date.now();
      if (rm.role === 'host') { ui({ status: 'live' }); syncMembersUi(); kick(); }
      else { gotState = false; joinAt = Date.now(); send({ k: 'hello', n: myName(), r: curRtt }); pingHost(); }
    } catch {
      if (!inRoom()) return; /* mientras reconectaba, el usuario salió */
      if (++reTry > 8) leaveRoom('Se perdió la conexión con la sala');
      else reconnect();
    }
  }, Math.min(2000 * (reTry + 1), 8000));
}

/* ---------- Crear y unirse ---------- */
export async function createRoom(): Promise<void> {
  if (rm.role !== 'none' || useRoom.getState().status === 'connecting') return;
  const my = ++attempt;
  ui({ status: 'connecting', role: 'none', code: '' });
  const suffix = randStr(7);
  let code = '';
  for (let i = 0; i < BROKERS.length && !code; i++) {
    const c = DIGITS[i] + suffix;
    try { await openNet(c, my); code = c; } catch { /* se prueba el siguiente servicio */ }
    if (my !== attempt) return;
  }
  if (!code) { ui({ status: 'idle' }); toast('No se pudo crear la sala: revisa tu conexión'); return; }
  rm.role = 'host';
  rm.code = curCode = code;
  peers.clear();
  startLook(true);
  ui({ role: 'host', code, status: 'live', invite: '', members: [{ id: me, name: myName(), host: true }], lag: 0 });
  startTimers();
  setHash();
  kick();
  toast('Sala creada. Comparte el enlace o el código');
}

/* Safari/Chrome solo dejan sonar si el <audio> ya se activó con un toque: al unirse se "desbloquea" con un audio mudo */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function unlockAudio(): void {
  if (!au.paused) return; /* ya está sonando: ya estaba activado */
  unlockPos = au.currentTime || 0;
  unlocked = true;
  const tok = ++unlockTok;
  au.src = SILENT;
  const p = au.play();
  if (p) p.then(() => { if (tok === unlockTok) au.pause(); }, () => {});
}
function restoreAfterUnlock(): void {
  if (!unlocked) return;
  unlocked = false;
  unlockTok++;
  const c = S().cur;
  if (c >= 0) { setRestore(unlockPos); void load(c, false, false); }
}

export async function joinRoom(raw: string): Promise<void> {
  const code = normCode(raw);
  if (!code) { toast('Ese código no es válido'); return; }
  if (rm.role !== 'none') { toast('Ya estás en una sala'); return; }
  if (useRoom.getState().status === 'connecting') return;
  unlockAudio(); /* debe ocurrir dentro del toque del usuario */
  const my = ++attempt;
  ui({ status: 'connecting', role: 'none', code: '', invite: '' });
  try { await openNet(code, my); } catch {
    if (my !== attempt) { restoreAfterUnlock(); return; }
    ui({ status: 'idle' });
    restoreAfterUnlock();
    toast('No se pudo conectar con la sala');
    return;
  }
  rm.role = 'guest';
  rm.code = curCode = code;
  rm.playing = false;
  hostId = '';
  gotState = false;
  forceReload = true;
  offset = 0;
  bestRtt = Infinity;
  tickN = 0;
  tapWarned = false;
  missingWarned = '';
  curRtt = 0;
  lastMsg = null;
  lastFixAt = 0;
  joinAt = lastState = Date.now();
  startLook(false);
  ui({ role: 'guest', code, status: 'connecting', members: [], lag: 0 });
  startTimers();
  setHash();
  send({ k: 'hello', n: myName() });
  pingHost();
  [400, 900, 1600, 2600].forEach((ms) => setTimeout(pingHost, ms)); /* varias muestras al entrar: el reloj compartido queda afinado enseguida */
}

/** cancela un intento de conexión o sale de la sala */
export function cancelRoom(): void {
  if (rm.role !== 'none') { leaveRoom(); return; }
  attempt++;
  ui({ status: 'idle' });
  restoreAfterUnlock();
}

export function leaveRoom(msg?: string): void {
  const role = rm.role;
  if (role !== 'none') send({ k: 'bye', host: role === 'host' });
  attempt++;
  stopTimers();
  clearTimeout(kickTm);
  clearTimeout(reTm);
  clearTimeout(pendTm);
  clearTimeout(startTm);
  pend = null;
  lastMsg = null;
  const c = net;
  net = null;
  if (c) setTimeout(() => c.close(), 200); /* da tiempo a que salga el "bye" */
  rm.role = 'none';
  rm.code = '';
  rm.playing = false;
  curCode = '';
  hostId = '';
  gotState = false;
  peers.clear();
  dropLook();
  restoreAfterUnlock();
  ui({ role: 'none', code: '', status: 'idle', members: [], invite: '', lag: 0 });
  if (role === 'none') return;
  const t = S().tracks[S().cur];
  try { history.replaceState(null, '', t ? '#' + new URLSearchParams({ c: t.sid || t.name }) : location.pathname + location.search); } catch { /* sin history */ }
  if (msg) toast(msg);
}

/** la dirección pasa a ser el enlace de la sala: copiarla desde el navegador también sirve */
function setHash(): void { try { history.replaceState(null, '', '#room=' + rm.code); } catch { /* sin history */ } }

function startTimers(): void {
  stopTimers();
  timers.push(window.setInterval(rm.role === 'host' ? hostTick : guestTick, rm.role === 'host' ? 4000 : 2000));
}
function stopTimers(): void { timers.forEach(clearInterval); timers = []; }

/* ---------- Mensajes recibidos ---------- */
function onText(text: string): void {
  let m: Msg;
  try { m = JSON.parse(text) as Msg; } catch { return; }
  if (!m || typeof m.k !== 'string' || typeof m.f !== 'string' || m.f === me) return;
  if (rm.role === 'host') hostMsg(m); else if (rm.role === 'guest') guestMsg(m);
}

/* ===================== ANFITRIÓN ===================== */
function syncMembersUi(): void {
  ui({ members: memberList().map(([id, name], i) => ({ id, name, host: i === 0 })) });
}
const memberList = (): Array<[string, string]> => [[me, myName()], ...[...peers].map(([id, p]): [string, string] => [id, p.n])];

function hostMsg(m: Msg): void {
  const touch = (): void => {
    const old = peers.get(m.f);
    const n = clean(m.n) || (old ? old.n : '') || 'Invitado';
    peers.set(m.f, { n, seen: Date.now(), rtt: typeof m.r === 'number' && m.r >= 0 && m.r < 10000 ? m.r : old ? old.rtt : 0 });
    if (!old) { toast(n + ' se unió a la sala'); syncMembersUi(); kick(); }
  };
  switch (m.k) {
    case 'hello': touch(); kick(); break;
    case 'hb': touch(); break;
    case 'bye': {
      const p = peers.get(m.f);
      if (p) { peers.delete(m.f); toast(p.n + ' salió de la sala'); syncMembersUi(); kick(); }
      break;
    }
    case 'ping': send({ k: 'pong', to: m.f, c: m.c, h: Date.now() }); break;
    case 'cmd': touch(); doCmd(m); break;
    case 'look': remoteLook(m); break;
  }
}

function hostTick(): void {
  const now = Date.now();
  let changed = false;
  peers.forEach((p, id) => {
    if (now - p.seen > 30000) { peers.delete(id); changed = true; toast(p.n + ' salió de la sala'); }
  });
  if (changed) syncMembersUi();
  publishState();
}

function publishState(pos?: number, play?: boolean): void {
  if (rm.role !== 'host') return;
  const s = S();
  const t = s.tracks[s.cur];
  const cur = t && t.remote ? hOf(t) : '';
  if (cur && cur !== loadedSid) return; /* la canción actual aún se está cargando: se publica al terminar */
  /* con un arranque programado el estado dice "empieza en `at` desde `pos`": ts en el futuro = todavía no suena */
  const sch = pend && Date.now() < pend.at ? pend : null;
  send({
    k: 'state', cur, pl: sch || (play ?? !au.paused) ? 1 : 0, pos: sch ? sch.pos : pos ?? (au.currentTime || 0), ts: sch ? sch.at : Date.now(),
    q: s.queue.filter((x) => x.remote).map(hOf), m: memberList(),
    ...(useRoom.getState().syncLook ? { lk: snapLook(), lv: lookV } : {}),
  });
}

/** margen entre "se decidió" y "suena": lo justo para que el invitado más lento reciba el mensaje y cargue la canción */
function leadMs(): number {
  let r = 0;
  peers.forEach((p) => { if (p.rtt > r) r = p.rtt; });
  return Math.min(2500, Math.max(800, r / 2 + 700));
}

function startPend(): void {
  if (!pend) return;
  pend = null;
  const p = au.play();
  if (p) p.catch(() => {});
}

/* El reproductor del anfitrión pregunta aquí antes de dar play a una canción nueva (solo si hay invitados) */
rm.defer = (_t: Track, pos: number): boolean => {
  clearTimeout(pendTm);
  pend = null;
  if (rm.role !== 'host' || !peers.size) return false;
  const at = Date.now() + leadMs();
  pend = { at, pos };
  pendTm = window.setTimeout(startPend, at - Date.now());
  return true;
};
rm.cancel = (): void => {
  clearTimeout(pendTm);
  if (pend) { pend = null; kick(); }
};

/** publica el estado en un instante (agrupa varios cambios seguidos) */
function kick(pos?: number, play?: boolean): void {
  if (rm.role !== 'host') return;
  clearTimeout(kickTm);
  kickTm = window.setTimeout(() => publishState(pos, play), 120);
}

function doCmd(m: Msg): void {
  const t = m.s ? lib().get(m.s) : undefined;
  switch (m.a) {
    case 'play': if (t) playSingle(S().tracks.indexOf(t)); break;
    case 'resume': {
      const { tracks, cur } = S();
      if (cur < 0 && tracks.length) void load(0, true);
      else { const p = au.play(); if (p) p.catch(() => {}); }
      break;
    }
    case 'pause': rm.cancel(); au.pause(); break;
    case 'seek': if (typeof m.p === 'number' && isFinite(m.p)) seekLocal(m.p); break;
    case 'next': next(false); break;
    case 'prev': prev(); break;
    case 'qadd': setQueue([...S().queue, ...mapSids(m.q)]); break;
    case 'qset': setQueue(mapSids(m.q)); break;
  }
  kick();
}

/* ===================== INVITADO ===================== */
const pingHost = (): void => {
  bestRtt = bestRtt * 1.2 + 4; /* con el tiempo se aceptan muestras algo peores: el reloj se va adaptando */
  send({ k: 'ping', c: Date.now() });
};
const hostNow = (): number => Date.now() + offset;
accHooks.clock = () => Date.now() + (rm.role === 'guest' ? offset : 0);

function guestMsg(m: Msg): void {
  if (m.k === 'state') {
    if (!hostId) hostId = m.f;
    if (m.f === hostId) applyState(m);
  } else if (m.k === 'pong') {
    if (m.to !== me || typeof m.c !== 'number' || typeof m.h !== 'number') return;
    const now = Date.now(), rtt = now - m.c;
    if (rtt >= 0 && rtt < 10000) { curRtt = curRtt ? curRtt * 0.6 + rtt * 0.4 : rtt; ui({ lag: Math.round(curRtt) }); }
    if (rtt >= 0 && rtt < bestRtt) { bestRtt = rtt; offset = m.h + rtt / 2 - now; }
  } else if (m.k === 'look') {
    remoteLook(m);
  } else if (m.k === 'bye' && m.host && m.f === hostId) {
    leaveRoom('El anfitrión cerró la sala. Lo que suena sigue sonando');
  }
}

function guestTick(): void {
  tickN++;
  const now = Date.now();
  if (!gotState) {
    send({ k: 'hello', n: myName() });
    if (useRoom.getState().status === 'connecting' && now - joinAt > 10000 && net) leaveRoom('No encontré esa sala. Revisa el código o pide un enlace nuevo');
    return;
  }
  if (useRoom.getState().status === 'live' && now - lastState > 25000) { leaveRoom('Se perdió al anfitrión: saliste de la sala'); return; }
  if (tickN % 5 === 0) send({ k: 'hb', n: myName(), r: Math.round(curRtt) });
  if (tickN % 7 === 0) pingHost();
  if (lastMsg) correct(lastMsg); /* el desfase se vigila cada 2 s, no solo cuando llega un estado */
}

/** posición que debería tener ahora mismo la canción, según el último estado del anfitrión */
function expectedPos(m: Msg): number {
  let p = (m.pos || 0) + (m.pl ? Math.max(0, (hostNow() - (m.ts || 0)) / 1000) : 0);
  if (isFinite(au.duration) && au.duration > 0) p = Math.min(p, Math.max(0, au.duration - 0.3));
  return p;
}

function playLocal(): void {
  const p = au.play();
  if (p) {
    p.catch(() => {
      if (tapWarned) return;
      tapWarned = true;
      toast('El navegador bloqueó el audio: toca ▶ para sumarte');
    });
  }
}

/** salta a la posición correcta si el desfase con el anfitrión pasa de DRIFT (no toca nada mientras carga o se recarga) */
function correct(m: Msg): void {
  if (!m.pl || !m.cur || rm.role !== 'guest') return;
  const now = S().tracks[S().cur];
  if (!now || hOf(now) !== m.cur || loadedSid !== m.cur) return;
  if (hostNow() < (m.ts || 0) - 40) return; /* todavía no empieza */
  if (au.paused || au.seeking || au.readyState < 3) return;
  if (performance.now() - lastFixAt < 4000) return;
  const e = expectedPos(m);
  if (Math.abs(au.currentTime - e) > DRIFT) { lastFixAt = performance.now(); seekLocal(e); }
}

/** da play justo cuando el anfitrión empieza; si la canción aún no está lista, reintenta unos instantes */
function armStart(wait: number): void {
  clearTimeout(startTm);
  let tries = 0;
  const go = (): void => {
    startTm = 0;
    const m = lastMsg;
    if (rm.role !== 'guest' || !m || !m.pl) return;
    if (loadedSid !== m.cur && tries++ < 40) { startTm = window.setTimeout(go, 100); return; }
    playLocal();
    const e = expectedPos(m);
    if (au.readyState >= 1 && Math.abs(au.currentTime - e) > DRIFT) { lastFixAt = performance.now(); seekLocal(e); }
  };
  startTm = window.setTimeout(go, Math.max(0, wait));
}

function applyState(m: Msg): void {
  lastState = Date.now();
  lastMsg = m;
  rm.playing = !!m.pl;
  const first = !gotState;
  if (first) { gotState = true; unlocked = false; unlockTok++; }
  ui({
    status: 'live',
    members: (Array.isArray(m.m) ? m.m : []).map(([id, name], i) => ({ id: String(id), name: clean(name) || 'Invitado', host: i === 0 })),
  });

  /* colores de la sala */
  if (rm.look && m.lk && typeof m.lv === 'number' && m.lv > lookV) applyLook(m.lk, m.lv);

  /* cola compartida */
  const q = mapSids(m.q);
  const cq = S().queue;
  if (q.length !== cq.length || q.some((t, i) => t !== cq[i])) {
    rm.applying = true;
    try { setQueue(q); } finally { rm.applying = false; }
  }

  /* canción actual */
  if (!m.cur) { clearTimeout(startTm); if (!au.paused) au.pause(); return; }
  const idx = S().tracks.findIndex((t) => t.remote && hOf(t) === m.cur);
  if (idx < 0) {
    clearTimeout(startTm);
    if (missingWarned !== m.cur) { missingWarned = m.cur; toast('Esa canción no está en tu biblioteca'); }
    if (!au.paused) au.pause();
    return;
  }
  /* ts en el futuro = el anfitrión programó el arranque: se carga ya y se da play a la vez que él */
  const wait = m.pl ? (m.ts || 0) - hostNow() : 0;
  const future = wait > 40;
  const now = S().tracks[S().cur];
  if (forceReload || !now || hOf(now) !== m.cur) {
    forceReload = false;
    loading = true;
    lastLoadAt = performance.now();
    clearTimeout(startTm);
    setRestore(future ? m.pos || 0 : expectedPos(m));
    rm.applying = true;
    try { void load(idx, !future && !!m.pl, false); } finally { rm.applying = false; }
    if (future) armStart(wait);
    return;
  }

  /* misma canción: reproducir/pausar se aplica siempre; el desfase se corrige solo cuando ya terminó de cargar */
  const settled = (!loading || performance.now() - lastLoadAt > 15000) && au.readyState >= 1 && !au.seeking;
  if (m.pl) {
    if (future) {
      if (!au.paused) au.pause();
      if (settled && Math.abs(au.currentTime - (m.pos || 0)) > 0.5) seekLocal(m.pos || 0);
      armStart(wait);
    } else {
      clearTimeout(startTm);
      if (au.paused) playLocal();
      correct(m);
    }
  } else {
    clearTimeout(startTm);
    if (!au.paused) au.pause();
    if (settled && Math.abs(au.currentTime - (m.pos || 0)) > 0.5) seekLocal(m.pos || 0);
  }
}

/* ===================== COLORES COMPARTIDOS ===================== */
const roomNow = (): number => Date.now() + (rm.role === 'guest' ? offset : 0);
const snapLook = (): { a: AccLook; th: Theme } => ({ a: accLook(), th: S().theme });

/** activa los colores de la sala al entrar (si la opción está encendida) */
function startLook(host: boolean): void {
  lookV = host ? Date.now() : 0;
  rm.look = useRoom.getState().syncLook;
}

/** deja de usar los colores de la sala y recupera los propios */
function dropLook(): void {
  if (!rm.look) return;
  rm.look = false;
  lookBusy = true;
  try { restoreAcc(); set({ theme: getTheme() }); } finally { lookBusy = false; }
}

function applyLook(l: { a?: unknown; th?: unknown }, v: number): void {
  lookV = v;
  const a = cleanAccLook(l.a);
  lookBusy = true;
  try {
    if (a) applyAccLook(a);
    if (l.th === 'auto' || l.th === 'light' || l.th === 'dark') { if (S().theme !== l.th) set({ theme: l.th }); }
  } finally { lookBusy = false; }
}

/** alguien de la sala cambió el color: se aplica aquí tal cual (el último cambio manda) */
function remoteLook(m: Msg): void {
  if (!rm.look || !m.lk || typeof m.v !== 'number' || !isFinite(m.v) || m.v <= lookV) return;
  applyLook(m.lk, m.v);
  if (rm.role === 'host') kick();
}

/** el usuario cambió el color o el tema: se avisa a todos */
function emitLook(): void {
  if (rm.role === 'none' || !rm.look || lookBusy) return;
  lookV = Math.max(lookV + 1, roomNow());
  send({ k: 'look', lk: snapLook(), v: lookV });
  if (rm.role === 'host') kick();
}
accHooks.onChange = emitLook;
useStore.subscribe((s, p) => { if (s.theme !== p.theme) emitLook(); });

/* ---------- Conexión con el reproductor ---------- */
rm.cmd = (c: RoomCmd): void => {
  if (rm.role !== 'guest') return;
  if (c.a === 'play') {
    if (!c.t.remote) { toast('Las canciones importadas no se pueden compartir en la sala'); return; }
    send({ k: 'cmd', a: 'play', s: hOf(c.t) });
  } else if (c.a === 'seek') send({ k: 'cmd', a: 'seek', p: c.p });
  else send({ k: 'cmd', a: c.a });
};

rm.loaded = (t: Track, play: boolean, pos: number): void => {
  loadedSid = t.remote ? hOf(t) : '';
  if (rm.role === 'host') { if (pend) publishState(); else kick(pos, play); }
};

/* el anfitrión publica cada cambio del reproductor */
['pause', 'playing', 'seeked'].forEach((ev) => au.addEventListener(ev, () => kick()));
['loadedmetadata', 'error'].forEach((ev) => au.addEventListener(ev, () => { loading = false; }));
/* al invitado, cuando termina de llenar el búfer y suena, se le ajusta la posición una vez */
au.addEventListener('playing', () => { if (rm.role === 'guest' && lastMsg) setTimeout(() => { if (lastMsg) correct(lastMsg); }, 60); });

/* la cola es compartida: lo que un invitado agrega o quita se le pide al anfitrión; si cambia en el anfitrión, se publica */
useStore.subscribe((s, p) => {
  if (s.queue === p.queue || rm.applying) return;
  if (rm.role === 'host') { kick(); return; }
  if (rm.role !== 'guest') return;
  const a = p.queue, b = s.queue;
  const shareable = (list: Track[]): string[] => list.filter((t) => t.remote).map(hOf);
  if (b.some((t) => !t.remote) && !localWarned) { localWarned = true; toast('Las canciones importadas no se comparten en la sala'); }
  if (b.length >= a.length && a.every((t, i) => b[i] === t)) {
    const add = shareable(b.slice(a.length));
    if (add.length) send({ k: 'cmd', a: 'qadd', q: add });
  } else send({ k: 'cmd', a: 'qset', q: shareable(b) });
});

/* ---------- Enlaces de invitación ---------- */
const readInvite = (): string => {
  const m = /(?:^|[#&])room=([A-Za-z0-9-]+)/.exec(location.hash);
  return m ? normCode(m[1]) : '';
};
/* se lee ya, al cargar el módulo: al reproducir una canción la app cambia el # de la dirección */
let pendingInvite = readInvite();

function showInvite(code: string): void {
  if (!code || rm.role !== 'none' || code === curCode) return;
  ui({ invite: code, open: true });
}
export function initRoom(): void {
  if (pendingInvite) { showInvite(pendingInvite); pendingInvite = ''; }
}
addEventListener('hashchange', () => showInvite(readInvite()));
addEventListener('pagehide', (e) => {
  if (!e.persisted && rm.role !== 'none') send({ k: 'bye', host: rm.role === 'host' });
});
