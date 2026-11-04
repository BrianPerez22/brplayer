import { set, useStore } from '../store/useStore';
import { isFav } from '../store/selectors';
import { Icon } from './Icon';
import { GIF } from '../lib/util';
import { rand, toggle } from '../audio/player';
import { toggleCurrentFav } from '../lib/actions';

/** banner de "ahora suena" de la biblioteca: carátula grande, estado animado y acciones rápidas */
export function Hero() {
  const t = useStore((s) => s.tracks[s.cur]);
  const has = useStore((s) => s.tracks.length > 0);
  const loading = useStore((s) => s.loading);
  const playing = useStore((s) => s.playing);
  const cover = useStore((s) => s.coverSrc);
  const faved = useStore((s) => { const x = s.tracks[s.cur]; return !!x && isFav(x, s); });
  useStore((s) => s.rev);

  const status = t ? (playing ? <span>Reproduciendo<span className="max-sm:hidden"> ahora</span></span> : 'En pausa') : loading ? 'Cargando…' : 'Listo para sonar';

  return (
    <section className="hero">
      <div className="hero-tx">
        <span className="status">
          <span className={`eqs ${playing ? 'on' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
          {status}
        </span>
        <h2>{t ? t.title : 'Elige una canción'}</h2>
        <p>
          {t ? (t.artist || t.album ? (
            <>
              {t.artist && <span className="lk" data-ar={t.artist}>{t.artist}</span>}
              {t.artist && t.album && ' · '}
              {t.album && <span className="lk" data-al={t.album}>{t.album}</span>}
            </>
          ) : t.name) : 'Toca cualquier canción de tu biblioteca para empezar.'}
        </p>
        {has && (
          <div className="hero-act">
            <button className="btn pri" onClick={t ? toggle : rand}>
              <Icon name={playing ? 'pause' : 'play'} size={20} />{playing ? 'Pausar' : t ? 'Reproducir' : 'Sorpréndeme'}
            </button>
            {t && <button className="btn rnd" onClick={rand} aria-label="Canción aleatoria"><Icon name="dice" size={19} /><span className="max-sm:sr-only">Aleatoria</span></button>}
            {t && (
              <button className={`rb hrt ${faved ? 'on' : ''}`} onClick={toggleCurrentFav} aria-label="Favorita">
                <Icon name={faved ? 'heartf' : 'heart'} size={21} />
              </button>
            )}
          </div>
        )}
      </div>
      <button className={`hero-cv ${playing ? 'pl' : ''}`} onClick={() => set({ fsOpen: true })} aria-label="Abrir pantalla completa">
        <img className="cv" src={cover || GIF} alt="" />
      </button>
    </section>
  );
}
