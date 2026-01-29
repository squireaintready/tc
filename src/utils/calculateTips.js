/**
 * Calculate tip distribution, grouped by percentage.
 * Does NOT auto-distribute global remainder — it stays as its own line.
 */
export function calculateTips(totalTips, staff) {
  if (!staff.length || totalTips <= 0) return { breakdown: [], remainder: 0, total: 0 }

  const sumWeights = staff.reduce((s, p) => s + p.percentage / 100, 0)
  const baseShare = totalTips / sumWeights

  // Group by percentage
  const groupMap = {}
  for (const p of staff) {
    const key = p.percentage
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(p)
  }

  const breakdown = Object.entries(groupMap).map(([pct, members]) => {
    const percentage = Number(pct)
    const count = members.length
    const perPerson = Math.floor(baseShare * (percentage / 100))
    const groupTotal = perPerson * count
    const innerRemainder = 0 // no within-group remainder initially since we floor per-person

    // Determine label
    let label
    const roles = [...new Set(members.map(m => m.role))]
    if (count === 1) {
      label = members[0].name
    } else if (roles.every(r => r === 'server')) {
      label = 'Servers'
    } else if (roles.every(r => r === 'busboy')) {
      label = 'Busboys'
    } else {
      label = members.map(m => m.name).join(', ')
    }

    return {
      label,
      percentage,
      count,
      perPerson,
      groupTotal,
      role: roles[0],
    }
  })

  // Sort: servers first, then by percentage descending
  breakdown.sort((a, b) => {
    const roleOrder = { server: 0, trainee: 1, busboy: 2, other: 3 }
    const ra = roleOrder[a.role] ?? 9
    const rb = roleOrder[b.role] ?? 9
    if (ra !== rb) return ra - rb
    return b.percentage - a.percentage
  })

  const distributed = breakdown.reduce((s, g) => s + g.groupTotal, 0)
  const remainder = totalTips - distributed

  return { breakdown, remainder, total: totalTips }
}
