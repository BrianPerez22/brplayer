import type { Track } from '../types';
import { AUDIO_CACHE, AUDIO_CACHE_MAX } from './constants';

/** canciones que se están guardando ahora mismo */
export const caching = new Set<Track>();

export async function cachedBlob(url: string): Promise<Blob | null> {
  if (!window.caches) return null;
  try {
    const m = await caches.match(url);
    return m ? await m.blob() : null;
  } catch { return null; }
}

/** Precarga: la canción siguiente y la actual se guardan en caché (máx. 40) para que el salto y el cambio sean inmediatos */
export async function cacheTrack(t: Track | null | undefined): Promise<void> {
  if (!t || !t.remote || t.cached || caching.has(t) || !window.caches) return;
  caching.add(t);
  try {
    const url = t.url as string;
    const c = await caches.open(AUDIO_CACHE);
    if (await c.match(url)) { t.cached = true; return; }
    const r = await fetch(url);
    if (r.status === 200) {
      await c.put(url, r);
      t.cached = true;
      const ks = await c.keys();
      if (ks.length > AUDIO_CACHE_MAX) await c.delete(ks[0]);
    }
  } catch { /* sin espacio o sin red */ } finally { caching.delete(t); }
}
