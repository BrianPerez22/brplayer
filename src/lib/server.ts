import type { ServerSong, Track } from '../types';
import { ls } from './storage';
import { encUrl, parseDate, splitName } from './util';
import { readTags } from './tags';

/** dirección de la lista del servidor; se puede cambiar al compilar con VITE_API_URL */
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || '/api/canciones';

/** ganchos que registra la capa de biblioteca (evita dependencias circulares) */
export const hooks = { onTags: (_t: Track): void => {} };

/* ---------- Caché de etiquetas: [título, artista, álbum, pista] por canción ---------- */
type TagRow = [string, string, string, number];
const tagc: Record<string, TagRow> = ls.get('tagc', {});
let tagSv = 0;
const saveTagc = () => { clearTimeout(tagSv); tagSv = window.setTimeout(() => ls.set('tagc', tagc), 1500); };

export function noteTags(t: Track): void {
  if (!t.remote) return;
  tagc[t.sid || t.name] = [t.title, t.artist || '', t.album || '', t.trk || 0];
  try { hooks.onTags(t); } catch { /* ignorar */ }
  saveTagc();
}
export function moveTagKey(oldSid: string, newSid: string): void {
  if (!tagc[oldSid]) return;
  if (!tagc[newSid]) tagc[newSid] = tagc[oldSid];
  delete tagc[oldSid];
  ls.set('tagc', tagc);
}

/* ---------- Lista del servidor ---------- */
const pn = (v: unknown): number => parseInt(String(v == null ? '' : v).split('/')[0]) || 0;

export async function loadServer(): Promise<{ tracks: Track[]; stale: boolean }> {
  let j: ServerSong[];
  let stale = false;
  try {
    const r = await fetch(API_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const raw: unknown = await r.json();
    if (!Array.isArray(raw)) throw new Error('Formato inesperado');
    j = raw as ServerSong[];
    ls.set('srvlist', j);
  } catch (e) {
    const cached = ls.get<ServerSong[] | null>('srvlist', null);
    if (!cached) throw e;
    j = cached;
    stale = true;
  }
  const tracks = j
    .filter((s) => s && typeof s.nombre === 'string' && s.nombre && s.url)
    .map((s): Track => {
      /* `id` opcional del servidor: si existe, renombrar el archivo no pierde favoritos, playlists ni estadísticas */
      const sid = String(s.id != null && s.id !== '' ? s.id : s.nombre);
      const n = splitName(s.nombre);
      const o: Track = {
        id: 'srv:' + sid, sid, remote: true, name: s.nombre, url: encUrl(s.url),
        title: n.title, artist: n.artist, album: '', cover: null,
        date: parseDate(s.fecha || s.date || s.mtime || s.modificado || s.modified), size: s.size || s.tamano || 0,
      };
      /* etiquetas opcionales que puede mandar el servidor (evita leer 2 MB de cada archivo) */
      const st = s.titulo || s.title, sa = s.artista || s.artist, sl = s.album, sk = s.pista || s.track || s.trk, sc = s.caratula || s.cover;
      if (st) o.title = String(st);
      if (sa) o.artist = String(sa);
      if (sl) o.album = String(sl);
      if (sk) o.trk = pn(sk);
      if (sc && typeof sc === 'string') o.coverUrl = encUrl(sc);
      if (sa || sl) { o.tc = true; o.srvTags = true; }
      const c = !o.srvTags && tagc[sid];
      if (c) { o.title = c[0] || o.title; o.artist = c[1] || o.artist; o.album = c[2] || ''; o.trk = c[3] || 0; o.tc = true; }
      return o;
    });
  return { tracks, stale };
}

/** Lee etiquetas y carátula de una canción del servidor pidiendo solo los primeros 2 MB */
export function remoteTags(t: Track): Promise<void> {
  return t.tagsP || (t.tagsP = _remoteTags(t));
}

async function _remoteTags(t: Track): Promise<void> {
  if (t.tagsDone) return;
  t.tagsDone = true;
  const url = t.url as string;
  if (t.srvTags) {
    try {
      if (t.coverUrl && !t.cover) {
        const r = await fetch(t.coverUrl);
        if (r.ok) t.cover = await r.blob();
      }
    } catch { t.tagsDone = false; t.tagsP = null; }
    return;
  }
  try {
    let b: Blob | null = null;
    if (window.caches) {
      try {
        const m = await caches.match(url);
        if (m) { const fb = await m.blob(); if (!t.size) t.size = fb.size; b = fb.slice(0, 2097152); }
      } catch { /* sin caché */ }
    }
    if (!b) {
      const ctl = new AbortController();
      const r = await fetch(url, { headers: { Range: 'bytes=0-2097151' }, signal: ctl.signal });
      const cr = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
      if (cr) t.size = +cr[1];
      const lm = Date.parse(r.headers.get('last-modified') || '');
      if (lm && !t.date) t.date = lm;
      t.mime = t.mime || r.headers.get('content-type') || '';
      if (r.status !== 206) { ctl.abort(); return; }
      b = await r.blob();
    }
    const tg = await readTags(b, t.name);
    const fn = t.name.replace(/\.[^.]+$/, '');
    if (tg.title && tg.title !== fn) t.title = tg.title;
    if (tg.artist) t.artist = tg.artist;
    if (tg.album) t.album = tg.album;
    if (tg.cover) t.cover = tg.cover;
    if (tg.meta) t.meta = tg.meta;
    const m = tg.meta || {};
    t.trk = parseInt(String(m['Pista'] || m['TRACKNUMBER'] || '').split('/')[0]) || 0;
    t.tc = true;
    noteTags(t);
  } catch { t.tagsDone = false; t.tagsP = null; }
}

/** tamaño, fecha y tipo del archivo con una petición HEAD */
export async function remoteHead(t: Track): Promise<void> {
  if (t.headDone || (t.date && t.size)) return;
  t.headDone = true;
  try {
    const r = await fetch(t.url as string, { method: 'HEAD' });
    if (!r.ok) return;
    const l = +(r.headers.get('content-length') || 0);
    if (l && !t.size) t.size = l;
    const m = Date.parse(r.headers.get('last-modified') || '');
    if (m && !t.date) t.date = m;
    t.mime = t.mime || r.headers.get('content-type') || '';
  } catch { /* sin HEAD */ }
}
