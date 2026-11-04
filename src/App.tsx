import { useEffect } from 'react';
import { S, set, useStore } from './store/useStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { List } from './components/List';
import { PlayerBar } from './components/PlayerBar';
import { FullScreen } from './components/FullScreen';
import { Equalizer } from './components/Equalizer';
import { InfoModal, Sheet, Toast } from './components/Overlays';
import { initPlayer, toggle } from './audio/player';
import { bootstrap } from './lib/library';
import { exitSel, openGroup } from './lib/actions';
import { IDLE } from './fx/idle';
import { paintFavicon, rgbStart, rgbStop, isRgb } from './fx/accent';
import { vz } from './visualizer/vz';
import { applyTheme } from './lib/theme';

/** clics globales: artista/álbum abren su página; tocar fuera cierra los menús */
function useGlobalClicks() {
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('.sortw')) set({ menuOpen: false });
      if (!el.closest('[data-menu],#hm')) set({ homeMenuOpen: false });
      const lk = el.closest<HTMLElement>('[data-ar],[data-al]');
      if (lk) openGroup(lk.dataset.ar != null ? 'ar:' + lk.dataset.ar : 'al:' + lk.dataset.al);
    };
    document.addEventListener('click', f);
    return () => document.removeEventListener('click', f);
  }, []);
}

/** Teclado: espacio = pausa; mantener espacio = RGB de la bolita; flechas/F/V/Esc en el visualizador */
function useKeyboard() {
  useEffect(() => {
    let sp = 0, hd = false;
    const typing = (e: KeyboardEvent) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) && (e.target as HTMLInputElement).type !== 'range';
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = S();
      if (e.key === 'Escape' && s.selMode && !s.sheet && !typing(e)) { exitSel(); return; }
      if (e.code === 'Space') {
        if (typing(e)) return;
        e.preventDefault();
        if (e.repeat || sp) return;
        sp = window.setTimeout(() => { sp = -1; hd = true; if (!isRgb()) rgbStart(); }, 450);
        return;
      }
      if (typing(e) || (e.target as HTMLInputElement).type === 'range' || !s.fsOpen || s.sheet) return;
      if (e.key === 'ArrowLeft') vz.step(-1);
      else if (e.key === 'ArrowRight') vz.step(1);
      else if (e.key === 'f' || e.key === 'F') vz.imm();
      else if (e.key === 'v' || e.key === 'V') vz.menu();
      else if (e.key === 'Escape') { if (vz.immOn) vz.imm(false); else set({ fsOpen: false }); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !sp) return;
      e.preventDefault();
      clearTimeout(sp);
      sp = 0;
      if (hd) { hd = false; rgbStop(); } else toggle();
    };
    const blur = () => { if (sp) { clearTimeout(sp); sp = 0; } if (hd) { hd = false; rgbStop(); } };
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); };
  }, []);
}

export default function App() {
  const selMode = useStore((s) => s.selMode);
  const bmin = useStore((s) => s.bmin);
  const playing = useStore((s) => s.playing);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    paintFavicon();
    initPlayer();
    IDLE.init();
    void bootstrap();
  }, []);
  useGlobalClicks();
  useKeyboard();

  /* clases del <body> que usa el CSS: selección, barra minimizada, reproduciendo */
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.body.classList.toggle('selm', selMode); }, [selMode]);
  useEffect(() => { document.body.classList.toggle('bmin', bmin); }, [bmin]);
  useEffect(() => { document.body.classList.toggle('pl', playing); }, [playing]);

  return (
    <>
      <div id="app">
        <Sidebar />
        <div id="main">
          <Header />
          <List />
        </div>
      </div>
      <Toast />
      <PlayerBar />
      <FullScreen />
      <InfoModal />
      <Sheet />
      <Equalizer />
    </>
  );
}
