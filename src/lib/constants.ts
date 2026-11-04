export const SORT_OPTIONS: ReadonlyArray<readonly [string, string, 'asc' | 'desc']> = [
  ['name', 'Nombre', 'asc'],
  ['artist', 'Artista', 'asc'],
  ['album', 'Álbum', 'asc'],
  ['date', 'Fecha', 'desc'],
];

/** velocidades de reproducción (con el tono intacto) */
export const SPEEDS = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2] as const;

/** pestañas en el orden en que se recorren al deslizar */
export const TAB_ORDER = ['pls', 'lib', 'recent', 'queue'] as const;

export const AUDIO_CACHE = 'player-audio-v1';
export const AUDIO_CACHE_MAX = 40;
