import { useStore, set } from '../store/useStore';
import { isOff, tabName } from '../store/selectors';
import { Icon, type IconName } from './Icon';
import { Orb } from './Orb';
import { goTab, newPlaylist } from '../lib/actions';
import { nCan } from '../lib/util';

/** barra lateral (escritorio ≥ 1024 px): navegación, playlists, bolita de color y estado de la biblioteca */
export function Sidebar() {
  const view = useStore((s) => s.view);
  const homeTab = useStore((s) => s.homeTab);
  const nTracks = useStore((s) => s.tracks.length);
  const nFavs = useStore((s) => s.favs.length);
  const nQueue = useStore((s) => s.queue.length);
  const pls = useStore((s) => s.pls);
  const off = useStore((s) => isOff(s));
  const scanning = useStore((s) => s.scanning);
  const homeMenuOpen = useStore((s) => s.homeMenuOpen);
  const active = tabName(view, homeTab);

  const nav = (id: string, icon: IconName, label: string, n?: number) => (
    <button key={id} className={`nv ${active === id && !view.startsWith('pl:') ? 'on' : ''}`} onClick={() => goTab(id)}>
      <Icon name={icon} size={20} /><span>{label}</span>{n ? <em>{n}</em> : null}
    </button>
  );

  return (
    <aside id="side">
      <div className="brand">
        <Orb hold className="brand-orb" />
        <div><b>brplayer</b><small>Tu música, tu servidor</small></div>
      </div>

      <nav className="navs">
        {nav('lib', 'library', 'Biblioteca', nTracks)}
        {nav('recent', 'clock', 'Recientes')}
        {nav('pls', 'heart', 'Favoritas', nFavs)}
        {nav('queue', 'list', 'Cola', nQueue)}
      </nav>

      <div className="plh">
        <b>Mis playlists</b>
        <button className="rb sm" onClick={() => newPlaylist()} aria-label="Nueva playlist"><Icon name="plus" size={18} /></button>
      </div>
      <div className="pls">
        {pls.length === 0 && <p className="mut">Crea una playlist para agrupar tus canciones favoritas.</p>}
        {pls.map((p) => (
          <button key={p.id} className={`nv sm ${view === 'pl:' + p.id ? 'on' : ''}`} onClick={() => set({ view: 'pl:' + p.id, recFor: '' })}>
            <Icon name="note" size={17} /><span>{p.name}</span><em>{p.items.length}</em>
          </button>
        ))}
      </div>

      <div className="sfoot">
        <Orb hold className="side-orb" />
        <div className="stat">
          <span className={`dot ${off ? 'off' : ''}`} />
          <span className="min-w-0 flex-1 truncate">{scanning ? 'Leyendo etiquetas…' : off ? 'Sin conexión' : 'En línea'} · {nCan(nTracks)}</span>
          <button data-menu className="rb sm" onClick={() => set({ homeMenuOpen: !homeMenuOpen })} aria-label="Ajustes y menú"><Icon name="sliders" size={19} /></button>
        </div>
      </div>
    </aside>
  );
}
