import { au } from './element';
import { GIF } from '../lib/util';
import { artURL } from '../lib/art';
import { S, set } from '../store/useStore';

/** Actualiza la carátula grande y los metadatos del sistema (pantalla de bloqueo, auriculares) */
export async function updateNow(): Promise<void> {
  const t = S().tracks[S().cur];
  const a = t ? await artURL(t.cover) : null;
  if (S().tracks[S().cur] !== t) return;
  set({ coverSrc: a || GIF });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = t
      ? new MediaMetadata({
          title: t.title, artist: t.artist, album: t.album,
          artwork: a ? [{ src: a, sizes: '512x512', type: 'image/jpeg' }] : [],
        })
      : null;
  }
}

/** posición para la pantalla de bloqueo */
export function pos(): void {
  if ('mediaSession' in navigator && isFinite(au.duration) && au.duration > 0) {
    try {
      navigator.mediaSession.setPositionState({
        duration: au.duration, playbackRate: au.playbackRate || 1, position: Math.min(au.currentTime, au.duration),
      });
    } catch { /* no soportado */ }
  }
}
