import { useState, useEffect } from 'react'
import Calculator from './components/Calculator'
import History from './components/History'
import WeeklySummary from './components/WeeklySummary'
import { db } from './firebase'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'
import { useTheme, ThemeToggle } from './ThemeContext'

const TABS = ['Calculator', 'Weekly', 'History']

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

function AppInner({ historyUnlocked, onUnlockHistory }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun'
  const [tab, setTab] = useState('Calculator')
  const [history, setHistory] = useLocalStorage('tc-history', [])
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    try {
      const q = query(collection(db, 'history'), orderBy('createdAt', 'desc'))
      const unsub = onSnapshot(q, (snap) => {
        setFirebaseReady(true)
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }, () => {
        console.warn('Using localStorage (Firebase unavailable)')
      })
      return unsub
    } catch {
      console.warn('Using localStorage (Firebase unavailable)')
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
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <header className="border-b px-5 pt-3 pb-0"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className={`text-lg font-bold tracking-tight ${isFun ? 'fun-rainbow' : ''}`}
            style={{ color: isFun ? undefined : 'var(--text-primary)' }}>
            {isFun ? '🎉 Tips Calculator' : 'Tips Calculator'}
          </h1>
          <ThemeToggle />
        </div>
        <nav className="flex -mx-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 relative`}
              style={{ color: tab === t ? 'var(--accent-light)' : 'var(--text-secondary)' }}
            >
              {t}
              {tab === t && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)', boxShadow: `0 0 8px var(--accent-glow)` }} />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4 pb-8">
        <div style={{ display: tab === 'Calculator' ? 'block' : 'none' }}>
          <Calculator onSaveHistory={saveHistory} history={history} />
        </div>
        <div style={{ display: tab === 'Weekly' ? 'block' : 'none' }}>
          {historyUnlocked
            ? <WeeklySummary history={history} />
            : <HistoryLock onUnlock={onUnlockHistory} />
          }
        </div>
        <div style={{ display: tab === 'History' ? 'block' : 'none' }}>
          {historyUnlocked
            ? <History history={history} onDelete={deleteHistory} onEdit={editHistory} />
            : <HistoryLock onUnlock={onUnlockHistory} />
          }
        </div>
      </main>
    </div>
  )
}

function PasswordGate({ password, onUnlock, title }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (pw === password) {
      onUnlock()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
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
          className="flex-1 px-4 py-3 rounded-xl border focus:outline-none text-lg transition-all duration-200"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = `0 0 0 2px var(--accent-glow)` }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
          autoFocus
        />
        <button type="submit"
          className="px-5 py-3 active:scale-95 rounded-xl font-semibold transition-all duration-150"
          style={{ background: 'var(--accent)', color: 'var(--btn-text)' }}>
          Go
        </button>
      </form>
      <div className="text-sm font-medium transition-all duration-300"
        style={{ color: 'var(--red)', opacity: error ? 1 : 0 }}>
        Wrong password
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
