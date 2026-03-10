import { useState, useEffect, useRef } from 'react'
import Results from './Results'
import { calculateTips } from '../utils/calculateTips'
import { useStaffContext } from '../StaffContext'
import { getServers, getBusboys, getTrainees, getOthers } from '../staff'
import { useTheme } from '../ThemeContext'

function Toggle({ on, onToggle, small }) {
  const w = small ? 'w-10 h-6' : 'w-12 h-7'
  const dot = small ? 'w-5 h-5' : 'w-6 h-6'
  const move = small ? 'translate-x-4' : 'translate-x-5'
  return (
    <div
      onClick={onToggle}
      className={`${w} rounded-full relative cursor-pointer transition-all duration-300 shrink-0`}
      style={{
        background: on ? 'var(--accent)' : 'var(--toggle-bg)',
        boxShadow: on ? `0 0 10px var(--accent-glow)` : 'none',
      }}
    >
      <div
        className={`absolute top-0.5 ${dot} rounded-full shadow-md transition-transform duration-300 ${
          on ? move : 'translate-x-0.5'
        }`}
        style={{ background: 'var(--toggle-dot)' }}
      />
    </div>
  )
}

function StaffRow({ name, enabled, onToggle, badge, badgeColor, detail, children }) {
  return (
    <div className="py-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="transition-colors duration-200" style={{ color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          <span className="font-medium">{name}</span>
          {badge && (
            <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-bold uppercase"
              style={{ background: `color-mix(in srgb, ${badgeColor} 20%, transparent)`, color: badgeColor }}>
              {badge}
            </span>
          )}
          {detail && <span className="text-sm ml-1.5" style={{ color: 'var(--text-secondary)' }}>{detail}</span>}
        </span>
        <Toggle on={enabled} onToggle={onToggle} />
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${enabled ? 'max-h-16 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}

export default function Calculator({ onSaveHistory, history }) {
  const { theme } = useTheme()
  const { staff } = useStaffContext()
  const [totalTips, setTotalTips] = useState('')
  const [enabledStaff, setEnabledStaff] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tc-enabled-staff')) || {} } catch { return {} }
  })
  const [traineePercents, setTraineePercents] = useState({})
  const [modifierToggles, setModifierToggles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tc-modifier-toggles')) || {} } catch { return {} }
  })
  const [pastryBusboy, setPastryBusboy] = useState(() => {
    try { return localStorage.getItem('tc-pastry-busboy') || null } catch { return null }
  })
  const [breakdown, setBreakdown] = useState([])
  const [remainder, setRemainder] = useState(0)
  const [showLoadSetup, setShowLoadSetup] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [calcFlash, setCalcFlash] = useState(false)
  const resultsRef = useRef(null)
  const tipsInputRef = useRef(null)
  const [splitMode, setSplitMode] = useState(() => {
    try { return localStorage.getItem('tc-split-mode') || 'none' } catch { return 'none' }
  })

  // #2: Persist staff selection to localStorage
  useEffect(() => {
    try { localStorage.setItem('tc-enabled-staff', JSON.stringify(enabledStaff)) } catch {}
  }, [enabledStaff])
  useEffect(() => {
    try { localStorage.setItem('tc-modifier-toggles', JSON.stringify(modifierToggles)) } catch {}
  }, [modifierToggles])
  useEffect(() => {
    try { localStorage.setItem('tc-pastry-busboy', pastryBusboy || '') } catch {}
  }, [pastryBusboy])
  useEffect(() => {
    try { localStorage.setItem('tc-split-mode', splitMode) } catch {}
  }, [splitMode])

  // #8: Auto-focus tips input on mount
  useEffect(() => {
    tipsInputRef.current?.focus()
  }, [])

  const servers = getServers(staff)
  const trainees = getTrainees(staff)
  const busboys = getBusboys(staff)
  const others = getOthers(staff)
  // Full servers (100%), sub-100% servers treated as trainees
  const fullServers = servers.filter(s => !s.modifiers?.altPercentage && s.percentage >= 100)
  const subServers = servers.filter(s => !s.modifiers?.altPercentage && s.percentage < 100)
  const allTrainees = [...trainees, ...subServers]
  // Modifier servers (e.g. Paola) rendered in Busboys section
  const modifierServers = servers.filter(s => s.modifiers?.altPercentage)

  // Initialize trainee percents for all trainees (including sub-100% servers)
  useEffect(() => {
    setTraineePercents(prev => {
      const updated = { ...prev }
      for (const t of allTrainees) {
        if (updated[t.id] == null) updated[t.id] = t.percentage
      }
      return updated
    })
  }, [staff])

  const cycleSplitMode = () => {
    if (splitMode === 'none') setSplitMode('lunch')
    else if (splitMode === 'lunch') setSplitMode('dinner')
    else setSplitMode('none')
  }

  const formatStaffNames = (enabledStaffObj) => {
    const enabledIds = Object.entries(enabledStaffObj || {}).filter(([, v]) => v).map(([k]) => k)
    const idToName = {}
    for (const s of staff) idToName[s.id] = s.name
    const sortOrder = staff.map(s => s.id)
    const sorted = enabledIds.sort((a, b) => {
      const aIndex = sortOrder.indexOf(a)
      const bIndex = sortOrder.indexOf(b)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
    return sorted.map(id => idToName[id] || id.charAt(0).toUpperCase() + id.slice(1)).join(', ')
  }

  const loadSetup = (h) => {
    setSplitMode(h.shift || 'none')
    setTotalTips('')
    setEnabledStaff(h.enabledStaff || {})

    // Load trainee percents (backward compat: old davidPercent → traineePercents)
    if (h.traineePercents) {
      setTraineePercents(h.traineePercents)
    } else {
      const tp = {}
      for (const t of trainees) tp[t.id] = t.percentage
      if (h.davidPercent != null) tp['david'] = h.davidPercent
      setTraineePercents(tp)
    }

    // Load modifier toggles (backward compat: old paolaUdon → modifierToggles)
    if (h.modifierToggles) {
      setModifierToggles(h.modifierToggles)
    } else {
      const mt = {}
      if (h.paolaUdon) mt['paola'] = true
      setModifierToggles(mt)
    }

    setPastryBusboy(h.pastryBusboy || null)
    setBreakdown([])
    setRemainder(0)
    setShowLoadSetup(false)
    setShowAllHistory(false)
  }

  const toggle = (id) => setEnabledStaff(prev => ({ ...prev, [id]: !prev[id] }))

  const toggleAllServers = () => {
    const allOn = fullServers.every(s => enabledStaff[s.id])
    setEnabledStaff(prev => {
      const updated = { ...prev }
      for (const s of fullServers) updated[s.id] = !allOn
      return updated
    })
  }

  const buildStaffArray = () => {
    const result = []
    const shift = splitMode !== 'none' ? splitMode : null

    for (const s of fullServers) {
      if (!enabledStaff[s.id]) continue
      result.push(shift ? { ...s, shift } : { ...s })
    }

    for (const t of allTrainees) {
      if (!enabledStaff[t.id]) continue
      const pct = traineePercents[t.id] ?? t.percentage
      result.push(shift ? { ...t, percentage: pct, shift } : { ...t, percentage: pct })
    }

    for (const s of modifierServers) {
      if (!enabledStaff[s.id]) continue
      const toggled = modifierToggles[s.id]
      const pct = toggled ? s.modifiers.altPercentage : s.percentage
      result.push(shift ? { ...s, percentage: pct, role: 'modifier', shift } : { ...s, percentage: pct, role: 'modifier' })
    }

    for (const b of busboys) {
      if (!enabledStaff[b.id]) continue
      const isPastry = pastryBusboy === b.id
      const busboy = isPastry ? { ...b, percentage: 20, name: `${b.name} (Pastry)` } : { ...b }
      result.push(shift ? { ...busboy, shift } : busboy)
    }

    for (const o of others) {
      if (!enabledStaff[o.id]) continue
      result.push(shift ? { ...o, shift } : { ...o })
    }

    return result
  }

  const calculate = () => {
    const tips = parseFloat(totalTips)
    if (!tips || tips <= 0) return
    const staffArr = buildStaffArray()
    if (!staffArr.length) return
    const result = calculateTips(tips, staffArr)
    setBreakdown(result.breakdown)
    setRemainder(result.remainder)

    setCalcFlash(true)
    setTimeout(() => setCalcFlash(false), 600)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleSave = (dateISO) => {
    const entry = {
      date: dateISO,
      totalTips: parseFloat(totalTips),
      remainder,
      breakdown: breakdown.map(g => ({ label: g.label, role: g.role, percentage: g.percentage, count: g.count, perPerson: g.perPerson, groupTotal: g.groupTotal })),
      enabledStaff: { ...enabledStaff },
      traineePercents: { ...traineePercents },
      modifierToggles: { ...modifierToggles },
      pastryBusboy,
    }

    if (splitMode !== 'none') {
      entry.shift = splitMode
    }

    onSaveHistory(entry)
  }

  const enabledCount = Object.values(enabledStaff).filter(Boolean).length
  const isFun = theme === 'fun'
  const canCalculate = parseFloat(totalTips) > 0 && enabledCount > 0

  return (
    <div className="space-y-4">
      {/* Load from history */}
      {history && history.length > 0 && (
        <div>
          <button
            onClick={() => setShowLoadSetup(!showLoadSetup)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)', color: 'var(--accent-light)' }}
          >
            {showLoadSetup ? 'Hide' : 'Load History'}
            <svg className={`w-4 h-4 transition-transform duration-200 ${showLoadSetup ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${showLoadSetup ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="fun-card rounded-2xl border overflow-hidden divide-y"
              style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)', maxHeight: '350px', overflowY: 'auto' }}>
              {(showAllHistory ? history : history.slice(0, 10)).map((h) => (
                <button
                  key={h.id}
                  onClick={() => loadSetup(h)}
                  className="w-full px-4 py-3 text-left transition-colors active:opacity-70"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatStaffNames(h.enabledStaff)}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              ))}
              {!showAllHistory && history.length > 10 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAllHistory(true) }}
                  className="w-full px-4 py-2.5 text-center text-xs font-semibold transition-colors"
                  style={{ color: 'var(--accent-light)', borderColor: 'var(--border)' }}
                >
                  Show {history.length - 10} more
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Total tips input */}
      <div className="fun-card rounded-2xl border p-5 transition-all duration-400"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Total Tips
            {splitMode === 'lunch' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5" style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>LUNCH</span>}
            {splitMode === 'dinner' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5" style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>DINNER</span>}
          </label>
          <button
            onClick={cycleSplitMode}
            className="p-1.5 rounded-lg border transition-all hover:opacity-80"
            style={{ opacity: 0.5, color: 'var(--amber)', borderColor: 'color-mix(in srgb, var(--amber) 30%, transparent)' }}
            title="Cycle shift: None → Lunch → Dinner"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold"
            style={{ color: 'color-mix(in srgb, var(--accent-light) 50%, transparent)' }}>$</span>
          <input
            ref={tipsInputRef}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={totalTips}
            onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setTotalTips(v) }}
            onKeyDown={e => { if (e.key === 'Enter') calculate() }}
            placeholder="0"
            className={`w-full pl-12 pr-4 py-4 text-4xl font-bold rounded-xl border transition-all duration-200 focus:outline-none ${isFun ? 'fun-float' : ''}`}
            style={{
              background: 'var(--input-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = `0 0 0 2px var(--accent-glow)` }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      </div>

      {/* Servers card (full servers + trainees below divider) */}
      <div className="fun-card rounded-2xl border overflow-hidden transition-all duration-400"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Servers
          </h3>
          <button
            onClick={toggleAllServers}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all active:scale-95"
            style={{ color: 'var(--accent-light)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
          >
            {fullServers.every(s => enabledStaff[s.id]) ? 'None' : 'All'}
          </button>
        </div>
        <div className="px-4 pb-2">
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {fullServers.map(s => (
              <StaffRow key={s.id} name={s.name} enabled={!!enabledStaff[s.id]} onToggle={() => toggle(s.id)} />
            ))}
          </div>
          {allTrainees.length > 0 && (
            <>
              <div className="my-1 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Trainees</span>
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {allTrainees.map(t => (
                  <StaffRow
                    key={t.id} name={t.name} enabled={!!enabledStaff[t.id]} onToggle={() => toggle(t.id)}
                    badge="Trainee" badgeColor="var(--amber)" detail={`${traineePercents[t.id] ?? t.percentage}%`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tip %</span>
                      <select value={traineePercents[t.id] ?? t.percentage}
                        onChange={e => setTraineePercents(prev => ({ ...prev, [t.id]: Number(e.target.value) }))}
                        className="rounded-lg px-2 py-1 text-sm border focus:outline-none"
                        style={{ background: 'var(--surface-lighter)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                        {[50, 60, 70, 80, 90, 100].map(p => <option key={p} value={p}>{p}%</option>)}
                      </select>
                    </div>
                  </StaffRow>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bussers card (modifier servers + busboys + other, with dividers) */}
      {(modifierServers.length > 0 || busboys.length > 0 || others.length > 0) && (
        <div className="fun-card rounded-2xl border overflow-hidden transition-all duration-400"
          style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Bussers
            </h3>
          </div>
          <div className="px-4 pb-2">
            {modifierServers.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {modifierServers.map(s => (
                  <StaffRow
                    key={s.id} name={s.name} enabled={!!enabledStaff[s.id]} onToggle={() => toggle(s.id)}
                    detail={modifierToggles[s.id] ? `${s.modifiers.altPercentage}%` : `${s.percentage}%`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.modifiers.altLabel} ({s.modifiers.altPercentage}%)</span>
                      <Toggle small on={!!modifierToggles[s.id]} onToggle={() => setModifierToggles(prev => ({ ...prev, [s.id]: !prev[s.id] }))} />
                    </div>
                  </StaffRow>
                ))}
              </div>
            )}
            {busboys.length > 0 && modifierServers.length > 0 && (
              <div className="my-1 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Busboys</span>
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
              </div>
            )}
            {busboys.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {busboys.map(b => (
                  <StaffRow
                    key={b.id} name={b.name} enabled={!!enabledStaff[b.id]} onToggle={() => toggle(b.id)}
                    badge={pastryBusboy === b.id ? 'Pastry' : null} badgeColor="var(--amber)"
                    detail={pastryBusboy === b.id ? '20%' : `${b.percentage}%`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pastry (20%)</span>
                      <Toggle small on={pastryBusboy === b.id} onToggle={() => setPastryBusboy(pastryBusboy === b.id ? null : b.id)} />
                    </div>
                  </StaffRow>
                ))}
              </div>
            )}
            {others.length > 0 && (busboys.length > 0 || modifierServers.length > 0) && (
              <div className="my-1 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Other</span>
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
              </div>
            )}
            {others.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {others.map(o => (
                  <StaffRow key={o.id} name={o.name} enabled={!!enabledStaff[o.id]} onToggle={() => toggle(o.id)}
                    detail={`${o.percentage}%`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={calculate}
        disabled={!canCalculate}
        className={`w-full py-4 active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100 rounded-2xl font-bold text-xl transition-all duration-200 ${isFun ? 'fun-glow-btn' : ''}`}
        style={{
          background: calcFlash ? 'var(--green)' : 'var(--accent)',
          color: 'var(--btn-text)',
          boxShadow: calcFlash ? `0 4px 30px var(--green)` : `0 4px 20px var(--accent-glow)`,
          transform: calcFlash ? 'scale(1.02)' : undefined,
        }}
      >
        {calcFlash ? '✓' : 'Calculate'}
      </button>

      <div ref={resultsRef}>
        <Results breakdown={breakdown} remainder={remainder} totalTips={parseFloat(totalTips) || 0}
          onBreakdownChange={setBreakdown} onRemainderChange={setRemainder} onSave={handleSave} />
      </div>
    </div>
  )
}
