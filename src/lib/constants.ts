export const SORT_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['name-asc', 'Nombre (A–Z)'], ['name-desc', 'Nombre (Z–A)'],
  ['artist-asc', 'Artista (A–Z)'], ['artist-desc', 'Artista (Z–A)'],
  ['album-asc', 'Álbum (A–Z)'], ['album-desc', 'Álbum (Z–A)'],
  ['date-desc', 'Fecha (más reciente)'], ['date-asc', 'Fecha (más antigua)'],
];

/** velocidades de reproducción (con el tono intacto) */
export const SPEEDS = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2] as const;

/** pestañas en el orden en que se recorren al deslizar */
export const TAB_ORDER = ['pls', 'lib', 'recent', 'queue'] as const;

export const AUDIO_CACHE = 'player-audio-v1';
export const AUDIO_CACHE_MAX = 40;
