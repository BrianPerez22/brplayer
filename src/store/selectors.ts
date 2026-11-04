import type { Playlist, Track, ViewId } from '../types';
import { S, type State } from './useStore';
import { extOf, key, matches, nk, trackNo } from '../lib/util';

export const isGrp = (v: ViewId): boolean => /^(ar|al):/.test(v);
export const tabName = (view: ViewId, homeTab: string): string => (isGrp(view) ? homeTab : view.startsWith('pl') ? 'pls' : view);

export const isOff = (s: State = S()): boolean => s.offMode && !s.online;
/** ¿se puede reproducir ahora? (sin internet y con modo sin conexión, solo las locales) */
export const okT = (t: Track | null | undefined, s: State = S()): t is Track => !!t && (!t.remote || !isOff(s));

/** canciones de un artista ('ar:Nombre') o álbum ('al:Nombre'); el álbum va en orden de pista */
export function grpOrdered(v: ViewId, tracks: Track[] = S().tracks): Track[] {
  const n = nk(v.slice(3)), isA = v.startsWith('ar:');
  const a = tracks.filter((t) => nk(isA ? t.artist : t.album) === n);
  if (!isA && a.some(trackNo)) a.sort((x, y) => (trackNo(x) || 9999) - (trackNo(y) || 9999));
  return a;
}

/** listas "virtuales" para reproducir en contexto: favoritas, artista y álbum */
export function getPl(id: string, s: State = S()): Pick<Playlist, 'id' | 'name' | 'items'> | undefined {
  if (id === 'fav') return { id, name: 'Favoritas', items: s.favs };
  if (isGrp(id)) return { id, name: id.slice(3), items: grpOrdered(id, s.tracks).map(key) };
  return s.pls.find((p) => p.id === id);
}

export function plTracks(id: string, s: State = S()): Track[] {
  const p = getPl(id, s);
  if (!p) return [];
  const m = new Map(s.tracks.map((t) => [key(t), t]));
  return p.items.map((k) => m.get(String(k))).filter((t): t is Track => !!t);
}

export function favTracks(s: State = S()): Track[] {
  const m = new Map(s.tracks.map((t) => [key(t), t]));
  return s.favs.map((k) => m.get(k)).filter((t): t is Track => !!t);
}

export const isFav = (t: Track, s: State = S()): boolean => s.favs.includes(key(t));

export interface Entry { t: Track; i: number; k?: number }

/** filas que se muestran en la vista actual (biblioteca, cola o playlist) */
export function listFor(s: State): Entry[] {
  const q = s.query;
  let a: Entry[];
  if (s.view === 'queue') a = s.queue.map((t, k) => ({ t, i: s.tracks.indexOf(t), k }));
  else if (s.view.startsWith('pl:')) a = plTracks(s.view.slice(3), s).map((t) => ({ t, i: s.tracks.indexOf(t) }));
  else a = s.tracks.map((t, i) => ({ t, i }));
  return a.filter(({ t, i }) => i >= 0 && matches(t, q) && (!s.onlyOff || !t.remote) && (!s.onlyFlac || extOf(t.name) === 'flac'));
}

/** contexto de reproducción según la vista: tocar una canción sigue la lista donde está */
export function ctxFor(s: State = S()): { id: string; arr: Track[] } | null {
  if (s.view.startsWith('pl:')) return { id: s.view.slice(3), arr: plTracks(s.view.slice(3), s) };
  if (s.view === 'pls') return { id: 'fav', arr: favTracks(s) };
  if (isGrp(s.view)) return { id: s.view, arr: grpOrdered(s.view, s.tracks) };
  return null;
}
