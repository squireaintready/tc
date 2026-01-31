import { useState } from 'react'
import { useTheme } from '../ThemeContext'

export default function History({ history, onDelete, onEdit }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun'
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

  const cycleSplitMode = () => {
    setEditData(prev => {
      const updated = { ...prev }
      if (prev.shift === 'none' || !prev.shift) updated.shift = 'lunch'
      else if (prev.shift === 'lunch') updated.shift = 'dinner'
      else updated.shift = 'none'
      return updated
    })
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
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === h.id ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editData.totalTips}
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) updateEditField('total', v) }}
                          className="flex-1 px-1 py-0 text-2xl font-bold tabular-nums bg-transparent border-0 focus:outline-none"
                          style={{ color: 'var(--accent-light)' }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={cycleSplitMode}
                          className="text-[10px] px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                          style={{ opacity: 0.5, color: 'var(--amber)', borderColor: 'color-mix(in srgb, var(--amber) 30%, transparent)' }}
                          title="Cycle shift: None → Lunch → Dinner"
                        >
                          <svg className="w-3 h-3 inline mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          {editData.shift === 'lunch' ? 'LUNCH' : editData.shift === 'dinner' ? 'DINNER' : 'FULL'}
                        </button>
                        {editData.shift && editData.shift !== 'none' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>
                            {editData.shift === 'lunch' ? '🌤️' : '🌙'}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className={`text-2xl font-bold tabular-nums ${isFun ? 'fun-rainbow' : ''}`}
                      style={{ color: isFun ? undefined : 'var(--text-primary)' }}>
                      ${h.totalTips}
                      {h.shift && h.shift !== 'none' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-2"
                          style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>
                          {h.shift === 'lunch' ? '🌤️ LUNCH' : '🌙 DINNER'}
                        </span>
                      )}
                    </div>
                  )}
                  {editingId === h.id ? (
                    <input
                      type="datetime-local"
                      value={new Date(editData.date).toISOString().slice(0, 16)}
                      onChange={e => updateEditField('date', e.target.value)}
                      className="text-xs px-0 py-0.5 rounded bg-transparent border-0 mt-1 focus:outline-none"
                      style={{ color: 'var(--accent-light)' }}
                    />
                  ) : (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
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
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95"
                          style={{
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                            borderColor: 'var(--border)',
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(h.id)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95"
                        style={{
                          color: confirmEditId === h.id ? 'var(--btn-text)' : (hasChanges(h.id) ? (isFun ? 'color-mix(in srgb, var(--green) 80%, white)' : 'var(--green)') : 'var(--text-secondary)'),
                          background: confirmEditId === h.id ? (isFun ? 'color-mix(in srgb, var(--green) 70%, #000)' : 'var(--green)') : (hasChanges(h.id) ? 'color-mix(in srgb, var(--green) 20%, transparent)' : 'transparent'),
                          borderColor: confirmEditId === h.id ? (isFun ? 'color-mix(in srgb, var(--green) 70%, #000)' : 'var(--green)') : (hasChanges(h.id) ? (isFun ? 'color-mix(in srgb, var(--green) 70%, #000)' : 'var(--green)') : 'var(--border)'),
                        }}
                      >
                        {confirmEditId === h.id ? 'Confirm?' : (hasChanges(h.id) ? 'Save' : 'Done')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(h.id)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95"
                        style={{
                          color: 'var(--accent-light)',
                          background: 'transparent',
                          borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95"
                        style={{
                          color: confirmDeleteId === h.id ? 'var(--btn-text)' : 'var(--red)',
                          background: confirmDeleteId === h.id ? 'var(--red)' : 'transparent',
                          borderColor: confirmDeleteId === h.id ? 'var(--red)' : 'color-mix(in srgb, var(--red) 30%, transparent)',
                        }}
                      >
                        {confirmDeleteId === h.id ? 'Confirm?' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="divide-y text-sm" style={{ borderColor: 'var(--border)' }}>
                {(editingId === h.id ? editData.breakdown : h.breakdown).map((g, i) => (
                  <div key={i} className="flex justify-between items-center py-2" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {g.label || g.name}
                      {g.count > 1 && <span className="text-xs ml-1" style={{ color: 'var(--accent-light)' }}>×{g.count}</span>}
                      {' '}<span style={{ color: 'var(--text-muted)' }}>{g.percentage}%</span>
                    </span>
                    {editingId === h.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={g.perPerson || g.amount}
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) updateEditField(`breakdown-${i}`, v) }}
                          className="w-14 px-0 py-0 text-sm font-semibold text-right bg-transparent border-0 tabular-nums focus:outline-none"
                          style={{ color: 'var(--accent-light)' }}
                        />
                        {g.count > 1 && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>
                            ×{g.count}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          ${g.perPerson || g.amount}
                        </span>
                        {g.count > 1 && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>
                            ×{g.count}
                          </span>
                        )}
                      </div>
                    )}
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
