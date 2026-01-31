import { useState, useEffect, useRef } from 'react'
import Results from './Results'
import { calculateTips } from '../utils/calculateTips'
import { SERVERS, BUSBOYS, PAOLA, MARIA, TRAINEE } from '../staff'
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

function SectionCard({ title, children }) {
  return (
    <div className="fun-card rounded-2xl border overflow-hidden transition-all duration-400"
      style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
      <div className="px-4 pt-3 pb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      </div>
      <div className="px-4 pb-2 divide-y" style={{ borderColor: 'var(--border)' }}>
        {children}
      </div>
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
  const [totalTips, setTotalTips] = useState('')
  const [enabledStaff, setEnabledStaff] = useState({})
  const [davidPercent, setDavidPercent] = useState(TRAINEE.percentage)
  const [paolaUdon, setPaolaUdon] = useState(false)
  const [pastryBusboy, setPastryBusboy] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [remainder, setRemainder] = useState(0)
  const [showLoadSetup, setShowLoadSetup] = useState(false)
  const [calcFlash, setCalcFlash] = useState(false)
  const resultsRef = useRef(null)
  const [splitMode, setSplitMode] = useState('none') // 'none', 'lunch', 'dinner'

  const cycleSplitMode = () => {
    if (splitMode === 'none') setSplitMode('lunch')
    else if (splitMode === 'lunch') setSplitMode('dinner')
    else setSplitMode('none')
  }

  const formatStaffNames = (enabledStaffObj) => {
    const enabledIds = Object.entries(enabledStaffObj || {}).filter(([, v]) => v).map(([k]) => k)

    // Create a map of id to name
    const idToName = {}
    SERVERS.forEach(s => { idToName[s.id] = s.name })
    idToName[TRAINEE.id] = TRAINEE.name
    idToName[PAOLA.id] = PAOLA.name
    BUSBOYS.forEach(b => { idToName[b.id] = b.name })
    idToName[MARIA.id] = MARIA.name

    // Sort: servers, trainee, paola, busboys, maria
    const sortOrder = [
      ...SERVERS.map(s => s.id),
      TRAINEE.id,
      PAOLA.id,
      ...BUSBOYS.map(b => b.id),
      MARIA.id
    ]

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
    setDavidPercent(h.davidPercent || 90)
    setPaolaUdon(h.paolaUdon || false)
    setPastryBusboy(h.pastryBusboy || null)
    setBreakdown([])
    setRemainder(0)
    setShowLoadSetup(false)
  }

  const toggle = (id) => setEnabledStaff(prev => ({ ...prev, [id]: !prev[id] }))

  const buildStaffArray = (staffConfig, davidPct, paolaUdn, pastryBoy, shift = null) => {
    const staff = []
    for (const s of SERVERS) {
      if (staffConfig[s.id]) staff.push(shift ? { ...s, shift } : { ...s })
    }
    for (const b of BUSBOYS) {
      if (!staffConfig[b.id]) continue
      const busboy = pastryBoy === b.id ? { ...b, percentage: 20, name: `${b.name} (Pastry)` } : { ...b }
      staff.push(shift ? { ...busboy, shift } : busboy)
    }
    if (staffConfig[TRAINEE.id]) {
      staff.push(shift ? { ...TRAINEE, percentage: davidPct, shift } : { ...TRAINEE, percentage: davidPct })
    }
    if (staffConfig['paola']) {
      staff.push(shift ? { ...PAOLA, percentage: paolaUdn ? 20 : 40, shift } : { ...PAOLA, percentage: paolaUdn ? 20 : 40 })
    }
    if (staffConfig['maria']) {
      staff.push(shift ? { ...MARIA, shift } : { ...MARIA })
    }
    return staff
  }

  const mergeBreakdowns = (lunch, dinner) => {
    const byPerson = {}

    for (const item of lunch) {
      const key = item.label
      byPerson[key] = { ...item, shift: 'Lunch' }
    }

    for (const item of dinner) {
      const key = item.label
      if (byPerson[key]) {
        // Person worked both shifts - combine
        byPerson[key].perPerson += item.perPerson
        byPerson[key].groupTotal += item.groupTotal
        byPerson[key].shift = 'Both'
      } else {
        byPerson[key] = { ...item, shift: 'Dinner' }
      }
    }

    return Object.values(byPerson).map(item => ({
      ...item,
      label: item.shift === 'Both' ? item.label : `${item.label} (${item.shift})`
    }))
  }

  const calculate = () => {
    const tips = parseFloat(totalTips)
    if (!tips || tips <= 0) return
    const staff = buildStaffArray(enabledStaff, davidPercent, paolaUdon, pastryBusboy)
    if (!staff.length) return
    const result = calculateTips(tips, staff)
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
      davidPercent,
      paolaUdon,
      pastryBusboy,
    }

    if (splitMode !== 'none') {
      entry.shift = splitMode // 'lunch' or 'dinner'
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
              {history.map((h) => (
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
            </div>
          </div>
        </div>
      )}

      {/* Total tips input */}
      <div className="fun-card rounded-2xl border p-5 transition-all duration-400"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>
            {isFun ? '💰 Total Tips 💰' : 'Total Tips'}
            {splitMode === 'lunch' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>🌤️ LUNCH</span>}
            {splitMode === 'dinner' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>🌙 DINNER</span>}
          </label>
          <button
            onClick={cycleSplitMode}
            className="p-1 rounded transition-opacity hover:opacity-100"
            style={{ opacity: 0.2, color: 'var(--text-secondary)' }}
            title="Cycle shift: None → Lunch → Dinner"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold"
            style={{ color: 'color-mix(in srgb, var(--accent-light) 50%, transparent)' }}>$</span>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={totalTips}
            onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setTotalTips(v) }}
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

      {/* Servers */}
      <SectionCard title={isFun ? '⭐ Servers (100%)' : 'Servers (100%)'}>
        {SERVERS.map(s => (
          <StaffRow key={s.id} name={s.name} enabled={!!enabledStaff[s.id]} onToggle={() => toggle(s.id)} />
        ))}
        <StaffRow
          name="David" enabled={!!enabledStaff['david']} onToggle={() => toggle('david')}
          badge="Trainee" badgeColor="var(--amber)" detail={`${davidPercent}%`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tip %</span>
            <select value={davidPercent} onChange={e => setDavidPercent(Number(e.target.value))}
              className="rounded-lg px-2 py-1 text-sm border focus:outline-none"
              style={{ background: 'var(--surface-lighter)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {[50, 60, 70, 80, 90, 100].map(p => <option key={p} value={p}>{p}%</option>)}
            </select>
          </div>
        </StaffRow>
        <StaffRow
          name="Paola" enabled={!!enabledStaff['paola']} onToggle={() => toggle('paola')}
          detail={paolaUdon ? '20%' : '40%'}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Udon (20%)</span>
            <Toggle small on={paolaUdon} onToggle={() => setPaolaUdon(!paolaUdon)} />
          </div>
        </StaffRow>
      </SectionCard>

      {/* Busboys */}
      <SectionCard title={isFun ? '🧹 Busboys' : 'Busboys'}>
        {BUSBOYS.map(b => (
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
      </SectionCard>

      {/* Other */}
      <SectionCard title={isFun ? '🍜 Other' : 'Other'}>
        <StaffRow name="Maria" enabled={!!enabledStaff['maria']} onToggle={() => toggle('maria')}
          badge="Udon" badgeColor="var(--accent)" detail="20%" />
      </SectionCard>

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
        {calcFlash ? '✓' : (isFun ? '✨ Calculate ✨' : 'Calculate')}
      </button>

      <div ref={resultsRef}>
        <Results breakdown={breakdown} remainder={remainder} totalTips={parseFloat(totalTips) || 0}
          onBreakdownChange={setBreakdown} onRemainderChange={setRemainder} onSave={handleSave} />
      </div>
    </div>
  )
}
