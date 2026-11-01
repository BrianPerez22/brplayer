import { memo, useEffect, useRef } from 'react';
import type { Track } from '../types';
import { Icon } from './Icon';
import { GIF } from '../lib/util';
import { ensureThumb } from '../lib/thumbs';

interface Props {
  t: Track;
  i: number;
  /** posición en la cola (si la fila es de la cola) */
  k?: number;
  current: boolean;
  selected: boolean;
  unavailable: boolean;
  /** cuántas veces se escuchó (Recientes) */
  count?: number;
  /** botón "agregar a la playlist" (recomendaciones) */
  add?: boolean;
  /** corazón relleno para quitar de favoritas */
  fav?: boolean;
  /* datos mutables de la canción, como primitivas para que memo repinte al cambiar */
  thumb?: string;
  title: string;
  artist: string;
  album: string;
  name: string;
}

/** artista y álbum son tocables: abren su página (lo gestiona el listener global por data-ar / data-al) */
function Sub({ artist, album, name }: { artist: string; album: string; name: string }) {
  if (!artist && !album) return <>{name}</>;
  return (
    <>
      {artist && <span className="lk" data-ar={artist}>{artist}</span>}
      {artist && album && ' · '}
      {album && <span className="lk" data-al={album}>{album}</span>}
    </>
  );
}

export const TrackRow = memo(function TrackRow(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = p;
  /* la carátula se pide solo cuando la fila entra (casi) en pantalla */
  useEffect(() => {
    const el = ref.current;
    if (!el || t.th) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); ensureThumb(t); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [t]);

  return (
    <div
      ref={ref}
      className={`t relative flex select-none items-center gap-3 border-b border-card px-1 py-3 [-webkit-touch-callout:none] ${p.current ? 'on' : ''} ${p.selected ? 'sel' : ''} ${p.unavailable ? 'na' : ''}`}
      data-i={p.i}
      data-qi={p.k}
    >
      <span className="ck"><Icon name="check" size={16} /></span>
      <img className="cv th h-12 w-12" src={p.thumb || GIF} alt="" />
      <div className="i min-w-0 flex-1">
        <b className="block truncate">{p.title}</b>
        <small className="block truncate text-mut"><Sub artist={p.artist} album={p.album} name={p.name} /></small>
      </div>
      {p.count ? <span className="cnt">{p.count}×</span> : null}
      {p.k != null && (
        <>
          <button className="x" data-qr={p.k} aria-label="Quitar de la cola"><Icon name="close" size={18} /></button>
          <span className="gp" data-gp={p.k} aria-label="Arrastrar para reordenar"><Icon name="grip" size={20} /></span>
        </>
      )}
      {p.add && <button className="ib" data-ap={p.i} aria-label="Agregar a la playlist"><Icon name="plus" size={20} /></button>}
      {p.fav && <button className="ib on" data-fv={p.i} aria-label="Quitar de favoritas"><Icon name="heartf" size={20} /></button>}
      <button className="ib" data-m={p.i} aria-label="Más opciones"><Icon name="more" size={20} /></button>
    </div>
  );
});

/** props de una fila a partir de la canción (los datos mutables salen del propio objeto) */
export function rowProps(t: Track, extra: { i: number; current: boolean; selected: boolean; unavailable: boolean }) {
  return { t, thumb: t.thumb, title: t.title, artist: t.artist, album: t.album, name: t.name, ...extra };
}
