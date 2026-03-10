export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Convert JS Date.getDay() (0=Sun) to Monday-first index (0=Mon)
export function mondayIndex(jsDay) {
  return (jsDay + 6) % 7
}

export const ROLE_ORDER = { server: 0, trainee: 1, busboy: 2, other: 3 }

export const DEFAULT_PERCENTAGES = {
  server: 100,
  trainee: 90,
  busboy: 30,
  other: 20,
}
