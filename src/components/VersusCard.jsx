import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc, increment } from 'firebase/firestore'

// Daily interstitial: cast a vote, see the all-time tally, then on to the numbers.
// Tally lives in settings/versus (already allowed by firestore.rules) so both
// phones share one score; localStorage keeps it working offline.

const CONTENDERS = [
  { key: 'b', src: '/versus-b.jpg', alt: 'Contender on the left' },
  { key: 'a', src: '/versus-a.jpg', alt: 'Contender on the right' },
]

const TALLY_KEY = 'tc-versus-tally'
export const VERSUS_DAY_KEY = 'tc-versus-day'

export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readLocalTally() {
  try {
    const t = JSON.parse(localStorage.getItem(TALLY_KEY))
    return { a: Math.max(0, Number(t?.a) || 0), b: Math.max(0, Number(t?.b) || 0) }
  } catch { return { a: 0, b: 0 } }
}

function verdictLine(picked, tally) {
  const { a, b } = tally
  if (a + b === 1) return 'First vote ever. History has begun.'
  if (a === b) return 'Dead even. The rivalry continues.'
  const leader = a > b ? 'a' : 'b'
  return picked === leader
    ? 'The people agree with you. 👑'
    : 'Bold pick — the polls disagree.'
}

export default function VersusCard({ onDone }) {
  const [tally, setTally] = useState(readLocalTally)
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    try {
      return onSnapshot(doc(db, 'settings', 'versus'), (snap) => {
        if (snap.metadata.fromCache && !snap.exists()) return
        const d = snap.data() || {}
        setTally({ a: Math.max(0, Number(d.a) || 0), b: Math.max(0, Number(d.b) || 0) })
      }, () => {
        if (import.meta.env.DEV) console.warn('Versus tally: using localStorage (Firebase unavailable)')
      })
    } catch {
      if (import.meta.env.DEV) console.warn('Versus tally: using localStorage (Firebase unavailable)')
    }
  }, [])

  const vote = async (key) => {
    if (picked) return
    setPicked(key)
    const next = { ...tally, [key]: tally[key] + 1 }
    setTally(next) // optimistic; snapshot corrects it once the write lands
    try {
      await setDoc(doc(db, 'settings', 'versus'), { [key]: increment(1) }, { merge: true })
    } catch {
      try { localStorage.setItem(TALLY_KEY, JSON.stringify(next)) } catch {}
    }
  }

  const total = tally.a + tally.b
  const pct = (key) => total ? Math.round((tally[key] / total) * 100) : 50
  const leader = tally.a === tally.b ? null : (tally.a > tally.b ? 'a' : 'b')

  return (
    <div className="flex flex-col max-w-lg mx-auto px-5 animate-[fadeIn_0.35s_ease]"
      style={{ height: '100svh', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>

      {/* Header: eyebrow + skip */}
      <div className="shrink-0 flex items-center justify-between">
        <span className="text-app-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Question of the day
        </span>
        <button onClick={onDone}
          className="text-app-sm font-semibold px-3 py-2 -mr-3 rounded-lg active:scale-95 transition-transform"
          style={{ color: 'var(--text-muted)' }}>
          Skip
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-5">
        <h2 className="text-center font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: '26px', lineHeight: 1.15 }}>
          Who&rsquo;s more gay?
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {CONTENDERS.map(({ key, src, alt }) => {
            const isPick = picked === key
            const dimmed = picked && !isPick
            return (
              <button key={key} onClick={() => vote(key)} disabled={!!picked}
                aria-label={picked ? `${alt}: ${pct(key)} percent of votes` : `Vote for the ${alt.toLowerCase()}`}
                className="relative rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97]"
                style={{
                  border: isPick ? '2px solid var(--accent)' : '2px solid var(--border)',
                  opacity: dimmed ? 0.72 : 1,
                  transform: isPick ? 'scale(1.02)' : undefined,
                  boxShadow: isPick ? '0 8px 28px -8px rgba(0,0,0,0.35)' : 'none',
                }}>
                <img src={src} alt={alt} width="480" height="640" decoding="async"
                  className="w-full h-auto block select-none pointer-events-none" draggable="false" />

                {/* Crown for the all-time leader, revealed after voting */}
                {picked && leader === key && (
                  <span aria-hidden="true" className="absolute top-1.5 left-2 text-[30px] animate-[crownDrop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                    style={{ transform: 'rotate(-12deg)', textShadow: '0 2px 6px rgba(0,0,0,0.35)' }}>
                    👑
                  </span>
                )}

                {/* Your-vote chip */}
                {isPick && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full animate-[popIn_0.3s_ease_both]"
                    style={{ background: 'var(--accent-grad)', color: 'var(--btn-text)' }}>
                    Your vote
                  </span>
                )}

                {/* Result overlay */}
                <div className="absolute inset-x-0 bottom-0 pt-10 pb-2.5 px-3 text-left transition-opacity duration-500"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)', opacity: picked ? 1 : 0 }}>
                  <div className="text-white font-bold" style={{ fontSize: '24px', lineHeight: 1 }}>{pct(key)}%</div>
                  <div className="text-white/70 text-app-xs font-medium mt-0.5">{tally[key]} vote{tally[key] === 1 ? '' : 's'}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Poll bar, grows in after the vote */}
        <div aria-hidden="true" className="h-1.5 rounded-full overflow-hidden flex transition-opacity duration-500"
          style={{ background: 'var(--surface-lighter)', opacity: picked ? 1 : 0 }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${picked ? pct('b') : 50}%`, background: 'var(--accent-grad)' }} />
        </div>

        {/* Verdict / hint — fixed height so the reveal doesn't shift layout */}
        <p role="status" className="text-center text-app-sm font-medium h-5" style={{ color: 'var(--text-secondary)' }}>
          {picked ? verdictLine(picked, tally) : 'Tap a face to cast your vote.'}
        </p>
      </div>

      {/* Continue — appears after the vote */}
      <div className="shrink-0 pt-2" style={{ minHeight: 64 }}>
        {picked && (
          <button onClick={onDone}
            className="w-full py-[var(--btn-py)] rounded-xl font-semibold text-app-lg active:scale-[0.98] transition-transform animate-[popIn_0.35s_ease_both]"
            style={{ background: 'var(--accent-grad)', color: 'var(--btn-text)' }}>
            On to the numbers →
          </button>
        )}
      </div>
    </div>
  )
}
