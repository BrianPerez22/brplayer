import type { Config } from 'tailwindcss';

/**
 * Todos los colores salen de variables CSS: el acento (bolita), el tema claro/oscuro y los efectos RGB cambian en vivo.
 * Los tonos pastel (tint, soft…) se derivan del acento con color-mix: al cambiar la bolita se re-tiñe toda la interfaz.
 */
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
        'on-acc': 'var(--on-acc)',
        tint: 'color-mix(in srgb, var(--acc) 10%, var(--card))',
        tint2: 'color-mix(in srgb, var(--acc) 18%, var(--card))',
        ink: 'color-mix(in srgb, var(--acc) 72%, var(--fg))',
        line: 'color-mix(in srgb, var(--acc) 16%, transparent)',
      },
      fontFamily: {
        sans: ['ui-rounded', '"SF Pro Rounded"', 'Nunito', 'Quicksand', '-apple-system', 'system-ui', '"Segoe UI"', 'sans-serif'],
      },
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
        eqb: { '0%,100%': { transform: 'scaleY(.25)' }, '50%': { transform: 'scaleY(1)' } },
        pop: { from: { transform: 'translateY(12px) scale(.96)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        rise: { from: { transform: 'translateY(40px)' }, to: { transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        pulse2: 'pulse2 .9s ease-in-out infinite',
        slL: 'slL .35s cubic-bezier(.2,.8,.3,1)',
        slR: 'slR .35s cubic-bezier(.2,.8,.3,1)',
        qa: 'qa .8s ease-out',
        npl: 'npl 10s ease-in-out infinite',
        pop: 'pop .28s cubic-bezier(.2,.9,.3,1.2)',
        rise: 'rise .32s cubic-bezier(.2,.9,.3,1)',
        fade: 'fade .2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
