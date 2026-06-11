const SHIFTS = [
  { value: 'none', label: 'All day' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
]

export const SunIcon = ({ className = 'w-3 h-3' }) => (
  <svg className={`${className} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

export const MoonIcon = ({ className = 'w-3 h-3' }) => (
  <svg className={`${className} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
)

/* Full-width segmented control with worded options: All day / Lunch / Dinner */
export default function ShiftSelect({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Shift"
      className="flex items-center gap-0.5 p-0.5 rounded-lg w-full"
      style={{ background: 'var(--surface-lighter)' }}
    >
      {SHIFTS.map(s => {
        const active = (value || 'none') === s.value
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            aria-pressed={active}
            title={s.label}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-app-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-95"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--btn-text)' : 'var(--text-muted)',
            }}
          >
            {s.value === 'lunch' && <SunIcon />}
            {s.value === 'dinner' && <MoonIcon />}
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
