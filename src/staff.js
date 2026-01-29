// Hardcoded staff roster
export const SERVERS = [
  { id: 'sam', name: 'Sam', percentage: 100, role: 'server' },
  { id: 'andrew', name: 'Andrew', percentage: 100, role: 'server' },
  { id: 'terrance', name: 'Terrance', percentage: 100, role: 'server' },
  { id: 'youngmi', name: 'Youngmi', percentage: 100, role: 'server' },
  { id: 'eddy', name: 'Eddy', percentage: 100, role: 'server' },
  { id: 'ming', name: 'Ming', percentage: 100, role: 'server' },
  { id: 'tom', name: 'Tom', percentage: 100, role: 'server' },
  { id: 'jina', name: 'Jina', percentage: 100, role: 'server' },
  { id: 'janet', name: 'Janet', percentage: 100, role: 'server' },
  { id: 'johnny', name: 'Johnny', percentage: 100, role: 'server' },
]

// David is the trainee — percentage is adjustable
export const TRAINEE = { id: 'david', name: 'David', percentage: 90, role: 'trainee' }

export const BUSBOYS = [
  { id: 'seb', name: 'Seb', percentage: 35, role: 'busboy' },
  { id: 'victor', name: 'Victor', percentage: 30, role: 'busboy' },
  { id: 'alex', name: 'Alex', percentage: 30, role: 'busboy' },
  { id: 'hugo', name: 'Hugo', percentage: 30, role: 'busboy' },
  { id: 'moises', name: 'Moises', percentage: 30, role: 'busboy' },
]

// Paola is a server at 40%, can switch to udon (20%)
export const PAOLA = { id: 'paola', name: 'Paola', percentage: 40, role: 'server' }

// Maria is always udon (20%)
export const MARIA = { id: 'maria', name: 'Maria', percentage: 20, role: 'other' }
