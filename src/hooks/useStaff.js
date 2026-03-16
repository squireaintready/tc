import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { DEFAULT_STAFF } from '../staff'

const LOCAL_KEY = 'tc-staff'

export function useStaff() {
  const [staff, setStaff] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY)
      if (stored) {
        let data = JSON.parse(stored)
        // Fix: restore Paola as server, remove paola-udon
        data = data.filter(s => s.id !== 'paola-udon').map(s =>
          s.id === 'paola' ? { ...s, role: 'server', modifiers: { altPercentage: 20, altLabel: 'Udon' } } : s
        )
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
        return data
      }
      return DEFAULT_STAFF
    } catch { return DEFAULT_STAFF }
  })
  const [loading, setLoading] = useState(true)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'staff'), async (snap) => {
        if (snap.empty) {
          for (const emp of DEFAULT_STAFF) {
            await setDoc(doc(db, 'staff', emp.id), emp)
          }
          return
        }

        // One-time fix: restore Paola as server w/ modifiers, remove paola-udon
        const paola = snap.docs.find(d => d.id === 'paola')
        if (paola && paola.data().role === 'busboy') {
          await setDoc(doc(db, 'staff', 'paola'), {
            id: 'paola', name: 'Paola', percentage: 40, role: 'server',
            order: 11, active: true, modifiers: { altPercentage: 20, altLabel: 'Udon' }
          })
        }
        if (snap.docs.find(d => d.id === 'paola-udon')) {
          await deleteDoc(doc(db, 'staff', 'paola-udon'))
        }

        // One-time fix: reorder staff to match updated DEFAULT_STAFF order
        const orderMap = { andrew: 0, sam: 1, eddy: 2, youngmi: 3, terrance: 4, ming: 5, jina: 6, tom: 7 }
        for (const d of snap.docs) {
          if (d.id in orderMap && d.data().order !== orderMap[d.id]) {
            await updateDoc(doc(db, 'staff', d.id), { order: orderMap[d.id] })
          }
        }

        const roster = snap.docs
          .filter(d => d.id !== 'paola-udon')
          .map(d => ({ id: d.id, ...d.data() }))
        roster.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
        setStaff(roster)
        setFirebaseReady(true)
        setLoading(false)
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(roster)) } catch {}
      }, () => {
        if (import.meta.env.DEV) console.warn('Staff: using localStorage (Firebase unavailable)')
        setLoading(false)
      })
      return unsub
    } catch {
      if (import.meta.env.DEV) console.warn('Staff: using localStorage (Firebase unavailable)')
      setLoading(false)
    }
  }, [])

  const addEmployee = async (employee) => {
    const maxOrder = staff.reduce((max, s) => Math.max(max, s.order ?? 0), -1)
    const newEmp = { ...employee, order: maxOrder + 1, active: true }
    if (firebaseReady) {
      await setDoc(doc(db, 'staff', newEmp.id), newEmp)
    } else {
      setStaff(prev => {
        const updated = [...prev, newEmp]
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
    }
  }

  const removeEmployee = async (id) => {
    if (firebaseReady) {
      await deleteDoc(doc(db, 'staff', id))
    } else {
      setStaff(prev => {
        const updated = prev.filter(s => s.id !== id)
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
    }
  }

  const updateEmployee = async (id, updates) => {
    if (firebaseReady) {
      await updateDoc(doc(db, 'staff', id), updates)
    } else {
      setStaff(prev => {
        const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s)
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
    }
  }

  const graduateTrainee = async (id) => {
    await updateEmployee(id, { role: 'server', percentage: 100 })
  }

  return { staff, addEmployee, removeEmployee, updateEmployee, graduateTrainee, loading }
}
