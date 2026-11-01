/**
 * Sorpresas en inactividad: si las listas quedan quietas más de 2 minutos, la interfaz se derrite,
 * se pixela, se vuelve psicodélica o se pone RGB, hasta que vuelvas a tocarla.
 * Derretir y psicodelia son CSS (clases fx-melt / fx-lsd en <body> + variable --m); el pixelado trabaja sobre una "foto" de la interfaz.
 */
import { rgbStart, rgbStop } from './accent';
import { S } from '../store/useStore';
import { reducedMotion } from '../lib/util';

const RS = document.documentElement.style;

/* ---------- Pixelado progresivo: foto de la interfaz (SVG con foreignObject) y se va pixelando sobre ella ---------- */
const PXL = (() => {
  let cv: HTMLCanvasElement | null = null;
  let ox: CanvasRenderingContext2D | null = null;
  let im: HTMLImageElement | null = null;
  let run = 0, t0 = 0, tmr = 0, snapT = 0, busy = 0, dpr = 1, W = 0, H = 0, DUR = 55000;
  const MAXB = 12;
  const pool: HTMLCanvasElement[] = [];
  const tc = (i: number, w: number, h: number): HTMLCanvasElement => {
    const c = pool[i] || (pool[i] = document.createElement('canvas'));
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c;
  };

  /* los estilos se cargan con <link>: se obtiene su texto (fetch, o cssRules si falla) una sola vez */
  let cssP: Promise<string> | null = null;
  const sheetText = (l: HTMLLinkElement): string => {
    try { return [...(l.sheet as CSSStyleSheet).cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; }
  };
  const getCSS = (): Promise<string> =>
    cssP || (cssP = Promise.all(
      [...document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]')].map((l) =>
        fetch(l.href).then((r) => (r.ok ? r.text() : Promise.reject())).catch(() => sheetText(l))),
    ).then((a) => a.concat([...document.querySelectorAll('style')].map((s) => s.textContent || '')).join('\n')));

  async function snap(): Promise<HTMLImageElement> {
    const raw = await getCSS();
    return new Promise((res, rej) => {
      try {
        const R = document.documentElement, cs = getComputedStyle(R);
        W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
        const pr = document.createElement('div');
        pr.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)';
        document.body.appendChild(pr);
        const pc = getComputedStyle(pr), it = pc.paddingTop, ib = pc.paddingBottom;
        pr.remove();
        const css = raw.replace(/env\(safe-area-inset-top,0px\)/g, it).replace(/env\(safe-area-inset-bottom,0px\)/g, ib).replace(/:root/g, 'html');
        const h = R.cloneNode(true) as HTMLElement;
        h.querySelector('head')?.remove();
        h.querySelectorAll('script,audio,#file').forEach((e) => e.remove());
        /* canvas → imagen (barra de progreso, visualizador) */
        const A = [...document.querySelectorAll<HTMLCanvasElement>('canvas:not(#pxo)')], B = [...h.querySelectorAll('canvas:not(#pxo)')];
        A.forEach((c, i) => {
          const b = B[i];
          if (!b || !c.offsetWidth) return;
          try {
            const m = document.createElement('img');
            m.className = c.className; m.id = c.id;
            m.setAttribute('src', c.toDataURL('image/png'));
            b.replaceWith(m);
          } catch { /* canvas protegido */ }
        });
        h.querySelectorAll('#bar,#fs,#pxo').forEach((e) => e.remove());
        const AI = [...document.querySelectorAll<HTMLInputElement>('input:not(#file)')], BI = [...h.querySelectorAll('input:not(#file)')];
        AI.forEach((a, i) => { if (BI[i]) BI[i].setAttribute('value', a.value); });
        /* solo se conservan las filas visibles; las demás quedan como espacio vacío del mismo alto */
        const L = document.getElementById('list'), cl = h.querySelector<HTMLElement>('#list');
        if (L && cl) {
          [...L.children].forEach((ch, i) => {
            const r = ch.getBoundingClientRect();
            if (r.bottom < -40 || r.top > H + 40) {
              const sp = document.createElement('div');
              sp.style.height = r.height + 'px';
              if (cl.children[i]) cl.children[i].replaceWith(sp);
            }
          });
        }
        if (cl) cl.style.marginTop = -scrollY + 'px';
        const vars = ['--bg', '--fg', '--mut', '--card', '--acc'].map((v) => v + ':' + cs.getPropertyValue(v).trim()).join(';');
        h.setAttribute('style', `${vars};color-scheme:${cs.colorScheme};box-sizing:border-box;padding-top:${it};padding-bottom:${ib};width:${W}px;height:${H}px;overflow:hidden`);
        const st = document.createElement('style');
        st.textContent = css;
        h.insertBefore(st, h.firstChild);
        // eslint-disable-next-line no-control-regex
        const xml = new XMLSerializer().serializeToString(h).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * dpr)}" height="${Math.round(H * dpr)}" viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xml}</foreignObject></svg>`;
        const m = new Image();
        m.onload = () => res(m);
        m.onerror = () => rej(new Error('snap'));
        m.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch (e) { rej(e); }
    });
  }

  function paint(): void {
    if (!im || !cv || !ox) return;
    const p = Math.min(1, (performance.now() - t0) / DUR), b = 1 + (MAXB - 1) * Math.pow(p, 1.5), bd = b * dpr;
    const tw = Math.max(1, Math.round(cv.width / bd)), th = Math.max(1, Math.round(cv.height / bd));
    let cur: CanvasImageSource = im, cw = cv.width, ch = cv.height, k = 0;
    while (cw / 2 >= tw && ch / 2 >= th) {
      const nw = Math.ceil(cw / 2), nh = Math.ceil(ch / 2), c = tc(k++ % 2, nw, nh), x = c.getContext('2d') as CanvasRenderingContext2D;
      x.clearRect(0, 0, nw, nh); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
      cur = c; cw = nw; ch = nh;
    }
    const s = tc(2, tw, th), sx = s.getContext('2d') as CanvasRenderingContext2D;
    sx.clearRect(0, 0, tw, th); sx.imageSmoothingQuality = 'high'; sx.drawImage(cur, 0, 0, cw, ch, 0, 0, tw, th);
    ox.imageSmoothingEnabled = false;
    ox.clearRect(0, 0, cv.width, cv.height);
    ox.drawImage(s, 0, 0, tw, th, 0, 0, tw * bd, th * bd);
  }

  function tick(): void {
    if (!run) return;
    paint();
    const n = performance.now();
    if (n - snapT > 1500 && !busy) {
      busy = 1; snapT = n;
      snap().then((i) => { if (run) im = i; }).catch(() => {}).finally(() => { busy = 0; });
    }
    tmr = window.setTimeout(tick, 150);
  }

  async function start(speed = 1): Promise<boolean> {
    run = 1; DUR = 55000 / speed;
    try { im = await snap(); } catch { run = 0; return false; }
    if (!run) return true;
    cv = document.createElement('canvas');
    cv.id = 'pxo'; cv.width = im.width; cv.height = im.height;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    document.body.appendChild(cv);
    ox = cv.getContext('2d');
    t0 = snapT = performance.now();
    paint();
    requestAnimationFrame(() => requestAnimationFrame(() => cv && cv.classList.add('on')));
    tick();
    return true;
  }

  function stop(): void {
    if (!run) return;
    run = 0; clearTimeout(tmr);
    const c = cv;
    cv = null; im = null;
    if (c) { c.classList.add('off'); c.classList.remove('on'); setTimeout(() => c.remove(), 700); }
  }
  return { start, stop };
})();

/* ---------- Control de inactividad ---------- */
type FxName = 'melt' | 'pixel' | 'lsd' | 'rgb';
const SPD: Record<FxName, number> = { melt: 10, pixel: 10, lsd: 10, rgb: 5 };

export const IDLE = (() => {
  const B = document.body;
  let ms = 120000, tm = 0, on = false, cur: FxName | null = null, prev: FxName | null = null, fxc: 'melt' | 'lsd' | null = null;
  let rm = 0, ri = 0, sp = 1, lx = -1, ly = -1, lt = 0, forceSp = 0;
  const setM = (v: number) => { rm = v; RS.setProperty('--m', v.toFixed(3)); };
  const ramp = (to: number, dur: number, done?: () => void) => {
    clearInterval(ri);
    const from = rm, t0 = performance.now();
    ri = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      setM(from + (to - from) * k);
      if (k >= 1) { clearInterval(ri); ri = 0; done?.(); }
    }, dur > 5000 ? 250 : 40);
  };
  const pick = (l: FxName[]): FxName => { const a = l.filter((x) => x !== prev); return a[(Math.random() * a.length) | 0]; };
  const inList = () => !S().fsOpen;

  function begin(name: FxName): void {
    cur = prev = name;
    sp = forceSp || SPD[name];
    if (name === 'melt' || name === 'lsd') {
      B.classList.remove('fx-melt', 'fx-lsd');
      fxc = name;
      B.classList.add('fx-' + name);
      setM(0);
      ramp(1, (name === 'melt' ? 50000 : 40000) / sp);
    } else if (name === 'rgb') rgbStart(2200 / sp, [document.querySelector('header'), document.getElementById('list')]);
    else PXL.start(sp).then((ok) => { if (!ok && on && cur === 'pixel') { cur = null; begin(pick(['melt', 'lsd', 'rgb'])); } });
  }

  function end(fast: boolean, done?: () => void): void {
    const c = cur;
    cur = null;
    if (c === 'rgb') rgbStop(false); else if (c === 'pixel') PXL.stop();
    if (fxc) {
      const k = fxc;
      ramp(0, fast ? 450 : 1600, () => {
        if (fxc === k) { B.classList.remove('fx-' + k); fxc = null; RS.removeProperty('--m'); }
        done?.();
      });
    } else done?.();
  }

  const arm = () => { clearTimeout(tm); tm = window.setTimeout(go, ms); };
  function go(): void {
    if (document.hidden || !inList() || reducedMotion()) { arm(); return; }
    on = true;
    begin(pick(['melt', 'pixel', 'lsd', 'rgb']));
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
    force(n: FxName, s = 0): void { forceSp = s; on = true; clearTimeout(tm); end(true, () => begin(n)); },
    get on() { return on; },
    get cur() { return cur; },
    setMs(v: number): void { ms = v; arm(); },
  };
})();
