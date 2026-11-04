/**
 * Biblioteca: orden, lectura de etiquetas en segundo plano, actualización desde el servidor,
 * reconexión de archivos renombrados, importación de archivos locales, modo sin conexión y arranque.
 */
import type { Track } from '../types';
import { au } from '../audio/element';
import { updateNow } from '../audio/nowPlaying';
import { forgetTrack, clearHistory, load, pick, setRestore, shufInsert } from '../audio/player';
import { S, set, toast, touch } from '../store/useStore';
import { isOff, okT } from '../store/selectors';
import { ls, localDb } from './storage';
import { ACCEPT, MIME, cmp, extOf, h64, trackNo } from './util';
import { qadd } from './queue';
import { artURL } from './art';
import { readTags } from './tags';
import { hooks, loadServer, moveTagKey, remoteHead, remoteTags } from './server';
import { applyHash } from './links';

/* ---------- Orden ---------- */
export function sortTracks(): void {
  const s = S();
  const c = s.tracks[s.cur];
  const [k, d] = s.sortKey.split('-');
  const m = d === 'desc' ? -1 : 1;
  const arr = [...s.tracks].sort((a, b) =>
    m * (k === 'date' ? (a.date || 0) - (b.date || 0)
      : k === 'artist' ? cmp(a.artist || '~', b.artist || '~') || cmp(a.title, b.title)
      : k === 'album' ? cmp(a.album || '~', b.album || '~') || trackNo(a) - trackNo(b) || cmp(a.title, b.title)
      : cmp(a.title, b.title)));
  set({ tracks: arr, cur: c ? arr.indexOf(c) : -1 });
}

export async function applySort(): Promise<void> {
  const { sortKey, tracks } = S();
  if (/^(album|artist)/.test(sortKey)) scanTags();
  if (sortKey.startsWith('date')) {
    const rem = tracks.filter((t) => t.remote && !t.date);
    if (rem.length) {
      toast('Obteniendo fechas…');
      await Promise.all(rem.map((t) => new Promise<void>((r) => qadd(() => remoteHead(t).then(r), true))));
    }
  }
  sortTracks();
}

export async function chooseSort(key: string, label: string): Promise<void> {
  set({ sortKey: key, menuOpen: false });
  await applySort();
  toast('Orden: ' + label);
}

export function setOnlyOff(v: boolean): void {
  set({ onlyOff: v });
  toast(v ? 'Mostrando solo canciones offline' : 'Mostrando todas las canciones');
}

export function setOnlyFlac(v: boolean): void {
  set({ onlyFlac: v, ...(v ? { sortKey: 'album-asc' } : {}) });
  if (v) { scanTags(); sortTracks(); }
  toast(v ? 'Mostrando FLAC por álbum y número de pista' : 'Mostrando todos los formatos');
}

/* ---------- Leer artista/álbum/pista de todas las canciones del servidor que aún no se conocen (una sola vez; queda guardado) ---------- */
let scanDone = 0, scanTot = 0, scanTm = 0;
function afterScan(): void {
  if (/^(album|artist)/.test(S().sortKey)) sortTracks();
  touch();
}
export function scanTags(): void {
  if (S().scanning) return;
  const todo = S().tracks.filter((t) => t.remote && !t.tc && !t.scn);
  if (!todo.length) return;
  set({ scanning: true });
  scanDone = 0;
  scanTot = todo.length;
  toast('Leyendo datos de ' + todo.length + ' canciones…');
  todo.forEach((t) => {
    t.scn = true;
    qadd(async () => {
      try {
        await remoteTags(t);
        if (t.cover && !t.thumb) t.thumb = (await artURL(t.cover, 160)) || undefined;
        t.th = true;
        /* se suelta la carátula grande para no llenar la memoria; se vuelve a leer si la canción suena */
        if (S().tracks[S().cur] !== t && t.cover && t.thumb) { t.cover = null; t.tagsDone = false; t.tagsP = null; }
      } finally {
        touch();
        scanDone++;
        if (scanDone >= scanTot) {
          set({ scanning: false });
          clearTimeout(scanTm);
          scanTm = 0;
          toast('Datos de canciones listos');
          afterScan();
        } else if (!scanTm) scanTm = window.setTimeout(() => { scanTm = 0; afterScan(); }, 1500);
      }
    });
  });
}

/* ---------- Reconectar archivos renombrados en el servidor ---------- */
let km: Record<string, [string, number]> = ls.get('km', {});
const KN = new Set<string>(ls.get<string[]>('ksn', []));
let kmTm = 0;
const saveKm = () => { clearTimeout(kmTm); kmTm = window.setTimeout(() => ls.set('km', km), 1500); };
const isUsed = (k: string): boolean => {
  const s = S();
  return s.favs.includes(k) || !!s.stats[k] || s.pls.some((p) => p.items.includes(k));
};

/** km guarda nombre y tamaño solo de las canciones con datos del usuario (favoritas, playlists, estadísticas) */
function kmPut(t: Track): void {
  if (!t || !t.remote || !(t.size > 0) || !isUsed(String(t.id))) return;
  const id = String(t.id), c = km[id];
  if (c && c[0] === t.name && c[1] === t.size) return;
  km[id] = [t.name, t.size];
  saveKm();
}
hooks.onTags = kmPut;

/** cambia la clave de una canción en favoritos, playlists, estadísticas y etiquetas */
function remapKey(old: string, nw: string): void {
  const rm = (a: string[]) => [...new Set(a.map((k) => (k === old ? nw : k)))];
  set((s) => {
    const stats = { ...s.stats };
    if (stats[old]) {
      const o = stats[old], e = stats[nw];
      stats[nw] = e ? { n: e.n + o.n, ts: Math.max(e.ts, o.ts) } : o;
      delete stats[old];
    }
    return { favs: rm(s.favs), pls: s.pls.map((p) => ({ ...p, items: rm(p.items) })), stats };
  });
  moveTagKey(old.slice(4), nw.slice(4));
  if (ls.str('last') === old) ls.setStr('last', nw);
  km[nw] = km[old];
  delete km[old];
  saveKm();
}

/** Si un archivo se renombra en el servidor (y no hay `id`), se reconoce por su tamaño exacto, siempre que sea único */
async function relink(gone: string[], fresh: Track[]): Promise<void> {
  const need = fresh.filter((t) => !(t.size > 0)).slice(0, 300);
  if (need.length) await Promise.all(need.map((t) => new Promise<void>((r) => qadd(() => remoteHead(t).then(r, r), true))));
  const count = <T,>(a: T[], f: (x: T) => number) => {
    const m = new Map<number, number>();
    a.forEach((x) => { const k = f(x); m.set(k, (m.get(k) || 0) + 1); });
    return m;
  };
  const sized = fresh.filter((t) => t.size > 0);
  const gs = count(gone, (k) => km[k][1]), fs = count(sized, (t) => t.size);
  let n = 0;
  for (const k of gone) {
    const sz = km[k][1], c = sized.filter((t) => t.size === sz);
    if (gs.get(sz) === 1 && fs.get(sz) === 1 && c.length === 1) { remapKey(k, String(c[0].id)); n++; }
  }
  if (n) toast(n === 1 ? 'Se reconectó 1 canción renombrada en el servidor' : 'Se reconectaron ' + n + ' canciones renombradas en el servidor');
}

/** Se ejecuta tras cargar la lista del servidor (al abrir y al actualizar) */
async function afterServer(list: Track[]): Promise<void> {
  if (!list || !list.length) return;
  try {
    const fresh = list.filter((t) => !KN.has(h64(t.sid as string)));
    list.forEach((t) => KN.add(h64(t.sid as string)));
    ls.set('ksn', [...KN]);
    const have = new Set(list.map((t) => String(t.id)));
    list.forEach(kmPut);
    const s = S();
    const used = new Set([...s.favs, ...Object.keys(s.stats), ...s.pls.flatMap((p) => p.items)].map(String).filter((k) => k.startsWith('srv:')));
    const gone = [...used].filter((k) => !have.has(k) && km[k]);
    if (gone.length && fresh.length) await relink(gone, fresh);
    /* se anota el tamaño de las canciones con datos del usuario para poder reconectarlas si se renombran */
    list.forEach((t) => { if (used.has(String(t.id)) && !t.size && !(km[String(t.id)] && km[String(t.id)][1])) qadd(() => remoteHead(t).then(() => kmPut(t))); });
  } catch { /* la reconexión es opcional */ }
}

/* ---------- Actualizar desde el servidor ---------- */
/** Mezcla la lista nueva con la actual sin perder carátulas ni la canción que suena */
function mergeServer(list: Track[]): { added: number; removed: number } {
  const s = S();
  const old = new Map(s.tracks.filter((t) => t.remote).map((t) => [String(t.id), t]));
  const c = s.tracks[s.cur];
  let added = 0;
  const out = list.map((n) => {
    const o = old.get(String(n.id));
    if (!o) { added++; return n; }
    o.name = n.name; o.url = n.url;
    if (n.date) o.date = n.date;
    if (n.size) o.size = n.size;
    if (n.srvTags) { o.title = n.title; o.artist = n.artist; o.album = n.album; o.trk = n.trk; o.tc = true; o.srvTags = true; o.coverUrl = n.coverUrl; }
    return o;
  });
  if (c && c.remote && !out.includes(c)) out.push(c);
  const removed = [...old.values()].filter((t) => !out.includes(t)).length;
  set({ tracks: out.concat(s.tracks.filter((t) => !t.remote)) });
  return { added, removed };
}

let refBusy = false;
let lastRef = Date.now();
export async function refreshLib(silent = false): Promise<void> {
  if (refBusy) return;
  refBusy = true;
  try {
    if (!silent) toast('Actualizando biblioteca…');
    const { tracks: list, stale } = await loadServer();
    if (stale) { if (!silent) toast('Sin conexión con el servidor'); return; }
    set({ srvErr: '', loading: false });
    const r = mergeServer(list);
    await applySort();
    void afterServer(list);
    const pl = (n: number, s: string, p: string) => n + ' ' + (n === 1 ? s : p);
    if (r.added || r.removed) {
      if (silent && !r.added) return;
      toast([r.added && pl(r.added, 'canción nueva', 'canciones nuevas'), !silent && r.removed && pl(r.removed, 'quitada', 'quitadas')].filter(Boolean).join(' · '));
    } else if (!silent) toast('La biblioteca ya está al día');
  } catch (e) {
    set({ srvErr: (e as Error)?.message || 'error' });
    if (!silent) toast('No se pudo actualizar la biblioteca');
  } finally { refBusy = false; lastRef = Date.now(); }
}

/* ---------- Canciones importadas en el dispositivo ---------- */
interface LocalRec {
  id: number; name: string; size: number; blob: Blob; title: string; artist?: string; album?: string;
  cover?: Blob | null; meta?: Record<string, string>; date?: number; mime?: string;
}
const fromRec = (r: LocalRec): Track => ({
  ...r, remote: false, artist: r.artist || '', album: r.album || '', cover: r.cover || null, date: r.date || 0, size: r.size || 0,
});

export async function addFiles(files: File[]): Promise<void> {
  let n = 0;
  for (const f of files) {
    if (S().tracks.some((t) => t.name === f.name && t.size === f.size)) continue;
    toast(`Importando ${++n}/${files.length}…`);
    const blob = new Blob([f], { type: MIME[extOf(f.name)] || f.type || 'audio/mpeg' });
    const tg = await readTags(f, f.name);
    const rec = { name: f.name, size: f.size, blob, title: tg.title, artist: tg.artist, album: tg.album, cover: tg.cover, meta: tg.meta, date: f.lastModified, mime: blob.type };
    let id: string | number;
    try { id = (await localDb.add(rec)) as number; } catch { id = Date.now() + Math.random(); toast('No se pudo guardar; solo en esta sesión'); }
    const t = fromRec({ ...rec, id } as LocalRec);
    set((s) => ({ tracks: [...s.tracks, t] }));
    shufInsert(t);
    sortTracks();
  }
  toast(n ? 'Listo: ' + n + ' canción(es)' : 'Ya estaban añadidas');
  if (S().cur < 0 && S().tracks.length) void load(0, false);
}

export async function deleteTrack(i: number): Promise<void> {
  const s = S();
  const t = s.tracks[i];
  if (!t) return;
  try { await localDb.del(t.id as number); } catch { /* ya no estaba */ }
  const tracks = s.tracks.filter((_, k) => k !== i);
  forgetTrack(t);
  const was = s.cur;
  set({ tracks, queue: s.queue.filter((x) => x !== t), cur: i === was ? -1 : i < was ? was - 1 : was });
  if (i === was) {
    au.pause();
    au.removeAttribute('src');
    if (tracks.length) void load(Math.min(i, tracks.length - 1), false); else void updateNow();
  }
}

export async function clearImported(): Promise<void> {
  const s = S();
  if (!s.tracks.some((t) => !t.remote)) { toast('No hay canciones importadas'); return; }
  if (!confirm('¿Borrar las canciones importadas en este dispositivo?')) return;
  try { await localDb.clear(); } catch { /* ya vacío */ }
  const c = s.tracks[s.cur];
  const tracks = s.tracks.filter((t) => t.remote);
  clearHistory();
  const wasLocal = !!c && !c.remote;
  set({ tracks, queue: s.queue.filter((t) => t.remote), cur: wasLocal ? -1 : c ? tracks.indexOf(c) : -1 });
  if (wasLocal) { au.pause(); au.removeAttribute('src'); void updateNow(); }
}

/* ---------- Modo sin conexión: sin internet, solo suenan las canciones locales ---------- */
export function offApply(): void {
  const s = S();
  if (!s.offMode || !isOff(s)) return;
  const t = s.tracks[s.cur];
  /* si suena una del servidor en streaming (no guardada en el dispositivo), se pasa a una local */
  if (t && t.remote && !au.src.startsWith('blob:')) {
    const was = !au.paused;
    au.pause();
    const i = pick(false);
    if (i >= 0) { void load(i, was); toast('Sin conexión: se reproducen solo canciones locales'); }
    else toast('Sin conexión: no hay canciones locales para reproducir');
  } else toast('Sin conexión: solo canciones locales');
}

export function toggleOffMode(): void {
  const v = !S().offMode;
  set({ offMode: v, homeMenuOpen: false });
  if (v && isOff()) offApply();
  else toast(v ? 'Automático: sin internet solo sonarán las canciones locales; con internet vuelve todo' : 'Modo sin conexión automático desactivado');
}

/* ---------- Arranque ---------- */
let booted = false;
export async function bootstrap(): Promise<void> {
  if (booted) return;
  booted = true;
  ls.del('offline'); /* clave antigua; el modo actual usa "offm" */

  addEventListener('offline', () => { set({ online: false }); offApply(); });
  addEventListener('online', () => {
    set({ online: true });
    if (S().offMode) { toast('Conexión restablecida'); void refreshLib(true); }
  });
  /* al volver a la app tras un rato, se buscan canciones nuevas en silencio */
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastRef > 600000) void refreshLib(true); });
  addEventListener('hashchange', () => { void applyHash(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  let local: Track[] = [], srv: Track[] = [], stale = false;
  try {
    local = ((await localDb.all<LocalRec>()) || []).map(fromRec);
    if (navigator.storage && navigator.storage.persist) void navigator.storage.persist();
  } catch { /* sin IndexedDB */ }
  try {
    const r = await loadServer();
    srv = r.tracks;
    stale = r.stale;
    set({ srvErr: '' });
  } catch (e) { set({ srvErr: (e as Error)?.message || 'error' }); }
  set({ tracks: srv.concat(local), loading: false });
  sortTracks();
  void applySort(); /* las fechas que falten se piden en segundo plano; no bloquean el arranque */
  if (stale) toast('Sin conexión con el servidor: se muestra la lista guardada');
  void afterServer(srv);
  if (await applyHash()) return;
  const s = S();
  if (s.tracks.length) {
    const id = ls.str('last');
    let i = s.tracks.findIndex((t) => String(t.id) === id);
    if (i < 0) i = 0;
    if (!okT(s.tracks[i])) i = s.tracks.findIndex((t) => okT(t));
    if (i < 0) { void updateNow(); return; }
    setRestore(+(ls.str('pos') || 0) || 0);
    await load(i, false, false);
  } else void updateNow();
}

/** abre el selector de archivos del sistema (se crea en el momento: así funciona dentro del gesto del usuario en Safari) */
export function pickFiles(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = ACCEPT;
  input.onchange = () => { const f = [...(input.files || [])]; input.value = ''; if (f.length) void addFiles(f); };
  input.click();
}
