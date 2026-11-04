import type { Track } from '../types';

export const MIME: Record<string, string> = {
  mp3: 'audio/mpeg', flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  ogg: 'audio/ogg', opus: 'audio/ogg; codecs=opus', aif: 'audio/aiff', aiff: 'audio/aiff', caf: 'audio/x-caf',
};
export const ACCEPT = 'audio/*,.mp3,.flac,.m4a,.aac,.wav,.ogg,.opus,.aif,.aiff,.alac,.caf';

export const GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export const fmt = (s: number): string => {
  if (!isFinite(s)) return '0:00';
  s = Math.floor(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/** texto sin acentos y en minúsculas, para buscar */
export const nz = (s: unknown): string =>
  String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** texto normalizado de una canción (se recalcula solo si cambian título, artista o álbum) */
export const hay = (t: Track): string => {
  const k = `${t.title}\u0001${t.artist}\u0001${t.album}\u0001${t.name}`;
  if (t._hk !== k) {
    t._hk = k;
    t._hs = nz(`${t.title} ${t.artist} ${t.album} ${t.name}`);
  }
  return t._hs as string;
};
export const matches = (t: Track, q: string): boolean => !q || hay(t).includes(q);

export const key = (t: Track): string => String(t.id);
export const nk = (x: unknown): string => String(x || '').trim().toLowerCase();
export const nCan = (n: number): string => n + (n === 1 ? ' canción' : ' canciones');
export const cmp = (a: unknown, b: unknown): number =>
  String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
export const fsz = (b: number): string =>
  (b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB') + ' (' + b.toLocaleString('es') + ' bytes)';

export function shuffled<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const trackNo = (t: Track): number =>
  t.trk || parseInt(String((t.meta && (t.meta['Pista'] || t.meta['TRACKNUMBER'])) || '').split('/')[0]) || 0;

/** "Artista - Título.ext" → artista y título */
export function splitName(n: string): { artist: string; title: string } {
  const b = n.replace(/\.[^.]+$/, '');
  const k = b.indexOf(' - ');
  return k > 0 ? { artist: b.slice(0, k).trim(), title: b.slice(k + 3).trim() } : { artist: '', title: b };
}

/** fecha de varios formatos → milisegundos */
export const parseDate = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const d = Date.parse(String(v));
  return isNaN(d) ? 0 : d;
};

/** hash de 64 bits en 11 caracteres (base64url): identifica canciones en enlaces cortos */
export function h64(s: string): string {
  let a = 0xdeadbeef, b = 0x41c6ce57;
  s = String(s);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  const u = new Uint8Array(8), v = new DataView(u.buffer);
  v.setUint32(0, a >>> 0);
  v.setUint32(4, b >>> 0);
  return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Codifica la ruta de una URL sin duplicar lo ya codificado: espacios, #, ?, tildes… ya no rompen la reproducción.
 * Una cadena de consulta real (?clave=valor) se respeta.
 */
export function encUrl(u: string): string {
  u = String(u);
  const m = /^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)?([\s\S]*)$/i.exec(u) as RegExpExecArray;
  const origin = m[1] || '';
  let rest = m[2], query = '';
  const qi = rest.search(/\?[\w.~%-]+=/);
  if (qi >= 0) { query = rest.slice(qi); rest = rest.slice(0, qi); }
  rest = rest
    .split('/')
    .map((s) =>
      s.replace(/%(?![0-9a-f]{2})|[^A-Za-z0-9\-._~!$&'()*+,;=:@%]/gi, (c) => {
        try { return encodeURIComponent(c); } catch { return ''; }
      }),
    )
    .join('/');
  return origin + rest + query;
}

export const extOf = (name: string): string => (name.split('.').pop() || '').toLowerCase();

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
export const standalone = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
