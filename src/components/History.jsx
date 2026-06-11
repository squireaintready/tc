import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import ShiftSelect from './ShiftSelect'

export default function History({ history, onDelete, onEdit }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun' || theme === 'retro'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [confirmEditId, setConfirmEditId] = useState(null)
  const [editData, setEditData] = useState(null)

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000)
    }
  }

  const hasChanges = (id) => {
    if (!editData || editingId !== id) return false
    const entry = history.find(h => h.id === id)
    if (editData.date !== entry.date) return true
    if (editData.totalTips !== entry.totalTips) return true
    if ((editData.shift || 'none') !== (entry.shift || 'none')) return true
    for (let i = 0; i < editData.breakdown.length; i++) {
      if (editData.breakdown[i].perPerson !== entry.breakdown[i].perPerson) return true
    }
    return false
  }

  const handleEdit = (id) => {
    if (confirmEditId === id) {
      // Confirm: save all edits
      onEdit(id, editData)
      setEditingId(null)
      setConfirmEditId(null)
      setEditData(null)
    } else if (editingId === id && hasChanges(id)) {
      // Changes made: show confirm
      setConfirmEditId(id)
      setTimeout(() => setConfirmEditId(prev => prev === id ? null : prev), 3000)
    } else if (editingId === id && !hasChanges(id)) {
      // No changes: exit edit mode
      setEditingId(null)
      setEditData(null)
      setConfirmEditId(null)
    } else {
      // First click: enter edit mode
      const entry = history.find(h => h.id === id)
      setEditingId(id)
      setEditData({
        date: entry.date,
        totalTips: entry.totalTips,
        breakdown: entry.breakdown.map(g => ({ ...g })),
        shift: entry.shift || 'none',
      })
      setConfirmEditId(null)
    }
  }

  const handleCancel = (id) => {
    setEditingId(null)
    setEditData(null)
    setConfirmEditId(null)
  }

  const updateEditField = (field, value) => {
    setEditData(prev => {
      const updated = { ...prev }

      if (field === 'date') {
        updated.date = new Date(value).toISOString()
      } else if (field === 'total') {
        const newTotal = parseFloat(value) || 0
        const ratio = newTotal / prev.totalTips
        updated.totalTips = newTotal
        updated.breakdown = prev.breakdown.map(g => ({
          ...g,
          perPerson: Math.floor(g.perPerson * ratio),
          groupTotal: Math.floor(g.perPerson * ratio) * g.count
        }))
        const newDistributed = updated.breakdown.reduce((s, g) => s + g.groupTotal, 0)
        updated.remainder = newTotal - newDistributed
      } else if (field.startsWith('breakdown-')) {
        const index = parseInt(field.split('-')[1])
        updated.breakdown = [...prev.breakdown]
        const newValue = parseFloat(value) || 0
        updated.breakdown[index] = {
          ...updated.breakdown[index],
          perPerson: newValue,
          groupTotal: newValue * updated.breakdown[index].count
        }
        const newDistributed = updated.breakdown.reduce((s, g) => s + g.groupTotal, 0)
        updated.remainder = prev.totalTips - newDistributed
      }

      return updated
    })
  }

  if (!history.length) {
    return (
      <div className="space-y-[var(--gap-section)]">
        <h2 className="text-app-xs font-semibold uppercase tracking-wider px-1 flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          History
        </h2>
        <div className="rounded-lg px-3 py-12 text-center text-app-base"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-muted)' }}>
          No saved calculations yet — save one from the Calculator tab
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-[var(--gap-section)]">
      <h2 className="text-app-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'var(--text-secondary)' }}>
        History
      </h2>
      <div className="space-y-[var(--gap-section)]">
        {history.map((h) => (
          <div key={h.id} className="rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-lighter)' }}>
            <div className="px-[var(--card-px)] py-[var(--card-py)] space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === h.id ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-app-base font-bold" style={{ color: 'var(--text-primary)' }}>$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editData.totalTips}
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) updateEditField('total', v) }}
                          aria-label="Total tips"
                          className="flex-1 px-1 py-0 text-app-base font-bold tabular-nums bg-transparent border-0 focus:outline-none"
                          style={{ color: 'var(--accent-light)' }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <ShiftSelect value={editData.shift} onChange={(m) => setEditData(prev => ({ ...prev, shift: m }))} />
                      </div>
                    </>
                  ) : (
                    <div className="text-app-lg font-bold tabular-nums"
                      style={{ color: 'var(--text-primary)' }}>
                      ${h.totalTips}
                      {h.shift && h.shift !== 'none' && (
                        <span className="text-app-xs px-1.5 py-0.5 rounded font-bold ml-2 inline-flex items-center gap-0.5 align-middle"
                          style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent-light)' }}>
                          {h.shift === 'lunch'
                            ? <><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>LUNCH</>
                            : <><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>DINNER</>
                          }
                        </span>
                      )}
                    </div>
                  )}
                  {editingId === h.id ? (
                    <input
                      type="datetime-local"
                      value={(() => {
                        const d = new Date(editData.date)
                        const year = d.getFullYear()
                        const month = String(d.getMonth() + 1).padStart(2, '0')
                        const day = String(d.getDate()).padStart(2, '0')
                        const hours = String(d.getHours()).padStart(2, '0')
                        const minutes = String(d.getMinutes()).padStart(2, '0')
                        return `${year}-${month}-${day}T${hours}:${minutes}`
                      })()}
                      onChange={e => updateEditField('date', e.target.value)}
                      aria-label="Date and time"
                      className="text-app-sm px-0 py-0.5 rounded bg-transparent border-0 mt-1 focus:outline-none"
                      style={{ color: 'var(--accent-light)' }}
                    />
                  ) : (
                    <div className="text-app-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(h.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingId === h.id ? (
                    <>
                      {hasChanges(h.id) && (
                        <button
                          onClick={() => handleCancel(h.id)}
                          className="text-app-sm font-medium px-3 py-[var(--chip-py)] rounded-lg transition-all duration-200 active:scale-95"
                          style={{
                            color: 'var(--text-secondary)',
                            background: 'var(--surface-light)',
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(h.id)}
                        className="text-app-sm font-medium px-3 py-[var(--chip-py)] rounded-lg transition-all duration-200 active:scale-95"
                        style={{
                          color: confirmEditId === h.id ? 'var(--btn-text)' : (hasChanges(h.id) ? (isFun ? 'color-mix(in srgb, var(--green) 80%, white)' : 'var(--green)') : 'var(--text-secondary)'),
                          background: confirmEditId === h.id ? (isFun ? 'color-mix(in srgb, var(--green) 70%, #000)' : 'var(--green)') : (hasChanges(h.id) ? 'color-mix(in srgb, var(--green) 20%, transparent)' : 'var(--surface-light)'),
                        }}
                      >
                        {confirmEditId === h.id ? 'Confirm?' : (hasChanges(h.id) ? 'Save' : 'Done')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(h.id)}
                        className="text-app-sm font-medium px-3 py-[var(--chip-py)] rounded-lg transition-all duration-200 active:scale-95"
                        style={{
                          color: 'var(--text-secondary)',
                          background: 'var(--surface-light)',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-app-sm font-medium px-3 py-[var(--chip-py)] rounded-lg transition-all duration-200 active:scale-95"
                        style={{
                          color: confirmDeleteId === h.id ? 'var(--btn-text)' : 'var(--red)',
                          background: confirmDeleteId === h.id ? 'var(--red)' : 'var(--surface-light)',
                        }}
                      >
                        {confirmDeleteId === h.id ? 'Confirm?' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="text-app-base">
                {(editingId === h.id ? editData.breakdown : h.breakdown).map((g, i) => (
                  <div key={i} className="flex justify-between items-center py-[var(--cell-py)]"
                    style={{ background: i % 2 === 1 ? 'var(--surface-light)' : undefined }}>
                    <span className="text-app-base" style={{ color: 'var(--text-primary)' }}>
                      {g.label || g.name}
                      {g.count > 1 && <span className="text-app-sm ml-1 font-bold" style={{ color: 'var(--accent)' }}>×{g.count}</span>}
                      {' '}<span style={{ color: 'var(--text-muted)' }}>{g.percentage}%</span>
                    </span>
                    {editingId === h.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-app-base font-bold" style={{ color: 'var(--text-primary)' }}>$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={g.perPerson || g.amount}
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) updateEditField(`breakdown-${i}`, v) }}
                          aria-label={`Amount for ${g.label || g.name}`}
                          className="w-14 px-0 py-0 text-app-base font-bold text-right bg-transparent border-0 tabular-nums focus:outline-none"
                          style={{ color: 'var(--accent-light)' }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-app-base font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          ${g.perPerson || g.amount}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {(() => {
                  const bd = editingId === h.id ? editData.breakdown : h.breakdown
                  const bt = bd.filter(g => g.role === 'busboy' || g.role === 'other' || g.role === 'modifier')
                    .reduce((s, g) => s + (g.groupTotal || ((g.perPerson || g.amount || 0) * (g.count || 1))), 0)
                  if (bt <= 0) return null
                  return (
                    <div className="flex justify-between items-center py-[var(--cell-py)]"
                      style={{ borderTop: '1px solid rgba(128,128,128,0.3)' }}>
                      <span className="text-app-base font-semibold" style={{ color: 'var(--text-primary)' }}>Bussers Total</span>
                      <span className="text-app-base font-bold tabular-nums" style={{ color: 'var(--green)' }}>${bt}</span>
                    </div>
                  )
                })()}
                {h.remainder > 0 && (
                  <div className="flex justify-between items-center py-[var(--cell-py)]"
                    style={{ borderTop: '1px solid var(--surface-light)' }}>
                    <span className="text-app-base" style={{ color: 'var(--amber)' }}>Remainder</span>
                    <span className="text-app-base font-bold tabular-nums" style={{ color: 'var(--amber)' }}>${h.remainder}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-[var(--cell-py)]"
                  style={{ borderTop: '1px solid var(--surface-light)' }}>
                  <span className="text-app-base font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span className="text-app-base font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>${h.totalTips}</span>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
