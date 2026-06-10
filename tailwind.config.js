/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontSize: {
        'app-xs': ['var(--fs-xs)', { lineHeight: '1.35' }],
        'app-sm': ['var(--fs-sm)', { lineHeight: '1.4' }],
        'app-base': ['var(--fs-base)', { lineHeight: '1.45' }],
        'app-lg': ['var(--fs-lg)', { lineHeight: '1.35' }],
        'app-xl': ['var(--fs-xl)', { lineHeight: '1.3' }],
      },
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface-flat, var(--surface))',
          light: 'var(--surface-light)',
          lighter: 'var(--surface-lighter)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          glow: 'var(--accent-glow)',
        },
        glow: {
          green: 'var(--green)',
          red: 'var(--red)',
          amber: 'var(--amber)',
        },
        green: 'var(--green)',
        red: 'var(--red)',
        amber: 'var(--amber)',
        t: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: 'var(--border)',
        'border-focus': 'var(--border-focus)',
        input: 'var(--input-bg)',
        'btn-text': 'var(--btn-text)',
        'toggle-bg': 'var(--toggle-bg)',
        'toggle-dot': 'var(--toggle-dot)',
      },
    },
  },
  plugins: [],
}
