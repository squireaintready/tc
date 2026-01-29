import { useState } from 'react'
import { useTheme } from '../ThemeContext'

export default function History({ history, onDelete }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun'
  const [confirmId, setConfirmId] = useState(null)

  const handleDelete = (id) => {
    if (confirmId === id) {
      onDelete(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
      setTimeout(() => setConfirmId(prev => prev === id ? null : prev), 3000)
    }
  }

  if (!history.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider px-1"
          style={{ color: 'var(--text-secondary)' }}>
          {isFun ? '📜 History' : 'History'}
        </h2>
        <div className="fun-card rounded-2xl border px-4 py-12 text-center"
          style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          No saved calculations yet
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'var(--text-secondary)' }}>
        {isFun ? '📜 History' : 'History'}
      </h2>
      <div className="space-y-3">
        {history.map((h) => (
          <div key={h.id} className="fun-card rounded-2xl border overflow-hidden"
            style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className={`text-2xl font-bold tabular-nums ${isFun ? 'fun-rainbow' : ''}`}
                    style={{ color: isFun ? undefined : 'var(--text-primary)' }}>${h.totalTips}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(h.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit'
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95"
                  style={{
                    color: confirmId === h.id ? 'var(--btn-text)' : 'var(--red)',
                    background: confirmId === h.id ? 'var(--red)' : 'transparent',
                    borderColor: confirmId === h.id ? 'var(--red)' : 'color-mix(in srgb, var(--red) 30%, transparent)',
                  }}
                >
                  {confirmId === h.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>

              <div className="divide-y text-sm" style={{ borderColor: 'var(--border)' }}>
                {h.breakdown.map((g, i) => (
                  <div key={i} className="flex justify-between items-center py-2" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {g.label || g.name}
                      {g.count > 1 && <span className="text-xs ml-1" style={{ color: 'var(--accent-light)' }}>×{g.count}</span>}
                      {' '}<span style={{ color: 'var(--text-muted)' }}>{g.percentage}%</span>
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      ${g.perPerson || g.amount}{g.count > 1 ? ' ea' : ''}
                    </span>
                  </div>
                ))}
                {h.remainder > 0 && (
                  <div className="flex justify-between items-center py-2" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--amber)' }}>Remainder</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--amber)' }}>${h.remainder}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
