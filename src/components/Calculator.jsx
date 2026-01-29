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

  const loadSetup = (h) => {
    setTotalTips(String(h.totalTips))
    setEnabledStaff(h.enabledStaff || {})
    setDavidPercent(h.davidPercent || 90)
    setPaolaUdon(h.paolaUdon || false)
    setPastryBusboy(h.pastryBusboy || null)
    setBreakdown([])
    setRemainder(0)
    setShowLoadSetup(false)
  }

  const toggle = (id) => setEnabledStaff(prev => ({ ...prev, [id]: !prev[id] }))

  const calculate = () => {
    const tips = parseFloat(totalTips)
    if (!tips || tips <= 0) return
    const staff = []
    for (const s of SERVERS) { if (enabledStaff[s.id]) staff.push({ ...s }) }
    for (const b of BUSBOYS) {
      if (!enabledStaff[b.id]) continue
      staff.push(pastryBusboy === b.id ? { ...b, percentage: 20, name: `${b.name} (Pastry)` } : { ...b })
    }
    if (enabledStaff[TRAINEE.id]) staff.push({ ...TRAINEE, percentage: davidPercent })
    if (enabledStaff['paola']) staff.push({ ...PAOLA, percentage: paolaUdon ? 20 : 40 })
    if (enabledStaff['maria']) staff.push({ ...MARIA })
    if (!staff.length) return
    const result = calculateTips(tips, staff)
    setBreakdown(result.breakdown)
    setRemainder(result.remainder)
    setCalcFlash(true)
    setTimeout(() => setCalcFlash(false), 600)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleSave = () => {
    onSaveHistory({
      date: new Date().toISOString(),
      totalTips: parseFloat(totalTips),
      enabledStaff: { ...enabledStaff },
      davidPercent, paolaUdon, pastryBusboy,
      remainder,
      breakdown: breakdown.map(g => ({ label: g.label, role: g.role, percentage: g.percentage, count: g.count, perPerson: g.perPerson, groupTotal: g.groupTotal })),
    })
  }

  const enabledCount = Object.values(enabledStaff).filter(Boolean).length
  const isFun = theme === 'fun'

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
            {showLoadSetup ? 'Hide' : 'Load Previous Setup'}
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
                    <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>${h.totalTips}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {Object.entries(h.enabledStaff || {}).filter(([, v]) => v).map(([k]) => k).join(', ')}
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
        <label className="block text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-secondary)' }}>
          {isFun ? '💰 Total Tips 💰' : 'Total Tips'}
        </label>
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
        disabled={!totalTips || enabledCount === 0}
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
