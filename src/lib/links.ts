import type { Track } from '../types';
import { au } from '../audio/element';
import { load, setRestore } from '../audio/player';
import { S, set, toast } from '../store/useStore';
import { getPl } from '../store/selectors';
import { h64, key } from './util';
import { ls } from './storage';

/** Enlaces para compartir: #c=<canción>&t=<segundo>, o #p=<nombre>&s=<11 caracteres por canción> para una playlist. */
const base = (): string => location.href.split('#')[0];

export async function copy(s: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(s); return true; } catch {
    const a = document.createElement('textarea');
    a.value = s;
    a.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(a);
    a.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* sin portapapeles */ }
    a.remove();
    return ok;
  }
}

export async function shareTrack(t: Track, withTime: boolean): Promise<void> {
  const p = new URLSearchParams({ c: t.sid || t.name });
  const s = S();
  if (withTime && s.tracks[s.cur] === t && au.currentTime > 1) p.set('t', String(Math.floor(au.currentTime)));
  toast((await copy(base() + '#' + p)) ? 'Enlace copiado: ' + t.title : 'No se pudo copiar el enlace');
}

export async function sharePlaylist(id: string): Promise<void> {
  const p = getPl(id);
  if (!p) return;
  const sids = p.items.filter((k) => String(k).startsWith('srv:')).map((k) => k.slice(4));
  if (!sids.length) { toast('Esta lista solo tiene canciones importadas y no se puede compartir'); return; }
  const ok = await copy(base() + '#' + new URLSearchParams({ p: p.name, s: sids.map(h64).join('') }));
  toast(ok ? (sids.length < p.items.length ? 'Enlace copiado (sin las canciones importadas)' : 'Enlace de la playlist copiado') : 'No se pudo copiar el enlace');
}

/** Aplica el # de la dirección: importa una playlist y/o abre una canción. Devuelve true si empezó a cargar una canción. */
export async function applyHash(): Promise<boolean> {
  const H = new URLSearchParams(location.hash.slice(1));
  const pl = H.get('pl'), pn = H.get('p'), ps = H.get('s');
  const mkPl = (name: string, items: string[], total: number) => {
    if (!items.length) { toast('Ninguna canción de esa playlist está en esta biblioteca'); return; }
    const pls = S().pls;
    let p = pls.find((x) => x.name === name && x.items.join('|') === items.join('|'));
    if (!p) {
      p = { id: 'p' + Date.now(), name, items };
      set({ pls: [...pls, p] });
      toast('Playlist importada: ' + name + (items.length < total ? ` (${items.length} de ${total})` : ''));
    }
    set({ view: 'pl:' + p.id, vstack: [], recFor: '' });
  };
  if (pn != null && ps) {
    try { /* formato corto */
      const m = new Map(S().tracks.filter((t) => t.remote).map((t) => [h64(t.sid as string), t.sid as string]));
      const items: string[] = [], tot = Math.floor(ps.length / 11);
      for (let i = 0; i + 11 <= ps.length; i += 11) {
        const sid = m.get(ps.slice(i, i + 11));
        if (sid != null) items.push('srv:' + sid);
      }
      mkPl(pn, items, tot);
    } catch { /* enlace dañado */ }
  } else if (pl) {
    try { /* formato antiguo (nombres completos): se sigue aceptando */
      const o = JSON.parse(pl) as { n: string; s: string[] };
      mkPl(o.n, o.s.map((n) => 'srv:' + n), o.s.length);
    } catch { /* enlace dañado */ }
  }
  const c = H.get('c');
  if (!c) return false;
  const { tracks } = S();
  const k = tracks.findIndex((t) => (t.sid || t.name) === c || t.name === c);
  if (k < 0) return false;
  setRestore(H.get('t') ? +(H.get('t') as string) : ls.str('last') === key(tracks[k]) ? +(ls.str('pos') || 0) || null : null);
  await load(k, false, false);
  return true;
}
