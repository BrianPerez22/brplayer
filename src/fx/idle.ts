/**
 * Sorpresas en inactividad: si no tocas nada durante 2 minutos, la interfaz empieza a "derretirse", se vuelve psicodélica
 * o se pone RGB, hasta que vuelvas a tocarla.
 *
 * Diseño (pensado para no cargar el navegador):
 *  - Solo se animan `transform` y `opacity`, que el navegador resuelve en la GPU sin recalcular estilos ni repintar.
 *  - Se animan unos pocos bloques grandes (cabecera, lista, menú lateral) y UNA capa superpuesta; nunca cada fila.
 *  - Las animaciones usan la API nativa Web Animations: no hay JS por fotograma ni variables CSS cambiando.
 *  - Todo se cancela al primer gesto del usuario y también al ocultar la pestaña.
 * Para apagarlo del todo: localStorage.setItem('idlefx', '0') (o ls 'idlefx' = '0').
 */
import { rgbStart, rgbStop } from './accent';
import { S } from '../store/useStore';
import { ls } from '../lib/storage';
import { reducedMotion } from '../lib/util';

type FxName = 'melt' | 'lsd' | 'rgb';
const NAMES: FxName[] = ['melt', 'lsd', 'rgb'];

/** velocidad relativa de cada efecto (10 = normal) */
const SPD: Record<FxName, number> = { melt: 10, lsd: 10, rgb: 5 };

/** transformación de cada efecto para una amplitud `a` (0..1) y un sentido `d` (-1 | 1) */
const FRAME: Record<'melt' | 'lsd', (a: number, d: number) => string> = {
  melt: (a, d) => `translateY(${8 * a}px) scaleY(${1 + 0.03 * a}) skewX(${a * d}deg)`,
  lsd: (a, d) => `translate(${3 * a * d}px, ${-2 * a}px) rotate(${0.5 * a * d}deg) scale(${1 + 0.015 * a})`,
};

const BLOBS: Record<'lsd' | 'rgb', { colors: string[]; alpha: number }> = {
  lsd: { colors: ['#ff008c', '#00d2ff', '#ffe600'], alpha: 0.42 },
  rgb: { colors: ['#ff2a2a', '#2aff5a', '#2a6bff'], alpha: 0.3 },
};

const $id = (id: string): HTMLElement | null => document.getElementById(id);
const blocks = (): HTMLElement[] => ['top', 'list', 'side'].map($id).filter((e): e is HTMLElement => !!e);

interface Live {
  name: FxName;
  els: HTMLElement[];
  anims: Animation[];
  ov: HTMLElement | null;
}

export const IDLE = (() => {
  let ms = 120000, tm = 0, on = false, live: Live | null = null, prev: FxName | null = null;
  let lx = -1, ly = -1, lt = 0, forceSp = 0;

  const pick = (): FxName => {
    const a = NAMES.filter((x) => x !== prev);
    return a[(Math.random() * a.length) | 0];
  };
  const enabled = (): boolean => ls.str('idlefx') !== '0';
  const inList = (): boolean => !S().fsOpen;

  /** movimiento de un bloque: 3 vueltas de amplitud creciente (0.25 → 0.6 → 1) y después sigue en bucle a tope */
  function sway(el: HTMLElement, i: number, name: 'melt' | 'lsd', k: number): Animation[] {
    el.style.transformOrigin = '50% 0';
    const dur = (7000 + i * 1700) / k, dir = i % 2 ? 1 : -1, out: Animation[] = [];
    let delay = 0;
    for (const a of [0.25, 0.6, 1]) {
      out.push(el.animate(
        [{ transform: 'none' }, { transform: FRAME[name](a, dir), offset: 0.5 }, { transform: 'none' }],
        { duration: dur, delay, iterations: a === 1 ? Infinity : 1, easing: 'ease-in-out' },
      ));
      delay += dur;
    }
    return out;
  }

  /** capa de manchas de color por encima de todo (una sola, sin eventos de puntero) */
  function overlay(name: 'lsd' | 'rgb', k: number): { el: HTMLElement; anims: Animation[] } {
    const { colors, alpha } = BLOBS[name];
    const el = document.createElement('div');
    el.id = 'fxo';
    const anims: Animation[] = [];
    colors.forEach((c, i) => {
      const b = document.createElement('i');
      b.style.setProperty('--c', c);
      b.style.left = ['-10%', '45%', '15%'][i];
      b.style.top = ['-15%', '10%', '55%'][i];
      el.appendChild(b);
      const x = (i % 2 ? -1 : 1) * 30, y = (i === 1 ? -1 : 1) * 25;
      anims.push(b.animate(
        [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${x}vw,${y}vh) scale(1.25)` }],
        { duration: (9000 + i * 2500) / k, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' },
      ));
    });
    document.body.appendChild(el);
    anims.push(el.animate([{ opacity: 0 }, { opacity: alpha }], { duration: 5000 / k, fill: 'forwards', easing: 'ease-in' }));
    if (name === 'rgb') {
      anims.push(el.animate([{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }], { duration: 9000 / k, iterations: Infinity }));
    }
    return { el, anims };
  }

  function begin(name: FxName): void {
    prev = name;
    const k = (forceSp || SPD[name]) / 10;
    const l: Live = { name, els: [], anims: [], ov: null };
    live = l;
    if (name === 'melt' || name === 'lsd') {
      l.els = blocks();
      l.els.forEach((el, i) => l.anims.push(...sway(el, i, name, k)));
    }
    if (name === 'lsd' || name === 'rgb') {
      const o = overlay(name, k);
      l.ov = o.el;
      l.anims.push(...o.anims);
    }
    /* el RGB cambia el color de acento solo en la cabecera y el menú: pocos elementos, nunca la lista entera */
    if (name === 'rgb') rgbStart(2200 / (forceSp || SPD.rgb), [$id('top'), $id('side')]);
  }

  function end(fast: boolean): void {
    const l = live;
    live = null;
    if (!l) return;
    if (l.name === 'rgb') rgbStop(false);
    const back = fast ? 250 : 900;
    /* cada bloque vuelve suavemente a su sitio desde donde estuviera */
    l.els.forEach((el) => {
      const cur = getComputedStyle(el).transform;
      l.anims.forEach((a) => { if ((a.effect as KeyframeEffect | null)?.target === el) a.cancel(); });
      if (cur && cur !== 'none') {
        el.animate([{ transform: cur }, { transform: 'none' }], { duration: back, easing: 'ease-out' }).onfinish = () => { el.style.transformOrigin = ''; };
      } else el.style.transformOrigin = '';
    });
    const ov = l.ov;
    if (ov) {
      const op = getComputedStyle(ov).opacity;
      l.anims.forEach((a) => a.cancel());
      ov.animate([{ opacity: +op }, { opacity: 0 }], { duration: back, fill: 'forwards' }).onfinish = () => ov.remove();
    }
  }

  const arm = (): void => { clearTimeout(tm); tm = window.setTimeout(go, ms); };

  function go(): void {
    if (document.hidden || !inList() || reducedMotion() || !enabled()) { arm(); return; }
    on = true;
    begin(pick());
  }

  function off(): void { on = false; end(true); }

  function act(e?: Event): void {
    const pe = e as PointerEvent | undefined;
    if (pe && pe.type === 'pointermove' && Math.hypot(pe.clientX - lx, pe.clientY - ly) < 3) return;
    if (pe && pe.clientX != null) { lx = pe.clientX; ly = pe.clientY; }
    const n = performance.now();
    if (!on && n - lt < 250) return;
    lt = n;
    if (on) off();
    arm();
  }

  function init(): void {
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'touchmove', 'scroll', 'resize', 'orientationchange', 'input']
      .forEach((ev) => addEventListener(ev, act, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (on) off(); } else act(); });
    arm();
  }

  return {
    init,
    /** para pruebas: IDLE.force('melt') */
    force(n: FxName, s = 0): void { forceSp = s; on = true; clearTimeout(tm); end(true); begin(n); },
    get on() { return on; },
    get cur(): FxName | null { return live ? live.name : null; },
    setMs(v: number): void { ms = v; arm(); },
  };
})();
