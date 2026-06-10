import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const THEMES = ['fun', 'light', 'dark', 'retro']
const THEME_LABELS = { dark: 'Dark', light: 'Light', fun: 'Fun', retro: 'Retro' }
const ThemeIcon = ({ theme }) => {
  const cls = "w-3.5 h-3.5"
  if (theme === 'dark') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
  if (theme === 'light') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
  if (theme === 'fun') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tc-theme') || 'fun' } catch { return 'fun' }
  })
  const [density, setDensity] = useState(() => {
    try { return localStorage.getItem('tc-density') || 'default' } catch { return 'default' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tc-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
    try { localStorage.setItem('tc-density', density) } catch {}
  }, [density])

  const cycle = () => {
    const i = THEMES.indexOf(theme)
    setTheme(THEMES[(i + 1) % THEMES.length])
  }

  const toggleDensity = () => setDensity(d => d === 'compact' ? 'default' : 'compact')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle, density, toggleDensity }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeToggle() {
  const { theme, cycle } = useTheme()

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg transition-all duration-300 active:scale-95"
      style={{ color: 'var(--text-muted)' }}
      title={`Theme: ${THEME_LABELS[theme]} (tap to change)`}
      aria-label={`Theme: ${THEME_LABELS[theme]}, tap to change`}
    >
      <ThemeIcon theme={theme} />
    </button>
  )
}

export function DensityToggle() {
  const { density, toggleDensity } = useTheme()
  const compact = density === 'compact'

  return (
    <button
      onClick={toggleDensity}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-app-xs font-semibold transition-all duration-150 active:scale-95"
      style={{ color: 'var(--text-muted)', background: 'var(--surface-lighter)' }}
      title={compact ? 'Switch to normal view' : 'Switch to compact view'}
      aria-pressed={compact}
      aria-label={compact ? 'Compact view on, switch to normal' : 'Normal view on, switch to compact'}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {compact
          ? <path strokeLinecap="round" d="M4 5h16M4 9.5h16M4 14h16M4 18.5h16" />
          : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
      </svg>
      {compact ? 'Compact' : 'Normal'}
    </button>
  )
}
