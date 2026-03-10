import { createContext, useContext } from 'react'
import { useStaff } from './hooks/useStaff'

const StaffContext = createContext()

export function StaffProvider({ children }) {
  const staffData = useStaff()
  return (
    <StaffContext.Provider value={staffData}>
      {children}
    </StaffContext.Provider>
  )
}

export function useStaffContext() {
  const ctx = useContext(StaffContext)
  if (!ctx) throw new Error('useStaffContext must be used within StaffProvider')
  return ctx
}
