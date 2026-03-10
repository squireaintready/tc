export function getWeekRange(refDate) {
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  const daysSinceMon = (d.getDay() + 6) % 7
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMon, 0, 0, 0, 0)
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6, 23, 59, 59, 999)
  return { start: mon, end: sun }
}

export function formatRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

export function formatEntryDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}
