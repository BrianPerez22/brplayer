import type { Config } from 'tailwindcss';

/** Los colores salen de variables CSS: así el acento (bolita), el tema y los efectos RGB cambian en vivo. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        mut: 'var(--mut)',
        card: 'var(--card)',
        acc: 'var(--acc)',
      },
      fontFamily: { sans: ['-apple-system', 'system-ui', 'sans-serif'] },
      transitionTimingFunction: { squish: 'cubic-bezier(.3,2.2,.5,1)', pop: 'cubic-bezier(.34,1.56,.64,1)' },
      keyframes: {
        pulse2: {
          '0%,100%': { transform: 'scale(.9)', boxShadow: '0 0 0 0 color-mix(in srgb,var(--acc) 55%,transparent)' },
          '50%': { transform: 'scale(1.15)', boxShadow: '0 0 0 9px transparent' },
        },
        slL: { from: { transform: 'translateX(36px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        slR: { from: { transform: 'translateX(-36px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        qa: { '0%': { background: 'color-mix(in srgb,var(--acc) 32%,transparent)' }, '100%': { background: 'transparent' } },
        npl: { '0%,100%': { opacity: '.7', transform: 'scale(.96)' }, '50%': { opacity: '.98', transform: 'scale(1.05)' } },
      },
      animation: {
        pulse2: 'pulse2 .9s ease-in-out infinite',
        slL: 'slL .35s cubic-bezier(.2,.8,.3,1)',
        slR: 'slR .35s cubic-bezier(.2,.8,.3,1)',
        qa: 'qa .8s ease-out',
        npl: 'npl 10s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
