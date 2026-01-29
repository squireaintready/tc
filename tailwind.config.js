/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
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
        },
        glow: {
          green: 'var(--green)',
          red: 'var(--red)',
          amber: 'var(--amber)',
        },
        t: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
    },
  },
  plugins: [],
}
