import { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { SERVERS, TRAINEE, BUSBOYS, PAOLA, MARIA } from '../staff'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TARGET_EMPLOYEES = [
  ...BUSBOYS.map(b => ({ id: b.id, name: b.name })),
  { id: 'maria', name: 'Maria' },
  { id: 'paola', name: 'Paola' },
]
const ALL_EMPLOYEES = [
  ...SERVERS.map(s => ({ id: s.id, name: s.name })),
  { id: TRAINEE.id, name: TRAINEE.name },
  ...BUSBOYS.map(b => ({ id: b.id, name: b.name })),
  { id: 'paola', name: 'Paola' },
  { id: 'maria', name: 'Maria' },
]

function getWeekRange(refDate) {
  // Use midnight local time to avoid timezone drift
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  const day = d.getDay() // 0=Sun
  const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0)
  const sat = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6, 23, 59, 59, 999)
  return { start: sun, end: sat }
}

function formatRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

function getEmployeePay(entry, employeeId) {
  if (!entry.enabledStaff?.[employeeId]) return null

  // Determine the effective percentage for this employee in this entry
  let effectivePct
  const busboy = BUSBOYS.find(b => b.id === employeeId)
  if (busboy) {
    effectivePct = entry.pastryBusboy === employeeId ? 20 : busboy.percentage
  } else if (employeeId === 'maria') {
    effectivePct = MARIA.percentage // 20
  } else if (employeeId === 'paola') {
    effectivePct = entry.paolaUdon ? 20 : PAOLA.percentage // 20 or 40
  }

  if (effectivePct == null) return null

  // Find the breakdown group matching this percentage
  const group = entry.breakdown?.find(g => g.percentage === effectivePct)
  return group ? group.perPerson : null
}

export function buildWeeklyGrid(history, weekStart, weekEnd) {
  // Filter entries to this week
  const weekEntries = history.filter(h => {
    const d = new Date(h.date)
    return d >= weekStart && d <= weekEnd
  })

  const grid = {}
  for (const emp of TARGET_EMPLOYEES) {
    grid[emp.id] = { name: emp.name, days: Array(7).fill(null), total: 0 }
  }

  for (const entry of weekEntries) {
    const dayIdx = new Date(entry.date).getDay() // 0=Sun
    for (const emp of TARGET_EMPLOYEES) {
      const pay = getEmployeePay(entry, emp.id)
      if (pay != null) {
        // If multiple entries on same day, sum them
        grid[emp.id].days[dayIdx] = (grid[emp.id].days[dayIdx] || 0) + pay
        grid[emp.id].total += pay
      }
    }
  }

  return grid
}

export function formatGridAsText(grid, weekLabel) {
  const pad = (s, n) => String(s).padStart(n)
  const lines = [`Weekly Tips: ${weekLabel}`, '']
  const header = ['Name    ', ...DAYS.map(d => pad(d, 5)), pad('Total', 6)].join(' ')
  lines.push(header)
  lines.push('-'.repeat(header.length))
  for (const emp of TARGET_EMPLOYEES) {
    const row = grid[emp.id]
    const cells = row.days.map(d => pad(d != null ? `$${d}` : '-', 5))
    lines.push([row.name.padEnd(8), ...cells, pad(`$${row.total}`, 6)].join(' '))
  }
  lines.push('-'.repeat(header.length))
  const dayTotals = DAYS.map((_, di) => {
    const t = TARGET_EMPLOYEES.reduce((s, e) => s + (grid[e.id].days[di] || 0), 0)
    return pad(t > 0 ? `$${t}` : '-', 5)
  })
  const grandTotal = TARGET_EMPLOYEES.reduce((s, e) => s + grid[e.id].total, 0)
  lines.push(['Total   ', ...dayTotals, pad(`$${grandTotal}`, 6)].join(' '))
  return lines.join('\n')
}

export default function WeeklySummary({ history }) {
  const { theme } = useTheme()
  const isFun = theme === 'fun'
  const [weekOffset, setWeekOffset] = useState(0)
  const [email, setEmail] = useState('')
  const [emailLoaded, setEmailLoaded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [shared, setShared] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [viewMode, setViewMode] = useState('weekly') // 'weekly' or 'employee'
  const [periodType, setPeriodType] = useState('month') // 'month', 'week', 'custom'
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [searchEmployee, setSearchEmployee] = useState('')
  const [classFilter, setClassFilter] = useState('all') // 'all', 'servers', 'support'

  // Load email from Firestore on mount
  useEffect(() => {
    getDoc(doc(db, 'settings', 'weekly-email'))
      .then(snap => {
        if (snap.exists()) setEmail(snap.data().email || '')
      })
      .catch(() => {
        try { setEmail(localStorage.getItem('tc-weekly-email') || '') } catch {}
      })
      .finally(() => setEmailLoaded(true))
  }, [])

  const { start, end } = useMemo(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    return getWeekRange(now)
  }, [weekOffset])

  const weekLabel = formatRange(start, end)
  const grid = useMemo(() => buildWeeklyGrid(history, start, end), [history, start, end])

  // Employee summary period calculation
  const { summaryStart, summaryEnd, summaryLabel } = useMemo(() => {
    const now = new Date()
    let start, end, label

    if (periodType === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (periodType === 'week') {
      const range = getWeekRange(now)
      start = range.start
      end = range.end
      label = formatRange(start, end)
    } else if (periodType === 'custom' && customStart && customEnd) {
      start = new Date(customStart + 'T00:00:00')
      end = new Date(customEnd + 'T23:59:59')
      label = formatRange(start, end)
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    return { summaryStart: start, summaryEnd: end, summaryLabel: label }
  }, [periodType, customStart, customEnd])

  const employeeSummary = useMemo(() => {
    const periodEntries = history.filter(h => {
      const d = new Date(h.date)
      return d >= summaryStart && d <= summaryEnd
    })

    const summary = {}
    for (const emp of ALL_EMPLOYEES) {
      summary[emp.id] = { name: emp.name, total: 0, count: 0 }
    }

    for (const entry of periodEntries) {
      for (const emp of ALL_EMPLOYEES) {
        const pay = getEmployeePay(entry, emp.id)
        if (pay != null) {
          summary[emp.id].total += pay
          summary[emp.id].count++
        }
      }
    }

    return summary
  }, [history, summaryStart, summaryEnd])

  const handleShareEmployeeSummary = async () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

    // Check if sharing for a specific employee
    if (selectedEmployee !== 'all') {
      const emp = ALL_EMPLOYEES.find(e => e.id === selectedEmployee)
      const empData = employeeSummary[selectedEmployee]

      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${emp.name} - Weekly Calendar`, 40, 40)

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(summaryLabel, 40, 60)

      // Build daily breakdown for this employee
      const periodEntries = history.filter(h => {
        const d = new Date(h.date)
        return d >= summaryStart && d <= summaryEnd
      })

      const dailyPay = {}
      for (const entry of periodEntries) {
        const pay = getEmployeePay(entry, selectedEmployee)
        if (pay != null) {
          const date = new Date(entry.date)
          const dateKey = date.toISOString().split('T')[0]
          dailyPay[dateKey] = (dailyPay[dateKey] || 0) + pay
        }
      }

      // Build weekly grid (Sun-Sat weeks)
      const weeks = []
      let currentDate = new Date(summaryStart)

      while (currentDate <= summaryEnd) {
        // Find Sunday of this week
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())

        // Build 7 days for this week
        const weekDays = []
        let weekTotal = 0
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart)
          day.setDate(weekStart.getDate() + i)

          // Only include if within period
          if (day >= summaryStart && day <= summaryEnd) {
            const dateKey = day.toISOString().split('T')[0]
            const amount = dailyPay[dateKey] || 0
            weekDays.push(amount)
            weekTotal += amount
          } else {
            weekDays.push(null)
          }
        }

        // Add week if it has any data
        if (weekTotal > 0) {
          const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          weeks.push({ label: weekLabel, days: weekDays, total: weekTotal })
        }

        // Move to next week
        currentDate.setDate(currentDate.getDate() + (7 - currentDate.getDay()))
      }

      // Create weekly grid table
      const head = [['Week', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Total']]
      const body = weeks.map(week => [
        week.label,
        ...week.days.map(v => v != null ? (v > 0 ? `$${v}` : '-') : '-'),
        `$${week.total}`
      ])

      // Add totals row
      const dayTotals = []
      for (let i = 0; i < 7; i++) {
        const total = weeks.reduce((sum, week) => sum + (week.days[i] || 0), 0)
        dayTotals.push(total > 0 ? `$${total}` : '-')
      }
      const foot = [['Total', ...dayTotals, `$${empData.total}`]]

      autoTable(pdf, {
        startY: 80,
        head,
        body,
        foot,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5, halign: 'center', font: 'helvetica' },
        headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          8: { fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
      })

      const finalY = pdf.lastAutoTable.finalY + 15
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Days Worked: ${empData.count}`, 40, finalY)
      pdf.text(`Total: $${empData.total}`, 40, finalY + 20)

      const blob = pdf.output('blob')
      const filename = `${emp.name}-${summaryLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
        try {
          await navigator.share({
            title: `${emp.name}: ${summaryLabel}`,
            files: [new File([blob], filename, { type: 'application/pdf' })],
          })
          return
        } catch {}
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
      return
    }

    // All employees or class summary (table format)
    const classTitle = classFilter === 'servers' ? 'Servers Summary' :
                       classFilter === 'support' ? 'Support Summary' :
                       'Employee Summary'

    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(classTitle, 40, 40)

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(summaryLabel, 40, 60)

    const head = [['Employee', 'Days Worked', 'Total Tips']]
    const filteredEmployees = ALL_EMPLOYEES.filter(emp => {
      // Filter by class
      if (classFilter === 'servers') {
        const isServer = SERVERS.some(s => s.id === emp.id)
        const isTrainee = emp.id === TRAINEE.id
        if (!isServer && !isTrainee) return false
      } else if (classFilter === 'support') {
        const isBusboy = BUSBOYS.some(b => b.id === emp.id)
        if (!isBusboy && emp.id !== 'paola' && emp.id !== 'maria') return false
      }
      // Only include if they have tips
      return employeeSummary[emp.id].total > 0
    })

    const body = filteredEmployees.map(emp => {
      const data = employeeSummary[emp.id]
      return [data.name, data.count, `$${data.total}`]
    })

    const grandTotal = filteredEmployees.reduce((s, e) => s + employeeSummary[e.id].total, 0)

    autoTable(pdf, {
      startY: 75,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 8, font: 'helvetica' },
      headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    })

    const finalY = pdf.lastAutoTable.finalY + 20
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Period Total: $${grandTotal}`, 40, finalY)

    const blob = pdf.output('blob')
    const filename = `employee-summary-${summaryLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
      try {
        await navigator.share({
          title: `Employee Summary: ${summaryLabel}`,
          files: [new File([blob], filename, { type: 'application/pdf' })],
        })
        return
      } catch {}
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const handleShare = async () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Weekly Tips: ${weekLabel}`, 40, 40)

    const head = [['Name', ...DAYS, 'Total']]
    const body = TARGET_EMPLOYEES.map(emp => {
      const row = grid[emp.id]
      return [
        row.name,
        ...row.days.map(v => v != null ? `$${v}` : '-'),
        row.total > 0 ? `$${row.total}` : '-',
      ]
    })

    // Totals row
    const dayTotals = DAYS.map((_, di) => {
      const t = TARGET_EMPLOYEES.reduce((s, e) => s + (grid[e.id].days[di] || 0), 0)
      return t > 0 ? `$${t}` : '-'
    })
    const grandTotal = TARGET_EMPLOYEES.reduce((s, e) => s + grid[e.id].total, 0)
    const foot = [['Total', ...dayTotals, grandTotal > 0 ? `$${grandTotal}` : '-']]

    autoTable(pdf, {
      startY: 55,
      head,
      body,
      foot,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 6, halign: 'center', font: 'helvetica' },
      headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    })

    const blob = pdf.output('blob')
    const filename = `tips-${weekLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
      try {
        await navigator.share({
          title: `Tips: ${weekLabel}`,
          files: [new File([blob], filename, { type: 'application/pdf' })],
        })
        return
      } catch {}
    }

    // Fallback: download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const saveEmail = (val) => {
    setEmail(val)
    setEmailSaved(false)
    setEmailError('')
    if (val && !isValidEmail(val)) {
      setEmailError('Invalid email address')
    } else if (val) {
      setDoc(doc(db, 'settings', 'weekly-email'), { email: val })
        .then(() => {
          setEmailSaved(true)
          setTimeout(() => setEmailSaved(false), 3000)
        })
        .catch(() => {
          try { localStorage.setItem('tc-weekly-email', val) } catch {}
          setEmailSaved(true)
          setTimeout(() => setEmailSaved(false), 3000)
        })
    } else {
      setDoc(doc(db, 'settings', 'weekly-email'), { email: '' }).catch(() => {
        try { localStorage.removeItem('tc-weekly-email') } catch {}
      })
    }
  }

  const hasData = TARGET_EMPLOYEES.some(e => grid[e.id].total > 0)

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'var(--text-secondary)' }}>
        {isFun ? '📊 Weekly Summary' : 'Weekly Summary'}
      </h2>

      {/* View Toggle */}
      <div className="fun-card rounded-2xl border p-1 flex gap-1"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <button
          onClick={() => setViewMode('weekly')}
          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: viewMode === 'weekly' ? 'var(--accent)' : 'transparent',
            color: viewMode === 'weekly' ? 'var(--btn-text)' : 'var(--text-secondary)',
          }}
        >
          Weekly Grid
        </button>
        <button
          onClick={() => setViewMode('employee')}
          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: viewMode === 'employee' ? 'var(--accent)' : 'transparent',
            color: viewMode === 'employee' ? 'var(--btn-text)' : 'var(--text-secondary)',
          }}
        >
          Employee Summary
        </button>
      </div>

      {viewMode === 'weekly' ? (
        <>
          {/* Week picker */}
      <div className="fun-card rounded-2xl border p-4 flex items-center justify-between"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg active:scale-90 transition-all"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{weekLabel}</div>
          {weekOffset === 0 ? (
            <span className="text-xs mt-0.5" style={{ color: 'var(--green)' }}>This week</span>
          ) : (
            <button onClick={() => setWeekOffset(0)} className="text-xs mt-0.5"
              style={{ color: 'var(--accent-light)' }}>
              Go to this week
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg active:scale-90 transition-all"
          style={{ background: 'var(--surface-lighter)', color: 'var(--text-primary)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="fun-card rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider sticky left-0"
                  style={{ color: 'var(--text-secondary)', background: 'var(--surface-flat, var(--surface))' }}>
                  Name
                </th>
                {DAYS.map(d => (
                  <th key={d} className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-center"
                    style={{ color: 'var(--text-secondary)' }}>
                    {d}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-right"
                  style={{ color: 'var(--accent-light)' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {TARGET_EMPLOYEES.map((emp, i) => {
                const row = grid[emp.id]
                return (
                  <tr key={emp.id}
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap sticky left-0"
                      style={{ color: 'var(--text-primary)', background: 'var(--surface-flat, var(--surface))' }}>
                      {row.name}
                    </td>
                    {row.days.map((val, di) => (
                      <td key={di} className="px-2 py-2.5 text-center tabular-nums"
                        style={{ color: val != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {val != null ? `$${val}` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums"
                      style={{ color: row.total > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                      {row.total > 0 ? `$${row.total}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--accent)' }}>
                <td className="px-3 py-2.5 font-bold text-xs uppercase tracking-wider sticky left-0"
                  style={{ color: 'var(--accent-light)', background: 'var(--surface-flat, var(--surface))' }}>
                  Total
                </td>
                {DAYS.map((_, di) => {
                  const dayTotal = TARGET_EMPLOYEES.reduce((sum, emp) => sum + (grid[emp.id].days[di] || 0), 0)
                  return (
                    <td key={di} className="px-2 py-2.5 text-center font-bold tabular-nums"
                      style={{ color: dayTotal > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {dayTotal > 0 ? `$${dayTotal}` : '-'}
                    </td>
                  )
                })}
                {(() => {
                  const grandTotal = TARGET_EMPLOYEES.reduce((sum, emp) => sum + grid[emp.id].total, 0)
                  return (
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums"
                      style={{ color: grandTotal > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                      {grandTotal > 0 ? `$${grandTotal}` : '-'}
                    </td>
                  )
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Share button */}
      <button onClick={handleShare}
        className="w-full py-3.5 active:scale-[0.98] rounded-2xl font-semibold text-base transition-all duration-200"
        style={{
          background: shared ? 'var(--green)' : 'var(--accent)',
          color: 'var(--btn-text)',
          boxShadow: `0 4px 20px var(--accent-glow)`,
        }}>
        {shared ? 'Copied!' : 'Share Weekly Summary'}
      </button>
        </>
      ) : (
        <>
          {/* Period selector */}
          <div className="fun-card rounded-2xl border p-4"
            style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
              style={{ color: 'var(--text-secondary)' }}>
              Time Period
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="custom">Custom Range</option>
            </select>
            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block"
                    style={{ color: 'var(--text-secondary)' }}>Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={{
                      background: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block"
                    style={{ color: 'var(--text-secondary)' }}>End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={{
                      background: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            )}
            <div className="mt-3 text-sm font-semibold text-center py-2 rounded-lg"
              style={{ background: 'var(--surface-lighter)', color: 'var(--accent-light)' }}>
              {summaryLabel}
            </div>
          </div>

          {/* Employee filter */}
          <div className="fun-card rounded-2xl border p-4 space-y-3"
            style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                style={{ color: 'var(--text-secondary)' }}>
                Class Filter
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setClassFilter('all'); setSelectedEmployee('all') }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: classFilter === 'all' ? 'var(--accent)' : 'transparent',
                    color: classFilter === 'all' ? 'var(--btn-text)' : 'var(--text-secondary)',
                    border: `1px solid ${classFilter === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => { setClassFilter('servers'); setSelectedEmployee('all') }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: classFilter === 'servers' ? 'var(--accent)' : 'transparent',
                    color: classFilter === 'servers' ? 'var(--btn-text)' : 'var(--text-secondary)',
                    border: `1px solid ${classFilter === 'servers' ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  Servers
                </button>
                <button
                  onClick={() => { setClassFilter('support'); setSelectedEmployee('all') }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: classFilter === 'support' ? 'var(--accent)' : 'transparent',
                    color: classFilter === 'support' ? 'var(--btn-text)' : 'var(--text-secondary)',
                    border: `1px solid ${classFilter === 'support' ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  Support
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                style={{ color: 'var(--text-secondary)' }}>
                Specific Employee
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedEmployee(val)
                    if (val !== 'all') setClassFilter('all')
                  }}
                  className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">All</option>
                  {ALL_EMPLOYEES.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  placeholder="Search..."
                  className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Employee list or calendar */}
          {selectedEmployee !== 'all' ? (
            // Calendar view for specific employee
            <div className="fun-card rounded-2xl border overflow-hidden"
              style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {ALL_EMPLOYEES.find(e => e.id === selectedEmployee)?.name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {employeeSummary[selectedEmployee].count} {employeeSummary[selectedEmployee].count === 1 ? 'day' : 'days'} worked
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--green)' }}>
                  ${employeeSummary[selectedEmployee].total}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)', background: 'var(--surface-flat, var(--surface))' }}>
                        Date
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-center"
                        style={{ color: 'var(--text-secondary)' }}>
                        Day
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-right"
                        style={{ color: 'var(--text-secondary)' }}>
                        Tips
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const periodEntries = history.filter(h => {
                        const d = new Date(h.date)
                        return d >= summaryStart && d <= summaryEnd
                      })
                      const dailyPay = {}
                      for (const entry of periodEntries) {
                        const pay = getEmployeePay(entry, selectedEmployee)
                        if (pay != null) {
                          const date = new Date(entry.date)
                          const dateKey = date.toISOString().split('T')[0]
                          dailyPay[dateKey] = (dailyPay[dateKey] || 0) + pay
                        }
                      }
                      const sortedDates = Object.keys(dailyPay).sort()
                      return sortedDates.length > 0 ? sortedDates.map(dateKey => {
                        const date = new Date(dateKey)
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' })
                        return (
                          <tr key={dateKey} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                              {dateStr}
                            </td>
                            <td className="px-3 py-2.5 text-center" style={{ color: 'var(--text-secondary)' }}>
                              {dayStr}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--green)' }}>
                              ${dailyPay[dateKey]}
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                            No tips for this period
                          </td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Card grid view for all/filtered employees
            <div className="fun-card rounded-2xl border p-3"
              style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
              <div className={`grid gap-2 ${classFilter === 'all' || searchEmployee ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {ALL_EMPLOYEES.filter(emp => {
                  // Search filter takes priority - if searching, ignore class filter
                  if (searchEmployee) {
                    return emp.name.toLowerCase().includes(searchEmployee.toLowerCase())
                  }
                  // Class filter only applies when not searching
                  if (classFilter === 'servers') {
                    const isServer = SERVERS.some(s => s.id === emp.id)
                    const isTrainee = emp.id === TRAINEE.id
                    if (!isServer && !isTrainee) return false
                  } else if (classFilter === 'support') {
                    const isBusboy = BUSBOYS.some(b => b.id === emp.id)
                    if (!isBusboy && emp.id !== 'paola' && emp.id !== 'maria') return false
                  }
                  return true
                }).map(emp => {
                  const data = employeeSummary[emp.id]
                  return (
                    <div key={emp.id} className="rounded-lg border p-2"
                      style={{
                        background: data.total > 0 ? 'var(--surface-lighter)' : 'transparent',
                        borderColor: 'var(--border)'
                      }}>
                      <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {data.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {data.count}d
                      </div>
                      <div className="text-sm font-bold tabular-nums mt-0.5"
                        style={{ color: data.total > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                        ${data.total}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Period total */}
          {(() => {
            const periodTotal = ALL_EMPLOYEES
              .filter(e => {
                // Specific employee filter
                if (selectedEmployee !== 'all' && e.id !== selectedEmployee) return false
                // Class filter
                if (classFilter === 'servers') {
                  const isServer = SERVERS.some(s => s.id === e.id)
                  const isTrainee = e.id === TRAINEE.id
                  if (!isServer && !isTrainee) return false
                } else if (classFilter === 'support') {
                  const isBusboy = BUSBOYS.some(b => b.id === e.id)
                  if (!isBusboy && e.id !== 'paola' && e.id !== 'maria') return false
                }
                return true
              })
              .reduce((s, e) => s + employeeSummary[e.id].total, 0)
            return periodTotal > 0 ? (
              <div className="fun-card rounded-2xl border p-4 flex justify-between items-center"
                style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
                <span className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
                  Period Total
                </span>
                <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--green)' }}>
                  ${periodTotal}
                </span>
              </div>
            ) : null
          })()}

          {/* Share employee summary button */}
          <button onClick={handleShareEmployeeSummary}
            className="w-full py-3.5 active:scale-[0.98] rounded-2xl font-semibold text-base transition-all duration-200"
            style={{
              background: shared ? 'var(--green)' : 'var(--accent)',
              color: 'var(--btn-text)',
              boxShadow: `0 4px 20px var(--accent-glow)`,
            }}>
            {shared ? 'Copied!' : 'Share Employee Summary'}
          </button>
        </>
      )}

      {/* Email settings */}
      <button onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Email Settings
        <svg className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${showSettings ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="fun-card rounded-2xl border p-4 space-y-2"
          style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Recipient Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => saveEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none"
            style={{
              background: 'var(--input-bg)',
              borderColor: emailError ? 'var(--red)' : emailSaved ? 'var(--green)' : 'var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => {
              if (!emailError && !emailSaved) {
                e.target.style.borderColor = 'var(--border-focus)'
                e.target.style.boxShadow = `0 0 0 2px var(--accent-glow)`
              }
            }}
            onBlur={e => {
              if (!emailError && !emailSaved) {
                e.target.style.borderColor = 'var(--border)'
              }
              e.target.style.boxShadow = 'none'
            }}
          />
          {emailError && (
            <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{emailError}</p>
          )}
          {emailSaved && (
            <p className="text-xs font-medium" style={{ color: 'var(--green)' }}>
              Saved — weekly summary will be sent to {email}
            </p>
          )}
          {!emailError && !emailSaved && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {email ? `Current: ${email}` : 'Auto-sent every Sunday at 10am EST'}
            </p>
          )}
        </div>
      </div>

      {!hasData && (
        <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          No tip data for this week
        </div>
      )}
    </div>
  )
}
