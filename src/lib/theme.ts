import { ls } from './storage';

export type Theme = 'auto' | 'light' | 'dark';
const ORDER: Theme[] = ['auto', 'light', 'dark'];

export const getTheme = (): Theme => {
  const v = ls.str('theme');
  return v === 'light' || v === 'dark' ? v : 'auto';
};

/** aplica el tema a <html>: sin data-theme sigue al sistema (prefers-color-scheme) */
export function applyTheme(t: Theme): void {
  const r = document.documentElement;
  if (t === 'auto') delete r.dataset.theme; else r.dataset.theme = t;
}

export const nextTheme = (t: Theme): Theme => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
export const themeLabel = (t: Theme): string => (t === 'auto' ? 'Automático' : t === 'light' ? 'Claro' : 'Oscuro');
