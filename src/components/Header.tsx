import { useEffect, useRef, useState } from 'react';
import { useStore, set, S, toast, openSheet } from '../store/useStore';
import { isOff, tabName } from '../store/selectors';
import { Icon, type IconName } from './Icon';
import { Orb } from './Orb';
import { SORT_OPTIONS, SPEEDS, TAB_ORDER } from '../lib/constants';
import { chooseSort, clearImported, pickFiles, refreshLib, setOnlyOff, toggleOffMode } from '../lib/library';
import { downloadTrack } from '../lib/download';
import { enterSel, exitSel, goTab, selActions, selectAll } from '../lib/actions';
import { nextTheme, themeLabel } from '../lib/theme';
import { sleepActive, sleepAtEnd, sleepIn, sleepLabel, sleepOff, setSpeed } from '../audio/player';
import * as AE from '../audio/engine';

const spdTxt = (v: number): string => String(v).replace('.', ',') + '×';

const TAB_LABEL: Record<string, string> = { lib: 'Biblioteca', recent: 'Recientes' };

/** menú principal: en móvil sale bajo el botón ☰, en escritorio sobre el engranaje de la barra lateral */
export function HomeMenu() {
  const speed = useStore((s) => s.speed);
  const offMode = useStore((s) => s.offMode);
  const theme = useStore((s) => s.theme);
  const off = useStore((s) => isOff(s));
  const close = () => set({ homeMenuOpen: false });
  const item = (icon: IconName, label: string, run: () => void, hint?: string) => (
    <button onClick={() => { close(); run(); }}>
      <i className="mi"><Icon name={icon} size={18} /></i>
      <span>{label}{hint && <small>{hint}</small>}</span>
    </button>
  );
  return (
    <div id="hm" className="pop animate-pop">
      {item('plus', 'Añadir canciones', pickFiles, 'Importa archivos de este dispositivo')}
      {item('check', 'Seleccionar canciones', () => { enterSel(); toast('Toca las canciones para elegirlas'); })}
      {item('refresh', 'Actualizar biblioteca', () => void refreshLib(false))}
      {item('eq', 'Ecualizador y sonido 3D', () => { AE.init(); set({ eqOpen: true }); })}
      {item('speed', 'Velocidad', () => openSheet('Velocidad de reproducción', SPEEDS.map((v) => [
        spdTxt(v) + (v === 1 ? ' (normal)' : ''), v === speed ? 'check' : 'speed', () => { setSpeed(v); toast('Velocidad: ' + spdTxt(v)); },
      ] as [string, 'check' | 'speed', () => void])), spdTxt(speed))}
      {item('clock', 'Temporizador', () => openSheet('Temporizador de apagado', [
        ...[15, 30, 45, 60].map((m) => [m + ' minutos', 'clock', () => sleepIn(m)] as [string, 'clock', () => void]),
        ['Al terminar la canción', 'clock', sleepAtEnd],
        ...(sleepActive() ? [['Desactivar temporizador', 'close', sleepOff] as [string, 'close', () => void]] : []),
      ]), sleepActive() ? sleepLabel().replace(/^Temporizador:\s*/, '') : undefined)}
      {item(theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'auto', 'Tema', () => set({ theme: nextTheme(theme) }), themeLabel(theme))}
      {item('dlf', 'Modo sin conexión automático', toggleOffMode, offMode ? (off ? 'Activo ahora' : 'Activado') : 'Desactivado')}
      {item('dlf', 'Descargar canción actual', () => void downloadTrack(S().tracks[S().cur]))}
      {item('trash', 'Borrar importadas', () => void clearImported())}
    </div>
  );
}

/** botón de orden + menú de orden y filtro offline */
function SortButton({ className = '' }: { className?: string }) {
  const sortKey = useStore((s) => s.sortKey);
  const onlyOff = useStore((s) => s.onlyOff);
  const menuOpen = useStore((s) => s.menuOpen);
  return (
    <div className={`sortw relative ${className}`}>
      <button className="rb" aria-label="Ordenar" aria-expanded={menuOpen} onClick={() => set({ menuOpen: !menuOpen })}><Icon name="sort" size={20} /></button>
      {menuOpen && (
        <div id="menu" className="pop animate-pop">
          {SORT_OPTIONS.map(([k, l]) => (
            <button key={k} onClick={() => void chooseSort(k, l)}>{l}{k === sortKey && <Icon name="check" size={18} />}</button>
          ))}
          <button className="sep" onClick={() => { setOnlyOff(!onlyOff); set({ menuOpen: false }); }}>
            Solo canciones offline{onlyOff && <Icon name="check" size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const selMode = useStore((s) => s.selMode);
  const selN = useStore((s) => [...s.sel].filter((t) => s.tracks.includes(t)).length);
  const view = useStore((s) => s.view);
  const homeTab = useStore((s) => s.homeTab);
  const qn = useStore((s) => s.queue.length);
  const homeMenuOpen = useStore((s) => s.homeMenuOpen);
  const query = useStore((s) => s.query);
  const [q, setQ] = useState(query);
  const tm = useRef(0);
  useEffect(() => setQ(query), [query]);
  const active = tabName(view, homeTab);

  const type = (v: string) => { setQ(v); clearTimeout(tm.current); tm.current = window.setTimeout(() => set({ query: v }), 90); };

  return (
    <>
      <header id="top" className="sticky z-[5]" style={{ top: 'env(safe-area-inset-top,0px)' }}>
        <div className="wrap">
          <div className="row1">
            {!selMode && (
              <>
                <button data-menu className="rb lg:!hidden" onClick={() => set({ homeMenuOpen: !homeMenuOpen })} aria-label="Menú"><Icon name="menu" size={22} /></button>
                <label className="search">
                  <Icon name="search" size={19} />
                  <input
                    type="search" id="q" placeholder="Buscar música…" value={q}
                    autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
                    onChange={(e) => type(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.preventDefault(); type(''); } }}
                  />
                </label>
                <SortButton className="max-lg:hidden" />
                <Orb hold className="orb-s lg:!hidden" />
              </>
            )}
            {selMode && (
              <div id="selbar" className="flex min-w-0 flex-1 items-center gap-2">
                <button className="rb" onClick={exitSel} aria-label="Salir de la selección"><Icon name="close" size={20} /></button>
                <b className="min-w-0 truncate text-[17px]">{selN ? (selN === 1 ? '1 seleccionada' : selN + ' seleccionadas') : 'Elige canciones'}</b>
                <span className="flex-1" />
                <button className="pill" onClick={selectAll}>Todo</button>
                <button className="pill pri" onClick={selActions}><Icon name="more" size={20} />Acciones</button>
              </div>
            )}
          </div>
          <nav id="tabs" className="lg:!hidden">
            {TAB_ORDER.map((id) => id === 'pls' ? (
              <button key={id} className={`tab ico ${active === id ? 'on' : ''}`} onClick={() => goTab(id)} aria-label="Favoritos y playlists"><Icon name="heart" size={19} /></button>
            ) : (
              <button key={id} className={`tab ${active === id ? 'on' : ''}`} onClick={() => goTab(id)}>
                {id === 'queue' ? <>Cola{qn ? <em>{qn}</em> : null}</> : TAB_LABEL[id]}
              </button>
            ))}
            <SortButton />
          </nav>
        </div>
      </header>
      {homeMenuOpen && <HomeMenu />}
    </>
  );
}
