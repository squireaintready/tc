/**
 * Get the tip amount an employee earned from a history entry.
 * Handles both old format (davidPercent/paolaUdon) and new format (traineePercents/modifierToggles).
 */
export function getEmployeePay(entry, employeeId, staffRoster) {
  if (!entry.enabledStaff?.[employeeId]) return null

  const emp = staffRoster.find(s => s.id === employeeId)
  if (!emp) return null

  let effectivePct = emp.percentage

  if (emp.role === 'trainee') {
    // New format: traineePercents map
    if (entry.traineePercents && entry.traineePercents[employeeId] != null) {
      effectivePct = entry.traineePercents[employeeId]
    }
    // Old format: davidPercent (backward compat)
    else if (employeeId === 'david' && entry.davidPercent != null) {
      effectivePct = entry.davidPercent
    }
  } else if (emp.modifiers?.altPercentage != null) {
    // New format: modifierToggles map
    if (entry.modifierToggles && entry.modifierToggles[employeeId]) {
      effectivePct = emp.modifiers.altPercentage
    }
    // Old format: paolaUdon (backward compat)
    else if (employeeId === 'paola' && entry.paolaUdon) {
      effectivePct = emp.modifiers.altPercentage
    }
  } else if (emp.role === 'busboy') {
    if (entry.pastryBusboy === employeeId) {
      effectivePct = 20
    }
  }

  if (effectivePct == null) return null

  const group = entry.breakdown?.find(g => g.percentage === effectivePct)
  return group ? group.perPerson : null
}

export function getStaffById(roster, id) {
  return roster.find(s => s.id === id)
}

export function filterByRole(roster, role) {
  return roster.filter(s => s.role === role && s.active !== false)
}

export function getServers(staff) {
  return filterByRole(staff, 'server')
}

export function getBusboys(staff) {
  return filterByRole(staff, 'busboy')
}

export function getTrainees(staff) {
  return filterByRole(staff, 'trainee')
}

export function getOthers(staff) {
  return filterByRole(staff, 'other')
}
