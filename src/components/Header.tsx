import { useEffect, useRef, useState } from 'react';
import { useStore, set, S, toast, openSheet } from '../store/useStore';
import { isOff, tabName } from '../store/selectors';
import { Icon } from './Icon';
import { SORT_OPTIONS, SPEEDS, TAB_ORDER } from '../lib/constants';
import { chooseSort, clearImported, pickFiles, refreshLib, setOnlyOff, toggleOffMode } from '../lib/library';
import { downloadTrack } from '../lib/download';
import { enterSel, exitSel, goTab, selActions, selectAll } from '../lib/actions';
import { sleepActive, sleepAtEnd, sleepIn, sleepLabel, sleepOff, setSpeed } from '../audio/player';
import * as AE from '../audio/engine';

const spdTxt = (v: number): string => String(v).replace('.', ',') + '×';

const TAB_LABEL: Record<string, string> = { lib: 'Biblioteca', recent: 'Recientes' };

/** ☰ menú principal */
function HomeMenu() {
  const speed = useStore((s) => s.speed);
  const offMode = useStore((s) => s.offMode);
  const off = useStore((s) => isOff(s));
  const close = () => set({ homeMenuOpen: false });
  const item = (icon: Parameters<typeof Icon>[0]['name'], label: string, run: () => void) => (
    <button onClick={() => { close(); run(); }}><Icon name={icon} size={20} /><span>{label}</span></button>
  );
  return (
    <div id="hm">
      {item('plus', 'Añadir canciones', pickFiles)}
      {item('check', 'Seleccionar canciones', () => { enterSel(); toast('Toca las canciones para elegirlas'); })}
      {item('refresh', 'Actualizar biblioteca', () => void refreshLib(false))}
      {item('eq', 'Ecualizador', () => { AE.init(); set({ eqOpen: true }); })}
      {item('dlf', 'Modo sin conexión automático: ' + (offMode ? (off ? 'activo ahora' : 'sí') : 'no'), toggleOffMode)}
      {item('speed', 'Velocidad: ' + spdTxt(speed), () => openSheet('Velocidad de reproducción', SPEEDS.map((v) => [
        spdTxt(v) + (v === 1 ? ' (normal)' : ''), v === speed ? 'check' : 'speed', () => { setSpeed(v); toast('Velocidad: ' + spdTxt(v)); },
      ] as [string, 'check' | 'speed', () => void])))}
      {item('clock', sleepLabel(), () => openSheet('Temporizador de apagado', [
        ...[15, 30, 45, 60].map((m) => [m + ' minutos', 'clock', () => sleepIn(m)] as [string, 'clock', () => void]),
        ['Al terminar la canción', 'clock', sleepAtEnd],
        ...(sleepActive() ? [['Desactivar temporizador', 'close', sleepOff] as [string, 'close', () => void]] : []),
      ]))}
      {item('dlf', 'Descargar canción actual', () => void downloadTrack(S().tracks[S().cur]))}
      {item('trash', 'Borrar importadas', () => void clearImported())}
    </div>
  );
}

/** menú de orden y filtro offline */
function SortMenu() {
  const sortKey = useStore((s) => s.sortKey);
  const onlyOff = useStore((s) => s.onlyOff);
  return (
    <div id="menu">
      {SORT_OPTIONS.map(([k, l]) => (
        <button key={k} onClick={() => void chooseSort(k, l)}>{l}{k === sortKey && <Icon name="check" size={18} />}</button>
      ))}
      <button className="!mt-1 !rounded-b-lg border-t border-[#8883] !rounded-t-none" onClick={() => { setOnlyOff(!onlyOff); set({ menuOpen: false }); }}>
        Solo canciones offline{onlyOff && <Icon name="check" size={18} />}
      </button>
    </div>
  );
}

export function Header() {
  const selMode = useStore((s) => s.selMode);
  const selN = useStore((s) => [...s.sel].filter((t) => s.tracks.includes(t)).length);
  const view = useStore((s) => s.view);
  const homeTab = useStore((s) => s.homeTab);
  const qn = useStore((s) => s.queue.length);
  const menuOpen = useStore((s) => s.menuOpen);
  const homeMenuOpen = useStore((s) => s.homeMenuOpen);
  const query = useStore((s) => s.query);
  const [q, setQ] = useState(query);
  const tm = useRef(0);
  useEffect(() => setQ(query), [query]);
  const active = tabName(view, homeTab);

  return (
    <>
      <header className="sticky z-[5] flex flex-wrap gap-2 bg-bg px-4 pb-2.5 pt-3.5" style={{ top: 'env(safe-area-inset-top,0px)' }}>
        {!selMode && (
          <>
            <button id="hb" className="!flex-none" onClick={() => set({ homeMenuOpen: !homeMenuOpen })} aria-label="Menú"><Icon name="menu" /></button>
            <input
              type="search" id="q" placeholder="Buscar…" value={q}
              className="min-w-20 flex-[1_1_0] rounded-[10px] border-0 bg-card p-2.5"
              onChange={(e) => { setQ(e.target.value); clearTimeout(tm.current); const v = e.target.value; tm.current = window.setTimeout(() => set({ query: v }), 90); }}
            />
          </>
        )}
        {selMode && (
          <div id="selbar" className="flex min-w-0 flex-[1_1_100%] items-center gap-2">
            <button className="ib" onClick={exitSel} aria-label="Salir de la selección"><Icon name="close" /></button>
            <b className="min-w-0 truncate">{selN ? (selN === 1 ? '1 seleccionada' : selN + ' seleccionadas') : 'Elige canciones'}</b>
            <span className="flex-1" />
            <button onClick={selectAll}>Todo</button>
            <button className="!bg-acc font-semibold !text-white" onClick={selActions}><Icon name="more" size={20} />Acciones</button>
          </div>
        )}
        <nav id="tabs" className="flex basis-full gap-2">
          {TAB_ORDER.map((id) => id === 'pls' ? (
            <button key={id} className={`tab !flex-none !px-3.5 ${active === id ? 'on' : ''}`} onClick={() => goTab(id)} aria-label="Favoritos"><Icon name="heart" size={20} /></button>
          ) : (
            <button key={id} className={`tab ${active === id ? 'on' : ''}`} onClick={() => goTab(id)}>
              {id === 'queue' ? <>Cola {qn ? <span>({qn})</span> : null}</> : TAB_LABEL[id]}
            </button>
          ))}
          <button id="sortb" className="!flex-none !px-3" onClick={() => set({ menuOpen: !menuOpen })} aria-label="Ordenar"><Icon name="sort" /></button>
        </nav>
      </header>
      {menuOpen && <SortMenu />}
      {homeMenuOpen && <HomeMenu />}
    </>
  );
}
