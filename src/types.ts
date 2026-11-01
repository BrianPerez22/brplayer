import type { IconName } from './components/Icon';

/** Una canción: del servidor (`remote`) o importada en el dispositivo (IndexedDB). Es mutable a propósito: guarda cachés de carátula y etiquetas. */
export interface Track {
  id: string | number;
  sid?: string;
  remote: boolean;
  name: string;
  url?: string;
  blob?: Blob;
  title: string;
  artist: string;
  album: string;
  cover: Blob | null;
  coverUrl?: string;
  thumb?: string;
  thumbL?: string;
  date: number;
  size: number;
  mime?: string;
  meta?: Record<string, string>;
  trk?: number;
  /** las etiquetas ya se conocen */
  tc?: boolean;
  /** las etiquetas llegaron desde el servidor */
  srvTags?: boolean;
  /* ---- caché de trabajo ---- */
  th?: boolean;
  thB?: boolean;
  tagsDone?: boolean;
  tagsP?: Promise<void> | null;
  headDone?: boolean;
  cached?: boolean;
  scn?: boolean;
  _hk?: string;
  _hs?: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: string[];
}

export interface Stat {
  n: number;
  ts: number;
}

export type ViewId = string; // 'lib' | 'recent' | 'queue' | 'pls' | 'pl:<id>' | 'ar:<nombre>' | 'al:<nombre>'
export type TabId = 'pls' | 'lib' | 'recent' | 'queue';

export type SheetItem = [label: string, icon: IconName, run: () => void];
export interface SheetState {
  title: string;
  items: SheetItem[];
}

export interface PlayCtx {
  id: string;
  keys: Set<string>;
  done: boolean;
}

/** Canción del servidor tal como la entrega /api/canciones (todos los campos salvo `nombre` y `url` son opcionales). */
export interface ServerSong {
  id?: string | number;
  nombre: string;
  url: string;
  fecha?: string | number;
  date?: string | number;
  mtime?: string | number;
  modificado?: string | number;
  modified?: string | number;
  size?: number;
  tamano?: number;
  titulo?: string;
  title?: string;
  artista?: string;
  artist?: string;
  album?: string;
  pista?: number | string;
  track?: number | string;
  trk?: number | string;
  caratula?: string;
  cover?: string;
}
