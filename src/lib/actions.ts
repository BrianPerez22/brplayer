/** Acciones del usuario sobre favoritos, playlists, selección múltiple, menús contextuales e información de canción. */
import type { Playlist, SheetItem, Track } from '../types';
import { au } from '../audio/element';
import { playList, setQueue, playPl } from '../audio/player';
import { S, set, toast, openSheet } from '../store/useStore';
import { favTracks, getPl, grpOrdered, isFav, isGrp } from '../store/selectors';
import { MIME, extOf, fmt, fsz, key, nCan, shuffled } from './util';
import { downloadMany, downloadTrack } from './download';
import { remoteHead, remoteTags } from './server';
import { deleteTrack, scanTags } from './library';
import { shareTrack, sharePlaylist } from './links';
import * as AE from '../audio/engine';

/* ---------- Favoritos ---------- */
export function toggleFav(t: Track | undefined): void {
  if (!t) return;
  const k = key(t), s = S();
  if (s.favs.includes(k)) { set({ favs: s.favs.filter((x) => x !== k) }); toast('Quitada de favoritos'); }
  else { set({ favs: [k, ...s.favs] }); toast('Agregada a favoritos'); }
}
export const toggleCurrentFav = (): void => {
  const t = S().tracks[S().cur];
  if (t) toggleFav(t); else toast('No hay canción seleccionada');
};

/* ---------- Playlists ---------- */
export function newPlaylist(): Playlist | null {
  const n = (prompt('Nombre de la playlist') || '').trim();
  if (!n) return null;
  const p: Playlist = { id: 'p' + Date.now(), name: n, items: [] };
  set((s) => ({ pls: [...s.pls, p] }));
  return p;
}

const updPl = (id: string, f: (p: Playlist) => Playlist): void =>
  set((s) => ({ pls: s.pls.map((p) => (p.id === id ? f(p) : p)) }));

export function addToPlaylist(p: Playlist, t: Track): void {
  if (p.items.includes(key(t))) { toast('Ya estaba en ' + p.name); return; }
  updPl(p.id, (x) => ({ ...x, items: [...x.items, key(t)] }));
  toast('Agregada a ' + p.name);
}

export function removeFromPlaylist(id: string, keys: Set<string>): void {
  updPl(id, (p) => ({ ...p, items: p.items.filter((k) => !keys.has(k)) }));
}

export function pickPlaylist(t: Track): void {
  openSheet('Agregar a playlist', [
    ...S().pls.map((p): SheetItem => [p.name, 'list', () => addToPlaylist(p, t)]),
    ['Nueva playlist…', 'plus', () => { const p = newPlaylist(); if (p) addToPlaylist(p, t); }],
  ]);
}

export function playlistMenu(id: string): void {
  const p = getPl(id);
  if (!p) return;
  openSheet(p.name, [
    ['Reproducir', 'next', () => playPl(id)],
    ['Compartir playlist', 'share', () => { void sharePlaylist(id); }],
    ['Renombrar', 'edit', () => {
      const n = (prompt('Nuevo nombre', p.name) || '').trim();
      if (n) updPl(id, (x) => ({ ...x, name: n }));
    }],
    ['Eliminar playlist', 'trash', () => {
      if (!confirm('¿Eliminar la playlist "' + p.name + '"?')) return;
      set((s) => ({ pls: s.pls.filter((x) => x.id !== id), view: s.view === 'pl:' + id ? 'pls' : s.view }));
    }],
  ]);
}

/* ---------- Navegación: artista / álbum ---------- */
export function openGroup(v: string): void {
  if (!v.slice(3).trim()) return;
  const s = S();
  const vstack = [...s.vstack];
  let homeTab = s.homeTab;
  if (s.view !== v) {
    vstack.push(s.view);
    if (vstack.length > 30) vstack.shift();
    if (!isGrp(s.view)) homeTab = s.view.startsWith('pl') ? 'pls' : s.view;
  }
  set({ sheet: null, info: null, fsOpen: false, view: v, vstack, homeTab, recFor: '', query: '' });
  scrollTo(0, 0);
  scanTags();
}

export function groupBack(): void {
  const s = S();
  const vstack = [...s.vstack];
  set({ view: vstack.pop() || 'lib', vstack, recFor: '' });
  scrollTo(0, 0);
}

export function goTab(view: string): void {
  set({ view, vstack: [], recFor: '' });
}

export function playGroup(shuffle: boolean): void {
  const v = S().view;
  const a = grpOrdered(v);
  if (!a.length) { toast('No hay canciones'); return; }
  playList(shuffle ? shuffled(a) : a, 0, v);
}

export function playFavs(shuffle: boolean): void {
  const a = favTracks();
  if (!a.length) { toast('No hay favoritas'); return; }
  playList(shuffle ? shuffled(a) : a, 0, 'fav');
}

/* ---------- Menú de tres puntos de una canción ---------- */
export async function rowMenu(i: number): Promise<void> {
  const t = S().tracks[i];
  if (!t) return;
  if (t.remote) await Promise.race([remoteTags(t), new Promise((r) => setTimeout(r, 1500))]); /* para conocer artista/álbum */
  const fv = isFav(t);
  const it: SheetItem[] = [
    ['Reproducir siguiente', 'next', () => { setQueue([t, ...S().queue]); toast('Se reproducirá a continuación'); }],
    ['Agregar a la cola', 'plus', () => { setQueue([...S().queue, t]); toast('Agregada a la cola'); }],
    [fv ? 'Quitar de favoritos' : 'Agregar a favoritos', fv ? 'heartf' : 'heart', () => toggleFav(t)],
    ['Agregar a una playlist', 'list', () => pickPlaylist(t)],
    ['Seleccionar varias', 'check', () => enterSel(t)],
  ];
  if (t.artist) it.push(['Ir al artista', 'user', () => openGroup('ar:' + t.artist)]);
  if (t.album) it.push(['Ir al álbum', 'disc', () => openGroup('al:' + t.album)]);
  const view = S().view;
  if (view.startsWith('pl:')) it.push(['Quitar de esta playlist', 'close', () => removeFromPlaylist(view.slice(3), new Set([key(t)]))]);
  it.push(['Compartir canción', 'share', () => { void shareTrack(t, false); }]);
  if (t.remote) it.push(['Descargar al dispositivo', 'dlf', () => { void downloadTrack(t); }]);
  if (!t.remote) it.push(['Eliminar importada', 'trash', () => { void deleteTrack(S().tracks.indexOf(t)); }]);
  openSheet(t.title, it);
}

/** menú "⋯" de la barra del reproductor: acciones de la canción que suena ahora */
export function nowMenu(): void {
  const s = S(), t = s.tracks[s.cur];
  if (!t) { toast('No hay canción seleccionada'); return; }
  const it: SheetItem[] = [
    ['Información de la canción', 'info', () => { void showInfo(); }],
    ['Compartir canción (desde este segundo)', 'share', () => { void shareTrack(t, true); }],
    ['Ecualizador y sonido 3D', 'eq', () => { AE.init(); set({ eqOpen: true }); }],
    ['Ver cola de reproducción', 'list', () => goTab('queue')],
    ['Agregar a una playlist', 'plus', () => pickPlaylist(t)],
  ];
  if (t.artist) it.push(['Ir al artista', 'user', () => openGroup('ar:' + t.artist)]);
  if (t.album) it.push(['Ir al álbum', 'disc', () => openGroup('al:' + t.album)]);
  if (t.remote) it.push(['Descargar al dispositivo', 'dlf', () => { void downloadTrack(t); }]);
  openSheet(t.title, it);
}

/* ---------- Selección múltiple ----------
   Entrar: mantener pulsada una canción, "Seleccionar" en su menú ⋯, o ☰ → Seleccionar canciones. Salir: ✕ o Esc. */
export const selList = (): Track[] => [...S().sel].filter((t) => S().tracks.includes(t));
export function enterSel(t?: Track): void {
  set({ selMode: true, sel: new Set(t ? [t] : []) });
}
export function exitSel(): void {
  set({ selMode: false, sel: new Set() });
}
export function toggleSel(t: Track): void {
  const sel = new Set(S().sel);
  if (!sel.delete(t)) sel.add(t);
  set({ sel });
}

/** canciones que se ven ahora en pantalla (sin las recomendaciones de una playlist) */
const visTracks = (): Track[] =>
  [...document.querySelectorAll<HTMLElement>('#list .t[data-i],#list .ci[data-i]')]
    .filter((el) => !el.querySelector('[data-ap]'))
    .map((el) => S().tracks[+(el.dataset.i as string)])
    .filter(Boolean);

export function selectAll(): void {
  const v = visTracks();
  if (!v.length) return;
  const sel = new Set(S().sel);
  const all = v.every((t) => sel.has(t));
  v.forEach((t) => (all ? sel.delete(t) : sel.add(t)));
  set({ sel });
}

function selAddPl(p: Playlist, a: Track[]): void {
  let n = 0;
  const items = [...p.items];
  a.forEach((t) => { if (!items.includes(key(t))) { items.push(key(t)); n++; } });
  updPl(p.id, (x) => ({ ...x, items }));
  toast(n ? nCan(n) + (n === 1 ? ' agregada' : ' agregadas') + ' a ' + p.name : 'Ya estaban en ' + p.name);
  exitSel();
}

export function selActions(): void {
  const a = selList();
  if (!a.length) { toast('Elige al menos una canción'); return; }
  const s = S();
  const rem = a.filter((t) => t.remote), loc = a.filter((t) => !t.remote);
  const nf = a.filter((t) => !isFav(t, s)), yf = a.filter((t) => isFav(t, s));
  const ks = new Set(a.map(key));
  const it: SheetItem[] = [
    ['Reproducir ahora', 'play', () => { exitSel(); playList(a, 0, 'sel'); }],
    ['Reproducir a continuación', 'next', () => { setQueue([...a, ...S().queue]); toast(nCan(a.length) + ' a continuación'); exitSel(); }],
    ['Agregar a la cola', 'plus', () => { setQueue([...S().queue, ...a]); toast(nCan(a.length) + (a.length === 1 ? ' agregada' : ' agregadas') + ' a la cola'); exitSel(); }],
  ];
  if (nf.length) {
    it.push(['Guardar en favoritas' + (nf.length < a.length ? ` (${nf.length})` : ''), 'heart', () => {
      set((st) => ({ favs: [...nf.map(key), ...st.favs] }));
      exitSel();
      toast(nCan(nf.length) + (nf.length === 1 ? ' guardada' : ' guardadas') + ' en favoritas');
    }]);
  }
  if (yf.length) {
    it.push(['Quitar de favoritas' + (yf.length < a.length ? ` (${yf.length})` : ''), 'heartf', () => {
      const rm = new Set(yf.map(key));
      set((st) => ({ favs: st.favs.filter((k) => !rm.has(k)) }));
      exitSel();
      toast(nCan(yf.length) + (yf.length === 1 ? ' quitada' : ' quitadas') + ' de favoritas');
    }]);
  }
  it.push(['Agregar a una playlist', 'list', () => openSheet('Agregar a playlist', [
    ...S().pls.map((p): SheetItem => [p.name, 'list', () => selAddPl(p, a)]),
    ['Nueva playlist…', 'plus', () => { const p = newPlaylist(); if (p) selAddPl(p, a); }],
  ])]);
  const cp = s.view.startsWith('pl:') ? s.pls.find((p) => p.id === s.view.slice(3)) : undefined;
  if (cp && cp.items.some((k) => ks.has(k))) {
    it.push(['Quitar de esta playlist', 'close', () => { removeFromPlaylist(cp.id, ks); exitSel(); toast('Quitadas de ' + cp.name); }]);
  }
  if (rem.length) it.push([rem.length > 1 ? `Descargar ${rem.length} canciones (ZIP)` : 'Descargar al dispositivo', 'dlf', () => { exitSel(); void downloadMany(rem); }]);
  if (loc.length) {
    it.push([`Eliminar importadas (${loc.length})`, 'trash', async () => {
      if (!confirm(`¿Eliminar ${nCan(loc.length)} importada${loc.length === 1 ? '' : 's'} de este dispositivo?`)) return;
      exitSel();
      for (const t of loc) { const i = S().tracks.indexOf(t); if (i >= 0) await deleteTrack(i); }
      toast('Importadas eliminadas');
    }]);
  }
  openSheet(a.length === 1 ? '1 canción seleccionada' : a.length + ' canciones seleccionadas', it);
}

/* ---------- Ficha de información ---------- */
export async function showInfo(): Promise<void> {
  const s = S();
  const t = s.tracks[s.cur];
  if (!t) { toast('No hay canción seleccionada'); return; }
  if (t.remote) { await remoteHead(t); await remoteTags(t); }
  const ext = extOf(t.name), d = au.duration;
  const rows: Array<[string, string | number | undefined | null]> = [
    ['Título', t.title], ['Artista', t.artist], ['Álbum', t.album], ['Archivo', t.name], ['Formato', ext.toUpperCase()],
    ['Tipo MIME', t.mime || MIME[ext]], ['Tamaño', t.size ? fsz(t.size) : ''],
    ['Duración', isFinite(d) && d ? fmt(d) : ''],
    ['Bitrate aprox.', t.size && d ? Math.round((t.size * 8) / d / 1000) + ' kbps' : ''],
    ['Fecha del archivo', t.date ? new Date(t.date).toLocaleString('es') : ''],
    ['Origen', t.remote ? 'Biblioteca' : 'Importada en este dispositivo'],
    ['Dirección', t.remote ? t.url : ''],
    ['Carátula', t.cover ? (t.cover.type || 'imagen') + ' · ' + fsz(t.cover.size) : 'Sin carátula'],
    ...Object.entries(t.meta || {}),
  ];
  set({
    info: {
      rows: rows.filter((r): r is [string, string | number] => r[1] !== '' && r[1] != null).map(([k, v]) => [k, String(v)]),
      canDownload: t.remote,
    },
  });
}
