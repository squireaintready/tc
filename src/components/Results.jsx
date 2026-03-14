import { useState } from 'react'

export default function Results({ breakdown, remainder, totalTips, onBreakdownChange, onRemainderChange, onSave }) {
  if (!breakdown.length) return null
  const [saved, setSaved] = useState(false)
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
    <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Breakdown</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: match ? 'var(--green)' : 'var(--red)' }}>
          ${displayTotal} / ${totalTips}
        </span>
      </div>

      {/* Rows */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-lighter)' }}>
        {(() => {
          let rowIdx = 0
          const rows = []
          const serversTotal = breakdown.filter(g => g.role === 'server' || g.role === 'trainee')
            .reduce((s, g) => s + g.groupTotal, 0)

          for (let i = 0; i < breakdown.length; i++) {
            const g = breakdown[i]
            const bg = rowIdx % 2 === 1 ? 'var(--surface-light)' : undefined
            rows.push(
              <div key={i} className="px-3 py-2 flex items-center justify-between" style={{ background: bg }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.label}</span>
                  {g.count > 1 && <span className="text-sm font-bold" style={{ color: 'var(--accent-light)' }}>x{g.count}</span>}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{g.percentage}%</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => adjustGroup(i, -1)}
                    className="w-5 h-5 rounded flex items-center justify-center active:scale-95 transition-all"
                    style={{ background: 'var(--surface-light)', color: 'var(--text-secondary)' }}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14" /></svg>
                  </button>
                  <span className="text-sm font-bold tabular-nums min-w-[3rem] text-right" style={{ color: 'var(--green)' }}>
                    ${g.perPerson}
                  </span>
                  <button onClick={() => adjustGroup(i, 1)}
                    className="w-5 h-5 rounded flex items-center justify-center active:scale-95 transition-all"
                    style={{ background: 'var(--surface-light)', color: 'var(--text-secondary)' }}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14M12 5v14" /></svg>
                  </button>
                </div>
              </div>
            )
            rowIdx++
          }
          if (serversTotal > 0) {
            const bg = rowIdx % 2 === 1 ? 'var(--surface-light)' : undefined
            rows.push(
              <div key="servers-total" className="px-3 py-2 flex items-center justify-between" style={{ background: bg }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Servers Total</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--green)' }}>${serversTotal}</span>
              </div>
            )
            rowIdx++
          }
          if (bussersTotal > 0) {
            const bg = rowIdx % 2 === 1 ? 'var(--surface-light)' : undefined
            rows.push(
              <div key="bussers-total" className="px-3 py-2 flex items-center justify-between" style={{ background: bg }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bussers Total</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--green)' }}>${bussersTotal}</span>
              </div>
            )
            rowIdx++
          }
          if (remainder !== 0) {
            const bg = rowIdx % 2 === 1 ? 'var(--surface-light)' : undefined
            rows.push(
              <div key="remainder" className="px-3 py-2 flex items-center justify-between" style={{ background: bg }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>Remainder</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--amber)' }}>${remainder}</span>
              </div>
            )
          }
          return rows
        })()}
      </div>

      {/* Date picker */}
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
        style={{ background: 'var(--surface-lighter)', color: 'var(--text-secondary)' }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </button>
      {showDatePicker && (
        <input
          type="datetime-local"
          value={selectedDate.toISOString().slice(0, 16)}
          onChange={e => setSelectedDate(new Date(e.target.value))}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}
        />
      )}

      {/* Save button — stays as "Saved" permanently after saving */}
      <button
        onClick={handleSave}
        disabled={saved}
        className="w-full py-2.5 active:scale-[0.98] disabled:active:scale-100 rounded-lg font-bold text-sm transition-all duration-200"
        style={{
          background: saved ? 'var(--green)' : 'color-mix(in srgb, var(--green) 15%, transparent)',
          color: saved ? 'var(--btn-text)' : 'var(--green)',
          opacity: saved ? 0.7 : 1,
        }}
      >
        {saved ? 'Saved' : 'Save to History'}
      </button>
    </div>
  )
}
