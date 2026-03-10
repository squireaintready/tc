// Vercel serverless function — sends weekly tip summary email via EmailJS
// Triggered by Vercel cron every Sunday at 10am EST (15:00 UTC)

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'tclife-771b9'
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY
const RECIPIENT_EMAIL = process.env.WEEKLY_RECIPIENT_EMAIL

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function mondayIndex(jsDay) {
  return (jsDay + 6) % 7
}

// Fallback staff if Firestore fetch fails (matches DEFAULT_STAFF from src/staff.js)
const FALLBACK_TARGET = [
  { id: 'seb', name: 'Seb', percentage: 35, role: 'busboy' },
  { id: 'victor', name: 'Victor', percentage: 30, role: 'busboy' },
  { id: 'alex', name: 'Alex', percentage: 30, role: 'busboy' },
  { id: 'hugo', name: 'Hugo', percentage: 30, role: 'busboy' },
  { id: 'moises', name: 'Moises', percentage: 30, role: 'busboy' },
  { id: 'maria', name: 'Maria', percentage: 20, role: 'other' },
  { id: 'paola', name: 'Paola', percentage: 40, role: 'server', modifiers: { altPercentage: 20, altLabel: 'Udon' } },
]

async function fetchStaff() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/staff?pageSize=100`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Staff fetch failed: ${res.status}`)
    const data = await res.json()
    if (!data.documents || data.documents.length === 0) return null

    return data.documents.map(doc => {
      const fields = doc.fields
      const entry = {}
      for (const [k, v] of Object.entries(fields)) {
        entry[k] = parseFirestoreValue(v)
      }
      // Extract id from document path
      const pathParts = doc.name.split('/')
      entry.id = entry.id || pathParts[pathParts.length - 1]
      return entry
    })
  } catch (err) {
    console.warn('Failed to fetch staff from Firestore:', err.message)
    return null
  }
}

function parseFirestoreValue(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) {
    const obj = {}
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(mv)
    }
    return obj
  }
  if ('arrayValue' in v) {
    return (v.arrayValue.values || []).map(parseFirestoreValue)
  }
  return null
}

function getWeekRange() {
  const now = new Date()
  const daysSinceMon = (now.getDay() + 6) % 7
  const lastMon = new Date(now)
  lastMon.setDate(now.getDate() - daysSinceMon - 7)
  lastMon.setHours(0, 0, 0, 0)
  const lastSun = new Date(lastMon)
  lastSun.setDate(lastMon.getDate() + 6)
  lastSun.setHours(23, 59, 59, 999)
  return { start: lastMon, end: lastSun }
}

// Pay calculation — mirrors src/utils/staffHelpers.js getEmployeePay()
function getEmployeePay(entry, employeeId, staffRoster) {
  if (!entry.enabledStaff?.[employeeId]) return null

  const emp = staffRoster.find(s => s.id === employeeId)
  if (!emp) return null

  let effectivePct = emp.percentage

  if (emp.role === 'trainee') {
    if (entry.traineePercents && entry.traineePercents[employeeId] != null) {
      effectivePct = entry.traineePercents[employeeId]
    } else if (employeeId === 'david' && entry.davidPercent != null) {
      effectivePct = entry.davidPercent
    }
  } else if (emp.modifiers?.altPercentage != null) {
    if (entry.modifierToggles && entry.modifierToggles[employeeId]) {
      effectivePct = emp.modifiers.altPercentage
    } else if (employeeId === 'paola' && entry.paolaUdon) {
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

async function fetchHistory(start, end) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/history?pageSize=100`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Firestore fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.documents) return []

  return data.documents
    .map(doc => {
      const fields = doc.fields
      const entry = {}
      for (const [k, v] of Object.entries(fields)) {
        entry[k] = parseFirestoreValue(v)
      }
      return entry
    })
    .filter(h => {
      const d = new Date(h.date)
      return d >= start && d <= end
    })
}

function buildGrid(history, target, staffRoster) {
  const grid = {}
  for (const emp of target) {
    grid[emp.id] = { name: emp.name, days: Array(7).fill(null), total: 0 }
  }
  for (const entry of history) {
    const dayIdx = mondayIndex(new Date(entry.date).getDay())
    for (const emp of target) {
      const pay = getEmployeePay(entry, emp.id, staffRoster)
      if (pay != null) {
        grid[emp.id].days[dayIdx] = (grid[emp.id].days[dayIdx] || 0) + pay
        grid[emp.id].total += pay
      }
    }
  }
  return grid
}

function gridToHtml(grid, weekLabel, target) {
  let html = `<h2 style="font-family:sans-serif;color:#333">Weekly Tips: ${weekLabel}</h2>`
  html += '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%">'
  html += '<tr style="background:#6c5ce7;color:#fff">'
  html += '<th style="padding:8px 12px;text-align:left">Name</th>'
  for (const d of DAYS) html += `<th style="padding:8px 6px;text-align:center">${d}</th>`
  html += '<th style="padding:8px 12px;text-align:right">Total</th></tr>'
  let i = 0
  for (const emp of target) {
    const row = grid[emp.id]
    const bg = i % 2 === 0 ? '#f8f9fa' : '#ffffff'
    html += `<tr style="background:${bg}">`
    html += `<td style="padding:6px 12px;font-weight:600">${row.name}</td>`
    for (const val of row.days) {
      html += `<td style="padding:6px;text-align:center;color:${val != null ? '#333' : '#ccc'}">${val != null ? '$' + val : '-'}</td>`
    }
    html += `<td style="padding:6px 12px;text-align:right;font-weight:700;color:${row.total > 0 ? '#00b894' : '#ccc'}">${row.total > 0 ? '$' + row.total : '-'}</td>`
    html += '</tr>'
    i++
  }
  html += '</table>'
  return html
}

function gridToText(grid, weekLabel, target) {
  const pad = (s, n) => String(s).padStart(n)
  const lines = [`Weekly Tips: ${weekLabel}`, '']
  const header = ['Name    ', ...DAYS.map(d => pad(d, 5)), pad('Total', 6)].join(' ')
  lines.push(header)
  lines.push('-'.repeat(header.length))
  for (const emp of target) {
    const row = grid[emp.id]
    const cells = row.days.map(d => pad(d != null ? `$${d}` : '-', 5))
    lines.push([row.name.padEnd(8), ...cells, pad(`$${row.total}`, 6)].join(' '))
  }
  return lines.join('\n')
}

export default async function handler(req, res) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers['authorization']
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      return res.status(500).json({ error: 'EmailJS not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY env vars.' })
    }

    let recipientEmail = RECIPIENT_EMAIL || req.query?.email
    if (!recipientEmail) {
      try {
        const settingsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/weekly-email`
        const settingsRes = await fetch(settingsUrl)
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          recipientEmail = settingsData.fields?.email?.stringValue
        }
      } catch {}
    }
    if (!recipientEmail) {
      return res.status(400).json({ error: 'No recipient email. Set it in the app or WEEKLY_RECIPIENT_EMAIL env var.' })
    }

    // Fetch dynamic staff roster from Firestore, fall back to hardcoded
    const firestoreStaff = await fetchStaff()
    const staffRoster = firestoreStaff || FALLBACK_TARGET
    const target = staffRoster
      .filter(s => s.active !== false && (s.id === 'sam' || s.role === 'busboy' || s.role === 'other' || s.modifiers?.altPercentage))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map(s => ({ id: s.id, name: s.name }))

    const { start, end } = getWeekRange()
    const opts = { month: 'short', day: 'numeric' }
    const weekLabel = `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`

    const history = await fetchHistory(start, end)
    const grid = buildGrid(history, target, staffRoster)
    const htmlContent = gridToHtml(grid, weekLabel, target)
    const textContent = gridToText(grid, weekLabel, target)

    const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: recipientEmail,
          subject: `Weekly Tips Summary: ${weekLabel}`,
          message_html: htmlContent,
          message: textContent,
        },
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      return res.status(500).json({ error: `EmailJS failed: ${errText}` })
    }

    return res.status(200).json({ success: true, week: weekLabel, entries: history.length })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
