import { useState, useEffect } from 'react'
import Calculator from './components/Calculator'
import History from './components/History'
import WeeklySummary from './components/WeeklySummary'
import StaffManager from './components/StaffManager'
import { db } from './firebase'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'
import { useTheme, ThemeToggle } from './ThemeContext'

const TABS = ['Calculator', 'Weekly', 'History', 'Staff']

function useLocalStorage(key, initial) {
  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch { return initial }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data))
  }, [key, data])
  return [data, setData]
}

export default function App() {
  const [siteUnlocked, setSiteUnlocked] = useState(() => {
    try { return localStorage.getItem('tc-site-auth') === 'true' } catch { return false }
  })
  const [historyUnlocked, setHistoryUnlocked] = useState(() => {
    try { return localStorage.getItem('tc-history-auth') === 'true' } catch { return false }
  })

  const unlockSite = () => {
    setSiteUnlocked(true)
    localStorage.setItem('tc-site-auth', 'true')
  }
  const unlockHistory = () => {
    setHistoryUnlocked(true)
    localStorage.setItem('tc-history-auth', 'true')
  }

  if (!siteUnlocked) return <SiteLock onUnlock={unlockSite} />

  return <AppInner historyUnlocked={historyUnlocked} onUnlockHistory={unlockHistory} />
}

function TabIcon({ name, active }) {
  const stroke = active ? 'var(--accent-light)' : 'var(--text-secondary)'
  const props = { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke, strokeWidth: active ? 2.2 : 1.8 }
  switch (name) {
    case 'Calculator': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    case 'Weekly': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    case 'History': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    case 'Staff': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    default: return null
  }
}

function AppInner({ historyUnlocked, onUnlockHistory }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun'
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem('tc-active-tab')
      return TABS.includes(saved) ? saved : 'Calculator'
    } catch { return 'Calculator' }
  })

  useEffect(() => {
    try { localStorage.setItem('tc-active-tab', tab) } catch {}
  }, [tab])
  const [history, setHistory] = useLocalStorage('tc-history', [])
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    try {
      const q = query(collection(db, 'history'), orderBy('createdAt', 'desc'))
      const unsub = onSnapshot(q, (snap) => {
        setFirebaseReady(true)
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }, () => {
        if (import.meta.env.DEV) console.warn('Using localStorage (Firebase unavailable)')
      })
      return unsub
    } catch {
      if (import.meta.env.DEV) console.warn('Using localStorage (Firebase unavailable)')
    }
  }, [])

  const saveHistory = async (entry) => {
    if (firebaseReady) {
      await addDoc(collection(db, 'history'), { ...entry, createdAt: serverTimestamp() })
    } else {
      setHistory(prev => [{ ...entry, id: `local-${Date.now()}` }, ...prev])
    }
  }

  const deleteHistory = async (id) => {
    if (firebaseReady) {
      await deleteDoc(doc(db, 'history', id))
    } else {
      setHistory(prev => prev.filter(h => h.id !== id))
    }
  }

  const editHistory = async (id, updates) => {
    if (firebaseReady) {
      await updateDoc(doc(db, 'history', id), updates)
    } else {
      setHistory(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
    }
  }

  return (
    <div className="flex flex-col max-w-lg mx-auto" style={{ height: '100svh' }}>
      {/* Minimal header */}
      <header className="shrink-0 px-4 py-2 flex items-center justify-between">
        <h1 className={`text-sm font-bold tracking-tight ${isFun ? 'fun-rainbow' : ''}`}
          style={{ color: isFun ? undefined : 'var(--text-primary)' }}>
          Mizumi
        </h1>
        <ThemeToggle />
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0">
        <div className="h-full" style={{ display: tab === 'Calculator' ? 'block' : 'none' }}>
          <Calculator onSaveHistory={saveHistory} history={history} />
        </div>
        <div className="h-full overflow-y-auto p-4 pb-20" style={{ display: tab === 'Weekly' ? 'block' : 'none' }}>
          {historyUnlocked
            ? <WeeklySummary history={history} />
            : <HistoryLock onUnlock={onUnlockHistory} />
          }
        </div>
        <div className="h-full overflow-y-auto p-4 pb-20" style={{ display: tab === 'History' ? 'block' : 'none' }}>
          {historyUnlocked
            ? <History history={history} onDelete={deleteHistory} onEdit={editHistory} />
            : <HistoryLock onUnlock={onUnlockHistory} />
          }
        </div>
        <div className="h-full overflow-y-auto p-4 pb-20" style={{ display: tab === 'Staff' ? 'block' : 'none' }}>
          {historyUnlocked
            ? <StaffManager />
            : <HistoryLock onUnlock={onUnlockHistory} />
          }
        </div>
      </main>

      {/* Bottom tab bar */}
      <nav className="shrink-0 flex" style={{ background: 'var(--surface-flat, var(--surface))', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-[10px] font-semibold transition-all duration-200 relative flex flex-col items-center gap-0.5"
            style={{ color: tab === t ? 'var(--accent-light)' : 'var(--text-secondary)' }}
          >
            {tab === t && (
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: 'var(--accent)' }} />
            )}
            <TabIcon name={t} active={tab === t} />
            {t}
          </button>
        ))}
      </nav>
    </div>
  )
}

function PasswordGate({ password, onUnlock, title }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)

  const submit = (e) => {
    e.preventDefault()
    if (lockSeconds > 0) return
    if (pw === password) {
      onUnlock()
    } else {
      const next = attempts + 1
      setAttempts(next)
      setError(true)
      setTimeout(() => setError(false), 1500)
      if (next >= 5) {
        setAttempts(0)
        setLockSeconds(30)
        const tick = setInterval(() => {
          setLockSeconds(prev => {
            if (prev <= 1) { clearInterval(tick); return 0 }
            return prev - 1
          })
        }, 1000)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 space-y-6"
      style={{ background: 'var(--bg)' }}>
      <div className="w-16 h-16 rounded-full border flex items-center justify-center"
        style={{ background: 'var(--surface-lighter)', borderColor: 'var(--border)' }}>
        <svg className="w-7 h-7" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <form onSubmit={submit} className="flex gap-2 w-full max-w-xs">
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false) }}
          placeholder="Password"
          disabled={lockSeconds > 0}
          className="flex-1 px-4 py-3 rounded-xl border focus:outline-none text-lg transition-all duration-200"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            opacity: lockSeconds > 0 ? 0.5 : 1,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
          autoFocus
        />
        <button type="submit"
          disabled={lockSeconds > 0}
          className="px-5 py-3 active:scale-95 rounded-xl font-semibold transition-all duration-150"
          style={{ background: 'var(--accent)', color: 'var(--btn-text)', opacity: lockSeconds > 0 ? 0.5 : 1 }}>
          {lockSeconds > 0 ? lockSeconds : 'Go'}
        </button>
      </form>
      <div className="text-sm font-medium transition-all duration-300"
        style={{ color: 'var(--red)', opacity: (error || lockSeconds > 0) ? 1 : 0 }}>
        {lockSeconds > 0 ? `Too many attempts. Try again in ${lockSeconds}s` : 'Wrong password'}
      </div>
    </div>
  )
}

function SiteLock({ onUnlock }) {
  return <PasswordGate password={import.meta.env.VITE_SITE_PASSWORD} onUnlock={onUnlock} title="Enter Password" />
}

function HistoryLock({ onUnlock }) {
  return <PasswordGate password={import.meta.env.VITE_HISTORY_PASSWORD} onUnlock={onUnlock} title="History Password" />
}
