import type { Track } from '../types';
import { qadd } from './queue';
import { artURL } from './art';
import { remoteTags } from './server';
import { S, touch } from '../store/useStore';
import { updateNow } from '../audio/nowPlaying';

/** miniatura de 160 px (filas de la lista) */
export function ensureThumb(t: Track, front = false): void {
  if (t.th) return;
  t.th = true;
  qadd(async () => {
    if (t.remote) await remoteTags(t);
    if (t.cover && !t.thumb) t.thumb = (await artURL(t.cover, 160)) || undefined;
    touch();
    if (S().tracks[S().cur] === t) void updateNow();
  }, front);
}

/** versión grande (360 px) para los carruseles: se hace solo para las que se muestran ahí */
export function wantBig(t: Track): void {
  if (t.thumbL || t.thB) return;
  t.thB = true;
  qadd(async () => {
    if (t.remote) await remoteTags(t);
    if (t.cover && !t.thumbL) t.thumbL = (await artURL(t.cover, 360)) || undefined;
    touch();
  }, true);
}
