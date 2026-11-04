import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { isFav } from '../store/selectors';
import { toggleCurrentFav, showInfo, nowMenu } from '../lib/actions';
import { shareTrack } from '../lib/links';
import { toast } from '../store/useStore';
import { S } from '../store/useStore';

/** título y artista de la canción actual (artista y álbum son tocables) */
export function NowTitle({ idPrefix = '' }: { idPrefix?: string }) {
  const t = useStore((s) => s.tracks[s.cur]);
  const loading = useStore((s) => s.loading);
  useStore((s) => s.rev);
  return (
    <>
      <b id={idPrefix + 'tt'} className="block truncate">{t ? t.title : 'Sin reproducción'}</b>
      <small id={idPrefix + 'ta'} className="block truncate text-mut">
        {t ? (t.artist || t.album ? (
          <>
            {t.artist && <span className="lk" data-ar={t.artist}>{t.artist}</span>}
            {t.artist && t.album && ' · '}
            {t.album && <span className="lk" data-al={t.album}>{t.album}</span>}
          </>
        ) : t.name) : loading ? 'Cargando biblioteca…' : 'Elige una canción'}
      </small>
    </>
  );
}

export function FavButton({ size = 22 }: { size?: number }) {
  const fav = useStore((s) => { const t = s.tracks[s.cur]; return !!t && isFav(t, s); });
  return (
    <button className={`ib b-fav ${fav ? 'on' : ''}`} onClick={toggleCurrentFav} aria-label="Favorita"><Icon name={fav ? 'heartf' : 'heart'} size={size} /></button>
  );
}

export function ShareButton({ size = 22 }: { size?: number }) {
  return (
    <button className="ib" aria-label="Compartir" onClick={() => { const t = S().tracks[S().cur]; if (t) void shareTrack(t, true); else toast('No hay canción seleccionada'); }}>
      <Icon name="share" size={size} />
    </button>
  );
}

export function InfoButton({ size = 22 }: { size?: number }) {
  return <button className="ib" onClick={() => void showInfo()} aria-label="Información"><Icon name="info" size={size} /></button>;
}

/** ⋯ acciones de la canción que suena: información, compartir, ecualizador, playlist… */
export function MoreButton({ size = 22 }: { size?: number }) {
  return <button className="ib b-more" onClick={nowMenu} aria-label="Más acciones de la canción"><Icon name="more" size={size} /></button>;
}
