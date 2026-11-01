import { useEffect, type RefObject } from 'react';
import { S, set, toast } from '../store/useStore';
import { tabName, isGrp } from '../store/selectors';
import { TAB_ORDER } from '../lib/constants';
import { enterSel, toggleSel } from '../lib/actions';
import { setQueue } from '../audio/player';

/**
 * Gestos de la lista (listeners nativos para poder interceptar el clic antes que React):
 *  · pulsación larga o clic derecho = empezar a seleccionar
 *  · en modo selección, tocar una fila la marca (no la reproduce)
 *  · deslizar una fila a la derecha = a la cola; deslizar a los lados = cambiar de pestaña
 *  · arrastrar el asa de la cola = reordenar
 */
export function useListGestures(ref: RefObject<HTMLDivElement>): void {
  useEffect(() => {
    const L = ref.current as HTMLDivElement;
    const off: Array<() => void> = [];
    const on = <K extends keyof HTMLElementEventMap>(ev: K, fn: (e: HTMLElementEventMap[K]) => void, cap = false) => {
      L.addEventListener(ev, fn as EventListener, cap);
      off.push(() => L.removeEventListener(ev, fn as EventListener, cap));
    };
    const trackOf = (el: HTMLElement) => S().tracks[+(el.dataset.i as string)];

    /* ---------- Selección ---------- */
    let lpSup = false, tm = 0, x0 = 0, y0 = 0, row: HTMLElement | null = null;
    on('pointerdown', () => { lpSup = false; }, true); /* un clic nuevo empieza con un toque nuevo */
    on('click', (e) => { if (lpSup) { lpSup = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true); /* el clic tras una pulsación larga no activa la fila */
    on('click', (e) => {
      if (!S().selMode) return;
      const el = e.target as HTMLElement;
      const r = el.closest<HTMLElement>('.t[data-i],.ci[data-i]');
      if (r) { e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); const t = trackOf(r); if (t) toggleSel(t); return; }
      if (el.closest('[data-rand]')) { e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
    on('pointerdown', (e) => {
      if (S().selMode || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const r = (e.target as HTMLElement).closest<HTMLElement>('.t[data-i]');
      if (!r || (e.target as HTMLElement).closest('button,.lk,input,.gp')) return;
      row = r; x0 = e.clientX; y0 = e.clientY;
      clearTimeout(tm);
      tm = window.setTimeout(() => {
        tm = 0;
        const t = row && trackOf(row);
        if (!t) return;
        lpSup = true;
        enterSel(t);
        try { navigator.vibrate?.(15); } catch { /* sin vibración */ }
      }, 520);
    });
    on('pointermove', (e) => { if (tm && Math.hypot(e.clientX - x0, e.clientY - y0) > 9) { clearTimeout(tm); tm = 0; } });
    (['pointerup', 'pointercancel'] as const).forEach((ev) => on(ev, () => { clearTimeout(tm); tm = 0; }));
    on('contextmenu', (e) => {
      const r = (e.target as HTMLElement).closest<HTMLElement>('.t[data-i]');
      if (!r) return;
      e.preventDefault(); clearTimeout(tm); tm = 0;
      const t = trackOf(r);
      if (t) { lpSup = true; enterSel(t); }
    });

    /* ---------- Deslizar ---------- */
    const TH = 70;
    let st: { x: number; y: number; id: number; dir: number; row: HTMLElement | null } | null = null;
    let swiped = 0;
    const goTab = (d: number) => {
      const s = S();
      const i = (TAB_ORDER as readonly string[]).indexOf(tabName(s.view, s.homeTab)) + d;
      if (i < 0 || i >= TAB_ORDER.length) return;
      set({ view: TAB_ORDER[i], vstack: [], recFor: '' });
      L.classList.remove('slL', 'slR');
      void L.offsetWidth;
      L.classList.add(d > 0 ? 'slL' : 'slR');
    };
    const reset = (r: HTMLElement | null) => {
      if (!r) return;
      r.style.transition = 'transform .55s cubic-bezier(.3,2,.5,1)';
      r.style.transform = '';
      setTimeout(() => { r.classList.remove('sw'); r.style.transition = ''; }, 600);
    };
    on('pointerdown', (e) => {
      if ((e.pointerType === 'mouse' && e.button !== 0) || (e.target as HTMLElement).closest('.car,input,[data-gp]')) { st = null; return; }
      const s = S();
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, dir: 0, row: !s.selMode && (s.view === 'lib' || isGrp(s.view)) ? (e.target as HTMLElement).closest<HTMLElement>('.t[data-i]') : null };
    });
    on('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.dir) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) st.dir = 1; else return;
      }
      const r = st.row;
      if (!r) return;
      if (dx > 0) { r.classList.add('sw'); r.style.transition = 'none'; r.style.transform = 'translateX(' + Math.min(dx * 0.6, 100) + 'px)'; }
      else { r.style.transition = 'none'; r.style.transform = ''; }
    });
    const fin = (e: PointerEvent) => {
      if (!st || e.pointerId !== st.id) return;
      const s = st;
      st = null;
      if (!s.dir) return;
      swiped = Date.now();
      const r = s.row, dx = e.clientX - s.x, ok = e.type === 'pointerup';
      if (ok && r && dx >= TH) {
        const t = trackOf(r);
        if (t) { setQueue([...S().queue, t]); toast('Agregada a la cola'); r.classList.add('qa'); setTimeout(() => r.classList.remove('qa'), 800); }
      } else if (ok && !(r && dx > 0) && Math.abs(dx) >= TH) goTab(dx < 0 ? 1 : -1);
      reset(r);
    };
    on('pointerup', fin);
    on('pointercancel', fin);
    on('click', (e) => { if (Date.now() - swiped < 350) { e.stopPropagation(); e.preventDefault(); } }, true);

    /* ---------- Cola: arrastrar el asa ---------- */
    on('click', (e) => { if ((e.target as HTMLElement).closest('[data-gp]')) { e.stopPropagation(); e.preventDefault(); } }, true);
    on('pointerdown', (e) => {
      const h = (e.target as HTMLElement).closest<HTMLElement>('[data-gp]');
      if (!h || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      e.stopImmediatePropagation(); /* que no lo tome el gesto de deslizar de la lista */
      const rowEl = h.closest<HTMLElement>('.t') as HTMLElement;
      const rows = [...L.querySelectorAll<HTMLElement>('.t[data-qi]')], from = rows.indexOf(rowEl);
      if (from < 0) return;
      const qs = rows.map((r) => +(r.dataset.qi as string)), rc = rows.map((r) => r.getBoundingClientRect());
      const y = e.clientY, rh = rc[from].height, id = e.pointerId;
      let to = from;
      rowEl.classList.add('drag');
      try { h.setPointerCapture(id); } catch { /* sin captura */ }
      const mv = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        const dy = Math.max(rc[0].top - rc[from].top, Math.min(rc[rc.length - 1].top - rc[from].top, ev.clientY - y));
        const mid = rc[from].top + dy + rh / 2;
        rowEl.style.transform = 'translateY(' + dy + 'px)';
        to = from;
        rc.forEach((r, i) => { if (i > from && mid > r.top + r.height / 2) to = Math.max(to, i); else if (i < from && mid < r.top + r.height / 2) to = Math.min(to, i); });
        rows.forEach((r, i) => {
          if (i === from) return;
          const sft = from < to && i > from && i <= to ? -rh : from > to && i < from && i >= to ? rh : 0;
          r.style.transform = sft ? 'translateY(' + sft + 'px)' : '';
        });
      };
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        h.removeEventListener('pointermove', mv);
        h.removeEventListener('pointerup', up);
        h.removeEventListener('pointercancel', up);
        if (ev.type === 'pointerup' && to !== from) {
          const q = [...S().queue];
          const [t] = q.splice(qs[from], 1);
          q.splice(qs[to], 0, t);
          rows.forEach((r) => { r.style.transform = ''; });
          rowEl.classList.remove('drag');
          setQueue(q);
        } else { rows.forEach((r) => { r.style.transform = ''; }); rowEl.classList.remove('drag'); }
      };
      h.addEventListener('pointermove', mv);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });

    return () => off.forEach((f) => f());
  }, [ref]);
}
