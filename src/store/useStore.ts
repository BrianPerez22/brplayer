import { create } from 'zustand';
import type { Playlist, SheetItem, SheetState, Stat, Track, ViewId } from '../types';
import { ls } from '../lib/storage';
import { SORT_OPTIONS } from '../lib/constants';
import { getTheme, type Theme } from '../lib/theme';

export interface InfoState {
  rows: Array<[string, string]>;
  canDownload: boolean;
}

export interface State {
  tracks: Track[];
  /** índice de la canción actual en `tracks` (-1 si no hay) */
  cur: number;
  loading: boolean;
  srvErr: string;
  playing: boolean;
  shuffle: boolean;
  repeat: 0 | 1 | 2;
  queue: Track[];

  view: ViewId;
  vstack: ViewId[];
  homeTab: string;
  recFor: string;
  recNonce: number;
  query: string;
  scanning: boolean;

  sortKey: string;
  onlyOff: boolean;
  onlyFlac: boolean;
  offMode: boolean;
  online: boolean;

  favs: string[];
  pls: Playlist[];
  stats: Record<string, Stat>;

  selMode: boolean;
  sel: Set<Track>;

  toastMsg: { text: string; n: number } | null;
  sheet: SheetState | null;
  info: InfoState | null;
  eqOpen: boolean;
  fsOpen: boolean;
  menuOpen: boolean;
  homeMenuOpen: boolean;
  bmin: boolean;
  theme: Theme;

  /** carátula grande de la canción actual (data URL) */
  coverSrc: string;
  /** se incrementa cuando cambian datos mutables de las canciones (etiquetas, carátulas) para repintar */
  rev: number;
  /** velocidad de reproducción actual */
  speed: number;
}

const sortKey0 = ls.str('sort');

export const useStore = create<State>()(() => ({
  tracks: [],
  cur: -1,
  loading: true,
  srvErr: '',
  playing: false,
  shuffle: false,
  repeat: 0,
  queue: [],

  view: 'lib',
  vstack: [],
  homeTab: 'lib',
  recFor: '',
  recNonce: 0,
  query: '',
  scanning: false,

  sortKey: SORT_OPTIONS.some(([field]) => sortKey0 === `${field}-asc` || sortKey0 === `${field}-desc`) ? (sortKey0 as string) : 'name-asc',
  onlyOff: ls.str('onlyoff') === '1',
  onlyFlac: ls.str('onlyflac') === '1',
  offMode: ls.str('offm') !== '0',
  online: navigator.onLine !== false,

  favs: ls.get<string[]>('favs', []),
  pls: ls.get<Playlist[]>('pls', []),
  stats: ls.get<Record<string, Stat>>('stats', {}),

  selMode: false,
  sel: new Set<Track>(),

  toastMsg: null,
  sheet: null,
  info: null,
  eqOpen: false,
  fsOpen: false,
  menuOpen: false,
  homeMenuOpen: false,
  bmin: ls.str('bmin') === '1',
  theme: getTheme(),

  coverSrc: '',
  rev: 0,
  speed: 1,
}));

export const S = (): State => useStore.getState();
export const set = useStore.setState;

/* ---------- Persistencia: un solo lugar (mismas claves que la v1, así no se pierde nada al actualizar) ---------- */
useStore.subscribe((s, p) => {
  if (s.favs !== p.favs) ls.set('favs', s.favs);
  if (s.pls !== p.pls) ls.set('pls', s.pls);
  if (s.stats !== p.stats) ls.set('stats', s.stats);
  if (s.sortKey !== p.sortKey) ls.setStr('sort', s.sortKey);
  if (s.onlyOff !== p.onlyOff) ls.setStr('onlyoff', s.onlyOff ? '1' : '0');
  if (s.onlyFlac !== p.onlyFlac) ls.setStr('onlyflac', s.onlyFlac ? '1' : '0');
  if (s.offMode !== p.offMode) ls.setStr('offm', s.offMode ? '1' : '0');
  if (s.bmin !== p.bmin) ls.setStr('bmin', s.bmin ? '1' : '0');
  if (s.theme !== p.theme) ls.setStr('theme', s.theme);
});

/* ---------- Avisos, hojas y repintado ---------- */
let toastN = 0;
export const toast = (text: string): void => set({ toastMsg: { text, n: ++toastN } });
export const openSheet = (title: string, items: SheetItem[]): void => set({ sheet: { title, items } });
export const closeSheet = (): void => set({ sheet: null });

let touchRaf = 0;
/** avisa de que una canción cambió (carátula, etiquetas…); se agrupa por fotograma */
export function touch(): void {
  if (touchRaf) return;
  touchRaf = requestAnimationFrame(() => {
    touchRaf = 0;
    set((s) => ({ rev: s.rev + 1 }));
  });
}
