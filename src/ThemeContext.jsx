import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const THEMES = ['dark', 'light', 'fun']
const THEME_LABELS = { dark: 'Dark', light: 'Light', fun: 'Fun' }
const THEME_ICONS = { dark: '🌙', light: '☀️', fun: '🎉' }

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tc-theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tc-theme', theme)
  }, [theme])

  const cycle = () => {
    const i = THEMES.indexOf(theme)
    setTheme(THEMES[(i + 1) % THEMES.length])
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeToggle() {
  const { theme, cycle } = useTheme()
  const isFun = theme === 'fun'

  return (
    <button
      onClick={cycle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 active:scale-95
        ${isFun ? 'bg-[var(--accent)]/20 text-[var(--accent-light)] fun-float' : 'bg-[var(--surface-lighter)] text-[var(--text-secondary)]'}
        border border-[var(--border)]`}
    >
      <span>{THEME_ICONS[theme]}</span>
      <span>{THEME_LABELS[theme]}</span>
    </button>
  )
}
