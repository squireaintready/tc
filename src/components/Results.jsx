import { useState } from 'react'

// datetime-local inputs need a *local* "YYYY-MM-DDTHH:mm" string — toISOString() would shift to UTC
const toLocalInputValue = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function Results({ breakdown, remainder, totalTips, onBreakdownChange, onRemainderChange, onSave }) {
  if (!breakdown.length) return null
  const [saved, setSaved] = useState(false)
  const [activeRow, setActiveRow] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const handleSave = () => {
    onSave(selectedDate.toISOString())
    setSaved(true)
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
  const bussersTotal = breakdown.filter(g =>
    g.role === 'busboy' || g.role === 'other' || g.role === 'modifier'
  ).reduce((s, g) => s + g.groupTotal, 0)

  return (
    <div className="space-y-[var(--gap-section)] animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-app-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Breakdown</span>
          <span className="text-app-sm font-bold tabular-nums" style={{ color: match ? 'var(--green)' : 'var(--red)' }}>
            {match ? '✓ ' : ''}${displayTotal} / ${totalTips}
          </span>
        </div>
        <p className="text-app-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Tap a row to adjust its amount
        </p>
      </div>

      {/* Rows */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-lighter)' }}>
        {(() => {
          let rowIdx = 0
          const rows = []
          for (let i = 0; i < breakdown.length; i++) {
            const g = breakdown[i]
            const bg = rowIdx % 2 === 1 ? 'var(--surface-light)' : undefined
            const isActive = activeRow === i
            rows.push(
              <div key={i} className="px-4 py-[var(--list-py)] flex items-center justify-between cursor-pointer select-none"
                style={{ background: bg }}
                onClick={() => setActiveRow(isActive ? null : i)}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-app-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.label}</span>
                  {g.count > 1 && <span className="text-app-base font-bold shrink-0" style={{ color: 'var(--accent-light)' }}>x{g.count}</span>}
                  <span className="text-app-base shrink-0" style={{ color: 'var(--text-secondary)' }}>{g.percentage}%</span>
                </div>
                <div className="flex items-center shrink-0 ml-2">
                  {isActive && (
                    <button onClick={(e) => { e.stopPropagation(); adjustGroup(i, -1) }}
                      aria-label={`Decrease ${g.label} by $1`}
                      className="w-7 h-7 rounded flex items-center justify-center active:scale-95 transition-all mr-1"
                      style={{ background: 'var(--surface-light)', color: 'var(--text-secondary)' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14" /></svg>
                    </button>
                  )}
                  <span className={`text-app-lg font-bold tabular-nums w-[4.5rem] ${isActive ? 'text-center' : 'text-right'}`} style={{ color: 'var(--green)' }}>
                    ${g.perPerson}
                  </span>
                  {isActive && (
                    <button onClick={(e) => { e.stopPropagation(); adjustGroup(i, 1) }}
                      aria-label={`Increase ${g.label} by $1`}
                      className="w-7 h-7 rounded flex items-center justify-center active:scale-95 transition-all ml-1"
                      style={{ background: 'var(--surface-light)', color: 'var(--text-secondary)' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14M12 5v14" /></svg>
                    </button>
                  )}
                </div>
              </div>
            )
            rowIdx++
          }
          if (bussersTotal > 0) {
            rows.push(
              <div key="bussers-total" className="px-4 py-[var(--list-py)] flex items-center justify-between" style={{ borderTop: '1px solid rgba(128,128,128,0.3)' }}>
                <span className="text-app-base font-semibold" style={{ color: 'var(--text-primary)' }}>Bussers Total</span>
                <span className="text-app-lg font-bold tabular-nums w-[4.5rem] text-right" style={{ color: 'var(--green)' }}>${bussersTotal}</span>
              </div>
            )
            rowIdx++
          }
          if (remainder !== 0) {
            const bg = rowIdx % 2 === 1 ? 'var(--surface-light)' : undefined
            rows.push(
              <div key="remainder" className="px-4 py-[var(--list-py)] flex items-center justify-between" style={{ background: bg }}>
                <span className="text-app-base font-semibold" style={{ color: 'var(--amber)' }}>Remainder</span>
                <span className="text-app-lg font-bold tabular-nums w-[4.5rem] text-right" style={{ color: 'var(--amber)' }}>${remainder}</span>
              </div>
            )
          }
          return rows
        })()}
      </div>

      {/* Date picker */}
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        aria-expanded={showDatePicker}
        className="w-full py-[var(--control-py)] rounded-lg text-app-sm font-medium transition-all flex items-center justify-center gap-1.5"
        style={{ background: 'var(--surface-lighter)', color: 'var(--text-secondary)' }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        <svg className={`w-3 h-3 transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showDatePicker && (
        <input
          type="datetime-local"
          value={toLocalInputValue(selectedDate)}
          onChange={e => { if (e.target.value) setSelectedDate(new Date(e.target.value)) }}
          aria-label="Date and time for this entry"
          className="w-full px-3 py-[var(--control-py)] rounded-lg text-app-base"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}
        />
      )}

      {/* Save button — stays as "Saved" permanently after saving */}
      <button
        onClick={handleSave}
        disabled={saved}
        className="w-full py-[var(--btn-py)] active:scale-[0.98] disabled:active:scale-100 rounded-lg font-bold text-app-lg transition-all duration-200"
        style={{
          background: saved ? 'var(--green)' : 'color-mix(in srgb, var(--green) 15%, transparent)',
          color: saved ? 'var(--btn-text)' : 'var(--green)',
          opacity: saved ? 0.7 : 1,
        }}
      >
        {saved ? '✓ Saved' : 'Save to History'}
      </button>
    </div>
  )
}
