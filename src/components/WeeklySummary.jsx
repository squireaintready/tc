import { useState, useMemo } from 'react'
import { useTheme } from '../ThemeContext'
import { BUSBOYS, PAOLA, MARIA } from '../staff'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TARGET_EMPLOYEES = [
  ...BUSBOYS.map(b => ({ id: b.id, name: b.name })),
  { id: 'maria', name: 'Maria' },
  { id: 'paola', name: 'Paola' },
]

function getWeekRange(refDate) {
  // Use midnight local time to avoid timezone drift
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  const day = d.getDay() // 0=Sun
  const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0)
  const sat = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6, 23, 59, 59, 999)
  return { start: sun, end: sat }
}

function formatRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

function getEmployeePay(entry, employeeId) {
  if (!entry.enabledStaff?.[employeeId]) return null

  // Determine the effective percentage for this employee in this entry
  let effectivePct
  const busboy = BUSBOYS.find(b => b.id === employeeId)
  if (busboy) {
    effectivePct = entry.pastryBusboy === employeeId ? 20 : busboy.percentage
  } else if (employeeId === 'maria') {
    effectivePct = MARIA.percentage // 20
  } else if (employeeId === 'paola') {
    effectivePct = entry.paolaUdon ? 20 : PAOLA.percentage // 20 or 40
  }

  if (effectivePct == null) return null

  // Find the breakdown group matching this percentage
  const group = entry.breakdown?.find(g => g.percentage === effectivePct)
  return group ? group.perPerson : null
}

export function buildWeeklyGrid(history, weekStart, weekEnd) {
  // Filter entries to this week
  const weekEntries = history.filter(h => {
    const d = new Date(h.date)
    return d >= weekStart && d <= weekEnd
  })

  const grid = {}
  for (const emp of TARGET_EMPLOYEES) {
    grid[emp.id] = { name: emp.name, days: Array(7).fill(null), total: 0 }
  }

  for (const entry of weekEntries) {
    const dayIdx = new Date(entry.date).getDay() // 0=Sun
    for (const emp of TARGET_EMPLOYEES) {
      const pay = getEmployeePay(entry, emp.id)
      if (pay != null) {
        // If multiple entries on same day, sum them
        grid[emp.id].days[dayIdx] = (grid[emp.id].days[dayIdx] || 0) + pay
        grid[emp.id].total += pay
      }
    }
  }

  return grid
}

export function formatGridAsText(grid, weekLabel) {
  const pad = (s, n) => String(s).padStart(n)
  const lines = [`Weekly Tips: ${weekLabel}`, '']
  const header = ['Name    ', ...DAYS.map(d => pad(d, 5)), pad('Total', 6)].join(' ')
  lines.push(header)
  lines.push('-'.repeat(header.length))
  for (const emp of TARGET_EMPLOYEES) {
    const row = grid[emp.id]
    const cells = row.days.map(d => pad(d != null ? `$${d}` : '-', 5))
    lines.push([row.name.padEnd(8), ...cells, pad(`$${row.total}`, 6)].join(' '))
  }
  lines.push('-'.repeat(header.length))
  const dayTotals = DAYS.map((_, di) => {
    const t = TARGET_EMPLOYEES.reduce((s, e) => s + (grid[e.id].days[di] || 0), 0)
    return pad(t > 0 ? `$${t}` : '-', 5)
  })
  const grandTotal = TARGET_EMPLOYEES.reduce((s, e) => s + grid[e.id].total, 0)
  lines.push(['Total   ', ...dayTotals, pad(`$${grandTotal}`, 6)].join(' '))
  return lines.join('\n')
}

export default function WeeklySummary({ history }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun'
  const [weekOffset, setWeekOffset] = useState(0)
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('tc-weekly-email') || '' } catch { return '' }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [shared, setShared] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState('')

  const { start, end } = useMemo(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    return getWeekRange(now)
  }, [weekOffset])

  const weekLabel = formatRange(start, end)
  const grid = useMemo(() => buildWeeklyGrid(history, start, end), [history, start, end])

  const handleShare = async () => {
    const text = formatGridAsText(grid, weekLabel)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Tips: ${weekLabel}`, text })
      } catch {}
    } else {
      await navigator.clipboard?.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const saveEmail = (val) => {
    setEmail(val)
    setEmailSaved(false)
    setEmailError('')
    if (val && !isValidEmail(val)) {
      setEmailError('Invalid email address')
    } else if (val) {
      try { localStorage.setItem('tc-weekly-email', val) } catch {}
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 3000)
    } else {
      try { localStorage.removeItem('tc-weekly-email') } catch {}
    }
  }

  const hasData = TARGET_EMPLOYEES.some(e => grid[e.id].total > 0)

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'var(--text-secondary)' }}>
        {isFun ? '📊 Weekly Summary' : 'Weekly Summary'}
      </h2>

      {/* Week picker */}
      <div className="fun-card rounded-2xl border p-4 flex items-center justify-between"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg active:scale-90 transition-all"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{weekLabel}</div>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs mt-0.5"
              style={{ color: 'var(--accent-light)' }}>
              This week
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg active:scale-90 transition-all"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="fun-card rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider sticky left-0"
                  style={{ color: 'var(--text-secondary)', background: 'var(--surface-flat, var(--surface))' }}>
                  Name
                </th>
                {DAYS.map(d => (
                  <th key={d} className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-center"
                    style={{ color: 'var(--text-secondary)' }}>
                    {d}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-right"
                  style={{ color: 'var(--accent-light)' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {TARGET_EMPLOYEES.map((emp, i) => {
                const row = grid[emp.id]
                return (
                  <tr key={emp.id}
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap sticky left-0"
                      style={{ color: 'var(--text-primary)', background: 'var(--surface-flat, var(--surface))' }}>
                      {row.name}
                    </td>
                    {row.days.map((val, di) => (
                      <td key={di} className="px-2 py-2.5 text-center tabular-nums"
                        style={{ color: val != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {val != null ? `$${val}` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums"
                      style={{ color: row.total > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                      {row.total > 0 ? `$${row.total}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--accent)' }}>
                <td className="px-3 py-2.5 font-bold text-xs uppercase tracking-wider sticky left-0"
                  style={{ color: 'var(--accent-light)', background: 'var(--surface-flat, var(--surface))' }}>
                  Total
                </td>
                {DAYS.map((_, di) => {
                  const dayTotal = TARGET_EMPLOYEES.reduce((sum, emp) => sum + (grid[emp.id].days[di] || 0), 0)
                  return (
                    <td key={di} className="px-2 py-2.5 text-center font-bold tabular-nums"
                      style={{ color: dayTotal > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {dayTotal > 0 ? `$${dayTotal}` : '-'}
                    </td>
                  )
                })}
                {(() => {
                  const grandTotal = TARGET_EMPLOYEES.reduce((sum, emp) => sum + grid[emp.id].total, 0)
                  return (
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums"
                      style={{ color: grandTotal > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                      {grandTotal > 0 ? `$${grandTotal}` : '-'}
                    </td>
                  )
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Share button */}
      <button onClick={handleShare}
        className="w-full py-3.5 active:scale-[0.98] rounded-2xl font-semibold text-base transition-all duration-200"
        style={{
          background: shared ? 'var(--green)' : 'var(--accent)',
          color: 'var(--btn-text)',
          boxShadow: `0 4px 20px var(--accent-glow)`,
        }}>
        {shared ? 'Copied!' : 'Share Weekly Summary'}
      </button>

      {/* Email settings */}
      <button onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Email Settings
        <svg className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${showSettings ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="fun-card rounded-2xl border p-4 space-y-2"
          style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Recipient Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => saveEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none"
            style={{
              background: 'var(--input-bg)',
              borderColor: emailError ? 'var(--red)' : emailSaved ? 'var(--green)' : 'var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => {
              if (!emailError && !emailSaved) {
                e.target.style.borderColor = 'var(--border-focus)'
                e.target.style.boxShadow = `0 0 0 2px var(--accent-glow)`
              }
            }}
            onBlur={e => {
              if (!emailError && !emailSaved) {
                e.target.style.borderColor = 'var(--border)'
              }
              e.target.style.boxShadow = 'none'
            }}
          />
          {emailError && (
            <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{emailError}</p>
          )}
          {emailSaved && (
            <p className="text-xs font-medium" style={{ color: 'var(--green)' }}>
              Saved — weekly summary will be sent to {email}
            </p>
          )}
          {!emailError && !emailSaved && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {email ? `Current: ${email}` : 'Auto-sent every Sunday at 10am EST'}
            </p>
          )}
        </div>
      </div>

      {!hasData && (
        <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          No tip data for this week
        </div>
      )}
    </div>
  )
}
