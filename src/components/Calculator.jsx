import { useState, useEffect, useRef } from 'react'
import Results from './Results'
import { calculateTips } from '../utils/calculateTips'
import { useStaffContext } from '../StaffContext'
import { getServers, getBusboys, getTrainees, getOthers } from '../staff'
import { useTheme } from '../ThemeContext'

/* ── Design tokens (keep all sizing here) ── */
const T = {
  label: 'text-xs',        // 12px — section labels, muted meta
  body: 'text-sm',         // 14px — chips, buttons, body copy
  input: 'text-lg',        // 18px — tip input
  gap: 'gap-1.5',          // 6px  — between chips, pills
  sectionGap: 'space-y-3', // 12px — between sections
  pad: 'px-4',             // 16px — page horizontal padding
}

function Toggle({ label, detail, selected, onTap }) {
  return (
    <button
      onClick={onTap}
      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${T.body} font-medium transition-all duration-150 active:scale-95 select-none w-full`}
      style={{
        background: 'var(--surface-lighter)',
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      <span className="truncate">
        {label}{detail && <span className={`ml-1 opacity-70 ${T.label}`}>{detail}</span>}
      </span>
      <div
        className="relative shrink-0 ml-2 rounded-full transition-colors duration-200"
        style={{
          width: 38, height: 22,
          background: selected ? 'var(--accent)' : 'rgba(128,128,128,0.2)',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="absolute rounded-full transition-all duration-200 shadow-sm"
          style={{
            width: 16, height: 16,
            top: 3,
            left: selected ? 19 : 3,
            background: selected ? '#fff' : 'rgba(128,128,128,0.5)',
          }}
        />
      </div>
    </button>
  )
}

function PillOption({ label, active, onTap }) {
  return (
    <button
      onClick={onTap}
      className={`px-2 py-0.5 rounded ${T.label} font-semibold transition-all duration-150 active:scale-95`}
      style={{
        background: active ? 'var(--accent)' : 'var(--surface-lighter)',
        color: active ? 'var(--btn-text)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className={`${T.label} font-semibold uppercase tracking-wider flex items-center gap-1`}
        style={{ color: 'var(--text-secondary)' }}>
        {children}
      </span>
      {right}
    </div>
  )
}

function Divider({ label }) {
  return (
    <div className="my-1.5 flex items-center gap-2">
      <div className="flex-1 h-px" style={{ background: 'var(--surface-lighter)' }} />
      <span className={`${T.label} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--surface-lighter)' }} />
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
  const [showPastry, setShowPastry] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [calcFlash, setCalcFlash] = useState(false)
  const [page, setPage] = useState(0)
  const carouselRef = useRef(null)
  const tipsInputRef = useRef(null)
  const [splitMode, setSplitMode] = useState(() => {
    try { return localStorage.getItem('tc-split-mode') || 'none' } catch { return 'none' }
  })

  // Persist state
  useEffect(() => { try { localStorage.setItem('tc-enabled-staff', JSON.stringify(enabledStaff)) } catch {} }, [enabledStaff])
  useEffect(() => { try { localStorage.setItem('tc-modifier-toggles', JSON.stringify(modifierToggles)) } catch {} }, [modifierToggles])
  useEffect(() => { try { localStorage.setItem('tc-pastry-busboy', pastryBusboy || '') } catch {} }, [pastryBusboy])
  useEffect(() => { try { localStorage.setItem('tc-split-mode', splitMode) } catch {} }, [splitMode])
  useEffect(() => { tipsInputRef.current?.focus() }, [])

  const servers = getServers(staff)
  const trainees = getTrainees(staff)
  const busboys = getBusboys(staff)
  const others = getOthers(staff)
  const fullServers = servers.filter(s => !s.modifiers?.altPercentage && s.percentage >= 100)
  const subServers = servers.filter(s => !s.modifiers?.altPercentage && s.percentage < 100)
  const allTrainees = [...trainees, ...subServers]
  const modifierServers = servers.filter(s => s.modifiers?.altPercentage)

  useEffect(() => {
    setTraineePercents(prev => {
      const updated = { ...prev }
      for (const t of allTrainees) { if (updated[t.id] == null) updated[t.id] = t.percentage }
      return updated
    })
  }, [staff])

  const cycleSplitMode = () => {
    if (splitMode === 'none') setSplitMode('lunch')
    else if (splitMode === 'lunch') setSplitMode('dinner')
    else setSplitMode('none')
  }

  const formatStaffNames = (obj) => {
    const ids = Object.entries(obj || {}).filter(([, v]) => v).map(([k]) => k)
    const nameMap = {}
    for (const s of staff) nameMap[s.id] = s.name
    const order = staff.map(s => s.id)
    return ids
      .sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)))
      .map(id => (nameMap[id] || id).slice(0, 3)).join(', ')
  }

  const loadSetup = (h) => {
    setSplitMode(h.shift || 'none')
    setTotalTips('')
    setEnabledStaff(h.enabledStaff || {})
    if (h.traineePercents) { setTraineePercents(h.traineePercents) }
    else {
      const tp = {}
      for (const t of trainees) tp[t.id] = t.percentage
      if (h.davidPercent != null) tp['david'] = h.davidPercent
      setTraineePercents(tp)
    }
    if (h.modifierToggles) { setModifierToggles(h.modifierToggles) }
    else {
      const mt = {}
      if (h.paolaUdon) mt['paola'] = true
      setModifierToggles(mt)
    }
    setPastryBusboy(h.pastryBusboy || null)
    setBreakdown([])
    setRemainder(0)
    setShowLoadSetup(false)
    setShowAllHistory(false)
    goToPage(0)
  }

  const toggle = (id) => setEnabledStaff(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleAllServers = () => {
    const allOn = fullServers.every(s => enabledStaff[s.id])
    setEnabledStaff(prev => {
      const u = { ...prev }
      for (const s of fullServers) u[s.id] = !allOn
      return u
    })
  }

  const buildStaffArray = () => {
    const result = []
    const shift = splitMode !== 'none' ? splitMode : null
    for (const s of fullServers) { if (enabledStaff[s.id]) result.push(shift ? { ...s, shift } : { ...s }) }
    for (const t of allTrainees) { if (enabledStaff[t.id]) { const p = traineePercents[t.id] ?? t.percentage; result.push(shift ? { ...t, percentage: p, shift } : { ...t, percentage: p }) } }
    for (const s of modifierServers) { if (enabledStaff[s.id]) { const p = modifierToggles[s.id] ? s.modifiers.altPercentage : s.percentage; result.push(shift ? { ...s, percentage: p, role: 'modifier', shift } : { ...s, percentage: p, role: 'modifier' }) } }
    for (const b of busboys) { if (enabledStaff[b.id]) { const isPastry = pastryBusboy === b.id; const bb = isPastry ? { ...b, percentage: 20, name: `${b.name} (Pastry)` } : { ...b }; result.push(shift ? { ...bb, shift } : bb) } }
    for (const o of others) { if (enabledStaff[o.id]) result.push(shift ? { ...o, shift } : { ...o }) }
    return result
  }

  const goToPage = (p) => {
    setPage(p)
    if (carouselRef.current?.children[p]) {
      carouselRef.current.children[p].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    }
  }

  const calculate = () => {
    const tips = parseFloat(totalTips)
    if (!tips || tips <= 0) return
    const arr = buildStaffArray()
    if (!arr.length) return
    const r = calculateTips(tips, arr)
    setBreakdown(r.breakdown)
    setRemainder(r.remainder)
    setCalcFlash(true)
    setTimeout(() => setCalcFlash(false), 600)
    setTimeout(() => goToPage(1), 150)
  }

  const handleSave = (dateISO) => {
    const entry = {
      date: dateISO, totalTips: parseFloat(totalTips), remainder,
      breakdown: breakdown.map(g => ({ label: g.label, role: g.role, percentage: g.percentage, count: g.count, perPerson: g.perPerson, groupTotal: g.groupTotal })),
      enabledStaff: { ...enabledStaff }, traineePercents: { ...traineePercents },
      modifierToggles: { ...modifierToggles }, pastryBusboy,
    }
    if (splitMode !== 'none') entry.shift = splitMode
    onSaveHistory(entry)
  }

  const enabledCount = Object.values(enabledStaff).filter(Boolean).length
  const canCalculate = parseFloat(totalTips) > 0 && enabledCount > 0
  const enabledBusboys = busboys.filter(b => enabledStaff[b.id])
  const hasResults = breakdown.length > 0

  const handleScroll = () => {
    if (!carouselRef.current) return
    const { scrollLeft, offsetWidth } = carouselRef.current
    setPage(scrollLeft > offsetWidth * 0.5 ? 1 : 0)
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Carousel */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Page 1: Input */}
        <div className="snap-start shrink-0 w-full h-full overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehaviorY: 'contain' }}>
          <div className={`${T.pad} py-3 ${T.sectionGap} pb-2`}>
            {/* Page header */}
            <div className={`${T.label} font-semibold uppercase tracking-wider flex items-center gap-1.5`}
              style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Enter total tips
            </div>

            {/* Tips input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${T.input} font-bold z-10`}
                  style={{ color: 'var(--text-secondary)' }}>$</span>
                <input
                  ref={tipsInputRef}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={totalTips}
                  onChange={e => {
                    let v = e.target.value
                    if (v !== '' && !/^\d*\.?\d*$/.test(v)) return
                    // Strip leading zeros (but keep "0." for decimals)
                    if (v.length > 1 && v[0] === '0' && v[1] !== '.') v = v.replace(/^0+/, '') || ''
                    setTotalTips(v)
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') calculate() }}
                  placeholder="0"
                  className={`w-full pl-8 pr-3 py-2 ${T.input} font-bold rounded-lg focus:outline-none `}
                  style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
                  onBlur={e => { e.target.style.borderColor = '' }}
                />
              </div>
              <button
                onClick={cycleSplitMode}
                className={`px-2 py-2 rounded-lg ${T.label} font-medium uppercase tracking-wide transition-all active:scale-95 shrink-0 flex items-center gap-1`}
                style={{
                  color: splitMode !== 'none' ? 'var(--accent-light)' : 'var(--text-muted)',
                  background: splitMode !== 'none' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                }}
              >
                {splitMode === 'lunch' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                {splitMode === 'dinner' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                {splitMode === 'none' ? 'all day' : splitMode}
              </button>
            </div>

            {/* Servers */}
            <div>
              <div className="my-1.5 flex items-center gap-2">
                {history && history.length > 0 && (
                  <button
                    onClick={() => setShowLoadSetup(!showLoadSetup)}
                    className="p-1 rounded transition-all active:scale-90"
                    style={{ color: showLoadSetup ? 'var(--accent-light)' : 'var(--text-muted)' }}
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showLoadSetup ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                <div className="flex-1 h-px" style={{ background: 'var(--surface-lighter)' }} />
                <span className={`${T.label} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-muted)' }}>Servers</span>
                <div className="flex-1 h-px" style={{ background: 'var(--surface-lighter)' }} />
                <button onClick={toggleAllServers}
                  className={`${T.label} font-semibold px-1.5 py-0.5 rounded transition-all active:scale-95`}
                  style={{ color: 'var(--accent-light)' }}>
                  {fullServers.every(s => enabledStaff[s.id]) ? 'None' : 'All'}
                </button>
              </div>
              {history && history.length > 0 && (
                <div className={`overflow-hidden transition-all duration-300 ${showLoadSetup ? 'max-h-[250px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="rounded-lg overflow-hidden mb-1.5" style={{ background: 'var(--surface-lighter)', maxHeight: '220px', overflowY: 'auto' }}>
                    {(showAllHistory ? history : history.slice(0, 10)).map((h) => (
                      <button key={h.id} onClick={() => loadSetup(h)}
                        className={`w-full ${T.pad} py-2 text-left active:opacity-70`}>
                        <div className="flex justify-between items-center">
                          <span className={`${T.label} font-medium truncate mr-2`} style={{ color: 'var(--text-primary)' }}>
                            {formatStaffNames(h.enabledStaff)}
                          </span>
                          <span className={`${T.label} shrink-0`} style={{ color: 'var(--text-muted)' }}>
                            {`${new Date(h.date).getMonth() + 1}/${new Date(h.date).getDate()}`}
                          </span>
                        </div>
                      </button>
                    ))}
                    {!showAllHistory && history.length > 10 && (
                      <button onClick={(e) => { e.stopPropagation(); setShowAllHistory(true) }}
                        className={`w-full ${T.pad} py-1.5 text-center ${T.label} font-semibold`}
                        style={{ color: 'var(--accent-light)' }}>
                        show {history.length - 10} more
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className={`grid grid-cols-2 ${T.gap}`}>
                {fullServers.map(s => <Toggle key={s.id} label={s.name} selected={!!enabledStaff[s.id]} onTap={() => toggle(s.id)} />)}
              </div>
              {allTrainees.length > 0 && (
                <>
                  <Divider label="Trainees" />
                  <div className={`grid grid-cols-2 ${T.gap}`}>
                    {allTrainees.map(t => (
                      <Toggle key={t.id} label={t.name} detail={`${traineePercents[t.id] ?? t.percentage}%`}
                        selected={!!enabledStaff[t.id]} onTap={() => toggle(t.id)} />
                    ))}
                  </div>
                  {allTrainees.filter(t => enabledStaff[t.id]).map(t => (
                    <div key={t.id} className={`mt-1 flex items-center ${T.gap} flex-wrap`}>
                      <span className={`${T.label} font-medium`} style={{ color: 'var(--text-muted)' }}>{t.name}:</span>
                      {[50, 60, 70, 80, 90, 100].map(p => (
                        <PillOption key={p} label={`${p}%`} active={(traineePercents[t.id] ?? t.percentage) === p}
                          onTap={() => setTraineePercents(prev => ({ ...prev, [t.id]: p }))} />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Bussers */}
            {(modifierServers.length > 0 || busboys.length > 0 || others.length > 0) && (
              <div>
                <Divider label="Bussers" />
                {modifierServers.length > 0 && (
                  <>
                    <div className={`grid grid-cols-2 ${T.gap}`}>
                      {modifierServers.map(s => (
                        <Toggle key={s.id} label={s.name}
                          detail={modifierToggles[s.id] ? `${s.modifiers.altPercentage}%` : `${s.percentage}%`}
                          selected={!!enabledStaff[s.id]} onTap={() => toggle(s.id)} />
                      ))}
                    </div>
                    {modifierServers.filter(s => enabledStaff[s.id]).map(s => (
                      <div key={s.id} className="mt-1 pl-2.5">
                        <button
                          onClick={() => setModifierToggles(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                          className={`${T.label} font-medium`}
                          style={{ color: modifierToggles[s.id] ? 'var(--accent-light)' : 'var(--text-secondary)' }}
                        >
                          {modifierToggles[s.id] ? `${s.modifiers.altLabel} ${s.modifiers.altPercentage}%` : s.modifiers.altLabel?.toLowerCase()}
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {busboys.length > 0 && modifierServers.length > 0 && <Divider label="Busboys" />}
                {busboys.length > 0 && (
                  <>
                    <div className={`grid grid-cols-2 ${T.gap}`}>
                      {busboys.map(b => (
                        <Toggle key={b.id} label={b.name}
                          detail={pastryBusboy === b.id ? '20%' : `${b.percentage}%`}
                          selected={!!enabledStaff[b.id]} onTap={() => toggle(b.id)} />
                      ))}
                    </div>
                    {enabledBusboys.length > 0 && (
                      <div className="mt-1 pl-2.5">
                        <button
                          onClick={() => setShowPastry(!showPastry)}
                          className={`${T.label} font-medium flex items-center gap-0.5`}
                          style={{ color: pastryBusboy ? 'var(--accent-light)' : 'var(--text-secondary)' }}
                        >
                          {pastryBusboy ? `Pastry: ${enabledBusboys.find(b => b.id === pastryBusboy)?.name || ''}` : 'pastry'}
                          <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${showPastry ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showPastry && (
                          <div className={`mt-1 flex items-center ${T.gap} flex-wrap`}>
                            {enabledBusboys.map(b => (
                              <PillOption key={b.id} label={b.name} active={pastryBusboy === b.id}
                                onTap={() => { setPastryBusboy(pastryBusboy === b.id ? null : b.id); setShowPastry(false) }} />
                            ))}
                            <PillOption label="None" active={!pastryBusboy || !enabledBusboys.some(b => b.id === pastryBusboy)}
                              onTap={() => { setPastryBusboy(null); setShowPastry(false) }} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {others.length > 0 && (busboys.length > 0 || modifierServers.length > 0) && <Divider label="Other" />}
                {others.length > 0 && (
                  <div className={`grid grid-cols-2 ${T.gap}`}>
                    {others.map(o => (
                      <Toggle key={o.id} label={o.name} detail={`${o.percentage}%`}
                        selected={!!enabledStaff[o.id]} onTap={() => toggle(o.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page 2: Results */}
        <div className="snap-start shrink-0 w-full h-full overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehaviorY: 'contain' }}>
          <div className={`${T.pad} py-3 pb-2`}>
            {hasResults ? (
              <Results breakdown={breakdown} remainder={remainder} totalTips={parseFloat(totalTips) || 0}
                onBreakdownChange={setBreakdown} onRemainderChange={setRemainder} onSave={handleSave} />
            ) : (
              <div className="flex items-center justify-center h-40">
                <span className={T.body} style={{ color: 'var(--text-muted)' }}>No results yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar: dots + button */}
      <div className="shrink-0 relative z-10" style={{ background: 'var(--bg)' }}>
        {/* Page dots */}
        <div className="flex justify-center gap-1.5 py-1.5">
          {[0, 1].map(i => (
            <button key={i} onClick={() => goToPage(i)}
              className="w-1.5 h-1.5 rounded-full transition-all duration-200"
              style={{
                background: page === i ? 'var(--accent-light)' : 'var(--surface-lighter)',
                transform: page === i ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        {/* Action button */}
        <div className={`${T.pad} pb-2`}>
          {page === 0 ? (
            <button
              onClick={calculate}
              disabled={!canCalculate}
              className={`w-full py-3 active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100 rounded-lg font-bold ${T.body} transition-all duration-200`}
              style={{
                background: calcFlash ? 'var(--green)' : 'var(--accent)',
                color: 'var(--btn-text)',
                transform: calcFlash ? 'scale(1.02)' : undefined,
              }}
            >
              {calcFlash ? '✓' : 'Calculate'}
            </button>
          ) : (
            <button
              onClick={() => goToPage(0)}
              className={`w-full py-3 active:scale-[0.98] rounded-lg font-semibold ${T.body} transition-all duration-200`}
              style={{ background: 'var(--surface-lighter)', color: 'var(--text-secondary)' }}
            >
              Back to Calculator
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
