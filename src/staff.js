// Default staff roster — used as seed data for Firestore staff collection
export const DEFAULT_STAFF = [
  { id: 'sam', name: 'Sam', percentage: 100, role: 'server', order: 0, active: true },
  { id: 'andrew', name: 'Andrew', percentage: 100, role: 'server', order: 1, active: true },
  { id: 'terrance', name: 'Terrance', percentage: 100, role: 'server', order: 2, active: true },
  { id: 'youngmi', name: 'Youngmi', percentage: 100, role: 'server', order: 3, active: true },
  { id: 'eddy', name: 'Eddy', percentage: 100, role: 'server', order: 4, active: true },
  { id: 'ming', name: 'Ming', percentage: 100, role: 'server', order: 5, active: true },
  { id: 'tom', name: 'Tom', percentage: 100, role: 'server', order: 6, active: true },
  { id: 'jina', name: 'Jina', percentage: 100, role: 'server', order: 7, active: true },
  { id: 'janet', name: 'Janet', percentage: 100, role: 'server', order: 8, active: true },
  { id: 'johnny', name: 'Johnny', percentage: 100, role: 'server', order: 9, active: true },
  { id: 'david', name: 'David', percentage: 90, role: 'trainee', order: 10, active: true },
  { id: 'paola', name: 'Paola', percentage: 40, role: 'busboy', order: 11, active: true },
  { id: 'seb', name: 'Seb', percentage: 35, role: 'busboy', order: 12, active: true },
  { id: 'victor', name: 'Victor', percentage: 30, role: 'busboy', order: 13, active: true },
  { id: 'alex', name: 'Alex', percentage: 30, role: 'busboy', order: 14, active: true },
  { id: 'hugo', name: 'Hugo', percentage: 30, role: 'busboy', order: 15, active: true },
  { id: 'moises', name: 'Moises', percentage: 30, role: 'busboy', order: 16, active: true },
  { id: 'paola-udon', name: 'Paola (Udon)', percentage: 20, role: 'other', order: 17, active: true },
  { id: 'maria', name: 'Maria', percentage: 20, role: 'other', order: 18, active: true },
]

export function getServers(staff) {
  return staff.filter(s => s.role === 'server' && s.active !== false).sort((a, b) => a.order - b.order)
}

export function getBusboys(staff) {
  return staff.filter(s => s.role === 'busboy' && s.active !== false).sort((a, b) => a.order - b.order)
}

export function getTrainees(staff) {
  return staff.filter(s => s.role === 'trainee' && s.active !== false).sort((a, b) => a.order - b.order)
}

export function getOthers(staff) {
  return staff.filter(s => s.role === 'other' && s.active !== false).sort((a, b) => a.order - b.order)
}
