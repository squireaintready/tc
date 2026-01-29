import { useState } from 'react'
import { useTheme } from '../ThemeContext'

export default function Results({ breakdown, remainder, totalTips, onBreakdownChange, onRemainderChange, onSave }) {
  if (!breakdown.length) return null
  const { theme } = useTheme()
  const isFun = theme === 'fun'
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const adjustGroup = (index, delta) => {
    const updated = breakdown.map((g, i) => {
      if (i !== index) return g
      const newPerPerson = g.perPerson + delta
      if (newPerPerson < 0) return g
      return { ...g, perPerson: newPerPerson, groupTotal: newPerPerson * g.count }
    })
    const newDistributed = updated.reduce((s, g) => s + g.groupTotal, 0)
    onBreakdownChange(updated)
    onRemainderChange(totalTips - newDistributed)
  }

  const displayTotal = breakdown.reduce((s, g) => s + g.groupTotal, 0) + remainder
  const match = displayTotal === totalTips

  return (
    <div className="mt-2 space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'var(--text-secondary)' }}>
        {isFun ? '🎯 Breakdown' : 'Breakdown'}
      </h2>

      <div className="fun-card rounded-2xl border overflow-hidden divide-y"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        {breakdown.map((g, i) => (
          <div key={i} className="px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {g.label}
                </span>
                {g.count > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                    style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>
                    ×{g.count}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{g.percentage}%</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className={`text-xl font-bold tabular-nums ${isFun ? 'fun-amount' : ''}`}
                  style={{ color: isFun ? undefined : 'var(--green)' }}>
                  ${g.perPerson}
                </span>
                {g.count > 1 && (
                  <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>ea</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => adjustGroup(i, -1)}
                className="px-3 py-1 rounded-lg border text-xs font-bold active:scale-95 transition-all"
                style={{ background: 'var(--surface-lighter)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >-$1</button>
              <button
                onClick={() => adjustGroup(i, 1)}
                className="px-3 py-1 rounded-lg border text-xs font-bold active:scale-95 transition-all"
                style={{ background: 'var(--surface-lighter)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >+$1</button>
              {g.count > 1 && (
                <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
                  (${g.groupTotal} total)
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Support total (everyone except servers) */}
        {(() => {
          const supportTotal = breakdown.filter(g => g.role !== 'server').reduce((s, g) => s + g.groupTotal, 0)
          if (supportTotal <= 0) return null
          return (
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)', borderTopWidth: '2px', borderTopColor: 'var(--text-secondary)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Total</span>
              <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--green)' }}>
                ${supportTotal}
              </span>
            </div>
          )
        })()}

        {/* Remainder row */}
        {remainder !== 0 && (
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="font-medium" style={{ color: 'var(--amber)' }}>Remainder</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--amber)' }}>
              ${remainder}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-1">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: match ? 'var(--green)' : 'var(--red)' }}>
          ${displayTotal} / ${totalTips}
        </span>
      </div>

      <button
        onClick={handleSave}
        disabled={saved}
        className={`w-full py-3.5 active:scale-[0.98] rounded-2xl font-bold text-lg transition-all duration-300 border ${isFun && !saved ? 'fun-glow-btn' : ''}`}
        style={{
          background: saved ? 'var(--green)' : 'color-mix(in srgb, var(--green) 15%, transparent)',
          borderColor: saved ? 'var(--green)' : 'color-mix(in srgb, var(--green) 30%, transparent)',
          color: saved ? 'var(--btn-text)' : 'var(--green)',
          transform: saved ? 'scale(1.02)' : undefined,
          boxShadow: saved ? '0 4px 30px var(--green)' : undefined,
        }}
      >
        {saved ? '✓ Saved!' : (isFun ? '💾 Save to History' : 'Save to History')}
      </button>
    </div>
  )
}
