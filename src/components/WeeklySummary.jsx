import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useStaffContext } from '../StaffContext'
import { getEmployeePay } from '../utils/staffHelpers'
import { getWeekRange, formatRange } from '../utils/dates'
import { DAYS, mondayIndex } from '../utils/constants'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function buildWeeklyGrid(history, weekStart, weekEnd, targetEmployees, staffRoster) {
  const weekEntries = history.filter(h => {
    const d = new Date(h.date)
    return d >= weekStart && d <= weekEnd
  })

  const grid = {}
  for (const emp of targetEmployees) {
    grid[emp.id] = { name: emp.name, days: Array(7).fill(null), total: 0 }
  }

  for (const entry of weekEntries) {
    const dayIdx = mondayIndex(new Date(entry.date).getDay())
    for (const emp of targetEmployees) {
      const pay = getEmployeePay(entry, emp.id, staffRoster)
      if (pay != null) {
        grid[emp.id].days[dayIdx] = (grid[emp.id].days[dayIdx] || 0) + pay
        grid[emp.id].total += pay
      }
    }
  }

  return grid
}

export function formatGridAsText(grid, weekLabel, targetEmployees) {
  const pad = (s, n) => String(s).padStart(n)
  const lines = [`Weekly Tips: ${weekLabel}`, '']
  const header = ['Name    ', ...DAYS.map(d => pad(d, 5)), pad('Total', 6)].join(' ')
  lines.push(header)
  lines.push('-'.repeat(header.length))
  for (const emp of targetEmployees) {
    const row = grid[emp.id]
    const cells = row.days.map(d => pad(d != null ? `$${d}` : '-', 5))
    lines.push([row.name.padEnd(8), ...cells, pad(`$${row.total}`, 6)].join(' '))
  }
  lines.push('-'.repeat(header.length))
  const dayTotals = DAYS.map((_, di) => {
    const t = targetEmployees.reduce((s, e) => s + (grid[e.id].days[di] || 0), 0)
    return pad(t > 0 ? `$${t}` : '-', 5)
  })
  const grandTotal = targetEmployees.reduce((s, e) => s + grid[e.id].total, 0)
  lines.push(['Total   ', ...dayTotals, pad(`$${grandTotal}`, 6)].join(' '))
  return lines.join('\n')
}

export default function WeeklySummary({ history }) {
  const { staff } = useStaffContext()
  const todayIdx = mondayIndex(new Date().getDay())

  // Derive employee lists from dynamic staff
  const targetEmployees = useMemo(() => {
    return staff
      .filter(s => s.active !== false && (s.id === 'sam' || s.role === 'busboy' || s.role === 'other' || s.modifiers?.altPercentage))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map(s => ({ id: s.id, name: s.name }))
  }, [staff])

  const allEmployees = useMemo(() => {
    return staff
      .filter(s => s.active !== false)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map(s => ({ id: s.id, name: s.name }))
  }, [staff])

  const [weekOffset, setWeekOffset] = useState(() => {
    try {
      const saved = localStorage.getItem('tc-weekOffset')
      return saved ? parseInt(saved) : 0
    } catch { return 0 }
  })
  const [email, setEmail] = useState('')
  const [emailLoaded, setEmailLoaded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [shared, setShared] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [viewMode, setViewMode] = useState('weekly')
  const [periodType, setPeriodType] = useState(() => {
    try {
      const saved = localStorage.getItem('tc-periodType')
      return saved || 'month'
    } catch { return 'month' }
  })
  const [customStart, setCustomStart] = useState(() => {
    try {
      const saved = localStorage.getItem('tc-customStart')
      return saved || ''
    } catch { return '' }
  })
  const [customEnd, setCustomEnd] = useState(() => {
    try {
      const saved = localStorage.getItem('tc-customEnd')
      return saved || ''
    } catch { return '' }
  })
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [searchEmployee, setSearchEmployee] = useState('')
  const [classFilter, setClassFilter] = useState('all')

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

  useEffect(() => {
    try { localStorage.setItem('tc-weekOffset', weekOffset.toString()) } catch {}
  }, [weekOffset])

  useEffect(() => {
    try { localStorage.setItem('tc-periodType', periodType) } catch {}
  }, [periodType])

  useEffect(() => {
    try { localStorage.setItem('tc-customStart', customStart) } catch {}
  }, [customStart])

  useEffect(() => {
    try { localStorage.setItem('tc-customEnd', customEnd) } catch {}
  }, [customEnd])

  const { start, end } = useMemo(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    return getWeekRange(now)
  }, [weekOffset])

  const weekLabel = formatRange(start, end)
  const grid = useMemo(() => buildWeeklyGrid(history, start, end, targetEmployees, staff), [history, start, end, targetEmployees, staff])

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
    for (const emp of allEmployees) {
      summary[emp.id] = { name: emp.name, total: 0, count: 0 }
    }

    for (const entry of periodEntries) {
      for (const emp of allEmployees) {
        const pay = getEmployeePay(entry, emp.id, staff)
        if (pay != null) {
          summary[emp.id].total += pay
          const dayValue = (entry.shift === 'lunch' || entry.shift === 'dinner') ? 0.5 : 1
          summary[emp.id].count += dayValue
        }
      }
    }

    return summary
  }, [history, summaryStart, summaryEnd, allEmployees, staff])

  const isServerOrTrainee = (empId) => {
    const emp = staff.find(s => s.id === empId)
    return emp && (emp.role === 'server' || emp.role === 'trainee') && !emp.modifiers?.altPercentage
  }

  const isSupportStaff = (empId) => {
    const emp = staff.find(s => s.id === empId)
    return emp && (emp.role === 'busboy' || emp.role === 'other' || emp.modifiers?.altPercentage)
  }

  const filterEmployees = (employees) => {
    return employees.filter(emp => {
      if (searchEmployee) {
        return emp.name.toLowerCase().includes(searchEmployee.toLowerCase())
      }
      if (classFilter === 'servers') return isServerOrTrainee(emp.id)
      if (classFilter === 'support') return isSupportStaff(emp.id)
      return true
    })
  }

  const handleShareEmployeeSummary = async () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

    const filteredBySearch = searchEmployee
      ? allEmployees.filter(emp => emp.name.toLowerCase().includes(searchEmployee.toLowerCase()))
      : null

    const specificEmployee = selectedEmployee !== 'all'
      ? selectedEmployee
      : (filteredBySearch && filteredBySearch.length === 1 ? filteredBySearch[0].id : null)

    if (specificEmployee) {
      const emp = allEmployees.find(e => e.id === specificEmployee)
      const empData = employeeSummary[specificEmployee]

      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${emp.name} - Weekly Calendar`, 40, 40)

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(summaryLabel, 40, 60)

      const periodEntries = history.filter(h => {
        const d = new Date(h.date)
        return d >= summaryStart && d <= summaryEnd
      })

      const dailyPay = {}
      for (const entry of periodEntries) {
        const pay = getEmployeePay(entry, specificEmployee, staff)
        if (pay != null) {
          const date = new Date(entry.date)
          const dateKey = date.toISOString().split('T')[0]
          dailyPay[dateKey] = (dailyPay[dateKey] || 0) + pay
        }
      }

      const weeks = []
      let currentDate = new Date(summaryStart)

      while (currentDate <= summaryEnd) {
        const weekStart = new Date(currentDate)
        const daysSinceMon = (currentDate.getDay() + 6) % 7
        weekStart.setDate(currentDate.getDate() - daysSinceMon)

        const weekDays = []
        let weekTotal = 0
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart)
          day.setDate(weekStart.getDate() + i)

          if (day >= summaryStart && day <= summaryEnd) {
            const dateKey = day.toISOString().split('T')[0]
            const amount = dailyPay[dateKey] || 0
            weekDays.push(amount)
            weekTotal += amount
          } else {
            weekDays.push(null)
          }
        }

        if (weekTotal > 0) {
          const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          weeks.push({ label: weekLabel, days: weekDays, total: weekTotal })
        }

        const daysUntilNextMon = (8 - currentDate.getDay()) % 7 || 7
        currentDate.setDate(currentDate.getDate() + daysUntilNextMon)
      }

      const head = [['Week', ...DAYS, 'Total']]
      const body = weeks.map(week => [
        week.label,
        ...week.days.map(v => v != null ? (v > 0 ? `$${v}` : '-') : '-'),
        `$${week.total}`
      ])

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
    const filteredEmployees = filterEmployees(allEmployees).filter(emp => employeeSummary[emp.id]?.total > 0)

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
    const body = targetEmployees.map(emp => {
      const row = grid[emp.id]
      return [
        row.name,
        ...row.days.map(v => v != null ? `$${v}` : '-'),
        row.total > 0 ? `$${row.total}` : '-',
      ]
    })

    const dayTotals = DAYS.map((_, di) => {
      const t = targetEmployees.reduce((s, e) => s + (grid[e.id].days[di] || 0), 0)
      return t > 0 ? `$${t}` : '-'
    })
    const grandTotal = targetEmployees.reduce((s, e) => s + grid[e.id].total, 0)
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

  const hasData = targetEmployees.some(e => grid[e.id]?.total > 0)

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1 flex items-center gap-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Weekly Summary
      </h2>

      {/* View Toggle */}
      <div className="rounded-lg p-1 flex gap-1"
        style={{ background: 'var(--surface-lighter)' }}>
        <button
          onClick={() => setViewMode('weekly')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: viewMode === 'weekly' ? 'var(--accent)' : 'var(--surface-lighter)',
            color: viewMode === 'weekly' ? 'var(--btn-text)' : 'var(--text-secondary)',
          }}
        >
          Weekly Grid
        </button>
        <button
          onClick={() => setViewMode('employee')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: viewMode === 'employee' ? 'var(--accent)' : 'var(--surface-lighter)',
            color: viewMode === 'employee' ? 'var(--btn-text)' : 'var(--text-secondary)',
          }}
        >
          Employee Summary
        </button>
      </div>

      {viewMode === 'weekly' ? (
        <>
          {/* Week picker */}
      <div className="rounded-lg px-3 py-2 flex items-center justify-between"
        style={{ background: 'var(--surface-lighter)' }}>
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
      <div className="rounded-lg overflow-hidden"
        style={{ background: 'var(--surface-lighter)' }}>
        <div className="overflow-x-auto" ref={el => { if (el) el.scrollLeft = el.scrollWidth }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-light)' }}>
                <th className="text-left px-3 py-1.5 text-xs font-semibold uppercase tracking-wider sticky left-0"
                  style={{ color: 'var(--text-muted)', background: 'var(--surface-lighter)' }}>
                  Name
                </th>
                {DAYS.map((d, di) => (
                  <th key={d} className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-center"
                    style={{
                      color: weekOffset === 0 && di === todayIdx ? 'var(--accent-light)' : 'var(--text-muted)',
                      background: weekOffset === 0 && di === todayIdx ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
                    }}>
                    {d}
                  </th>
                ))}
                <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-right"
                  style={{ color: 'var(--text-muted)' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {targetEmployees.map((emp, empIdx) => {
                const row = grid[emp.id]
                if (!row) return null
                return (
                  <tr key={emp.id}
                    style={{ background: empIdx % 2 === 1 ? 'var(--surface-light)' : undefined }}>
                    <td className="px-3 py-1.5 text-sm font-medium whitespace-nowrap sticky left-0"
                      style={{ color: 'var(--text-primary)', background: empIdx % 2 === 1 ? 'var(--surface-light)' : 'var(--surface-lighter)' }}>
                      {row.name}
                    </td>
                    {row.days.map((val, di) => (
                      <td key={di} className="px-2 py-1.5 text-sm text-center tabular-nums"
                        style={{
                          color: val != null ? 'var(--text-primary)' : 'var(--text-muted)',
                          background: weekOffset === 0 && di === todayIdx ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
                        }}>
                        {val != null ? `$${val}` : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-sm text-right font-bold tabular-nums"
                      style={{ color: row.total > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                      {row.total > 0 ? `$${row.total}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--surface-light)' }}>
                <td className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider sticky left-0"
                  style={{ color: 'var(--text-primary)', background: 'var(--surface-lighter)' }}>
                  Total
                </td>
                {DAYS.map((_, di) => {
                  const dayTotal = targetEmployees.reduce((sum, emp) => sum + (grid[emp.id]?.days[di] || 0), 0)
                  return (
                    <td key={di} className="px-2 py-1.5 text-sm text-center font-bold tabular-nums"
                      style={{
                        color: dayTotal > 0 ? 'var(--green)' : 'var(--text-muted)',
                        background: weekOffset === 0 && di === todayIdx ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
                      }}>
                      {dayTotal > 0 ? `$${dayTotal}` : '-'}
                    </td>
                  )
                })}
                {(() => {
                  const grandTotal = targetEmployees.reduce((sum, emp) => sum + (grid[emp.id]?.total || 0), 0)
                  return (
                    <td className="px-3 py-1.5 text-sm text-right font-bold tabular-nums"
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
        className="w-full py-3.5 active:scale-[0.98] rounded-lg font-semibold text-sm transition-all duration-200"
        style={{
          background: shared ? 'var(--green)' : 'var(--accent)',
          color: 'var(--btn-text)',
        }}>
        {shared ? 'Copied!' : 'Share Weekly Summary'}
      </button>
        </>
      ) : (
        <>
          {/* Period selector */}
          <div className="rounded-lg px-3 py-2"
            style={{ background: 'var(--surface-lighter)' }}>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
              style={{ color: 'var(--text-muted)' }}>
              Time Period
            </label>
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setPeriodType('month')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: periodType === 'month' ? 'var(--accent)' : 'var(--surface-lighter)',
                  color: periodType === 'month' ? 'var(--btn-text)' : 'var(--text-secondary)',
                }}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriodType('week')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: periodType === 'week' ? 'var(--accent)' : 'var(--surface-lighter)',
                  color: periodType === 'week' ? 'var(--btn-text)' : 'var(--text-secondary)',
                }}
              >
                This Week
              </button>
              <button
                onClick={() => setPeriodType('custom')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: periodType === 'custom' ? 'var(--accent)' : 'var(--surface-lighter)',
                  color: periodType === 'custom' ? 'var(--btn-text)' : 'var(--text-secondary)',
                }}
              >
                Custom
              </button>
            </div>
            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block"
                    style={{ color: 'var(--text-muted)' }}>Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      background: 'var(--surface-light)',
                      color: 'var(--text-primary)',
                      border: 'none',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block"
                    style={{ color: 'var(--text-muted)' }}>End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      background: 'var(--surface-light)',
                      color: 'var(--text-primary)',
                      border: 'none',
                    }}
                  />
                </div>
              </div>
            )}
            <div className="mt-3 text-sm font-semibold text-center py-2 rounded-lg"
              style={{ background: 'var(--surface-light)', color: 'var(--accent-light)' }}>
              {summaryLabel}
            </div>
          </div>

          {/* Employee filter */}
          <div className="rounded-lg px-3 py-2 space-y-3"
            style={{ background: 'var(--surface-lighter)' }}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                style={{ color: 'var(--text-muted)' }}>
                Class Filter
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => { setClassFilter('all'); setSelectedEmployee('all'); setSearchEmployee('') }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: classFilter === 'all' ? 'var(--accent)' : 'var(--surface-lighter)',
                    color: classFilter === 'all' ? 'var(--btn-text)' : 'var(--text-secondary)',
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => { setClassFilter('servers'); setSelectedEmployee('all'); setSearchEmployee('') }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: classFilter === 'servers' ? 'var(--accent)' : 'var(--surface-lighter)',
                    color: classFilter === 'servers' ? 'var(--btn-text)' : 'var(--text-secondary)',
                  }}
                >
                  Servers
                </button>
                <button
                  onClick={() => { setClassFilter('support'); setSelectedEmployee('all'); setSearchEmployee('') }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: classFilter === 'support' ? 'var(--accent)' : 'var(--surface-lighter)',
                    color: classFilter === 'support' ? 'var(--btn-text)' : 'var(--text-secondary)',
                  }}
                >
                  Support
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                style={{ color: 'var(--text-muted)' }}>
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
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{
                    background: 'var(--surface-light)',
                    color: 'var(--text-primary)',
                    border: 'none',
                  }}
                >
                  <option value="all">All</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchEmployee}
                  onChange={(e) => {
                    setSearchEmployee(e.target.value)
                    if (e.target.value) setClassFilter('all')
                  }}
                  placeholder="Search..."
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{
                    background: 'var(--surface-light)',
                    color: 'var(--text-primary)',
                    border: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Employee list or calendar */}
          {selectedEmployee !== 'all' ? (
            <div className="rounded-lg overflow-hidden"
              style={{ background: 'var(--surface-lighter)' }}>
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--surface-light)' }}>
                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {allEmployees.find(e => e.id === selectedEmployee)?.name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {employeeSummary[selectedEmployee]?.count || 0} {(employeeSummary[selectedEmployee]?.count || 0) === 1 ? 'day' : 'days'} worked
                </div>
                <div className="text-sm font-bold mt-1 tabular-nums" style={{ color: 'var(--green)' }}>
                  ${employeeSummary[selectedEmployee]?.total || 0}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-light)' }}>
                      <th className="text-left px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)', background: 'var(--surface-lighter)' }}>
                        Date
                      </th>
                      <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-center"
                        style={{ color: 'var(--text-muted)' }}>
                        Day
                      </th>
                      <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-right"
                        style={{ color: 'var(--text-muted)' }}>
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
                        const pay = getEmployeePay(entry, selectedEmployee, staff)
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
                          <tr key={dateKey} style={{ borderTop: '1px solid var(--surface-light)' }}>
                            <td className="px-3 py-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {dateStr}
                            </td>
                            <td className="px-3 py-1.5 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                              {dayStr}
                            </td>
                            <td className="px-3 py-1.5 text-sm text-right font-bold tabular-nums" style={{ color: 'var(--green)' }}>
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
            <div className="rounded-lg px-3 py-2"
              style={{ background: 'var(--surface-lighter)' }}>
              <div className={`grid gap-2 ${classFilter === 'all' || searchEmployee ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {filterEmployees(allEmployees).map(emp => {
                  const data = employeeSummary[emp.id]
                  if (!data) return null
                  return (
                    <div key={emp.id} className="rounded-lg p-2"
                      style={{
                        background: data.total > 0 ? 'var(--surface-light)' : 'transparent',
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
            const filtered = filterEmployees(allEmployees).filter(e =>
              selectedEmployee === 'all' || e.id === selectedEmployee
            )
            const periodTotal = filtered.reduce((s, e) => s + (employeeSummary[e.id]?.total || 0), 0)
            return periodTotal > 0 ? (
              <div className="rounded-lg px-3 py-2 flex justify-between items-center"
                style={{ background: 'var(--surface-lighter)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
                  Period Total
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--green)' }}>
                  ${periodTotal}
                </span>
              </div>
            ) : null
          })()}

          {/* Share employee summary button */}
          <button onClick={handleShareEmployeeSummary}
            className="w-full py-3.5 active:scale-[0.98] rounded-lg font-semibold text-sm transition-all duration-200"
            style={{
              background: shared ? 'var(--green)' : 'var(--accent)',
              color: 'var(--btn-text)',
            }}>
            {shared ? 'Copied!' : 'Share Employee Summary'}
          </button>
        </>
      )}

      {/* Email settings */}
      <button onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-lighter)', color: 'var(--text-secondary)' }}>
        Email Settings
        <svg className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${showSettings ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="rounded-lg px-3 py-2 space-y-2"
          style={{ background: 'var(--surface-lighter)' }}>
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Recipient Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => saveEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              background: 'var(--surface-light)',
              color: 'var(--text-primary)',
              border: 'none',
              borderBottom: emailError ? '2px solid var(--red)' : emailSaved ? '2px solid var(--green)' : '2px solid transparent',
            }}
            onFocus={e => {
              if (!emailError && !emailSaved) {
                e.target.style.borderBottom = '2px solid var(--accent)'
              }
            }}
            onBlur={e => {
              if (!emailError && !emailSaved) {
                e.target.style.borderBottom = '2px solid transparent'
              }
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
