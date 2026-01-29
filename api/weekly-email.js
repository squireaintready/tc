// Vercel serverless function — sends weekly tip summary email via EmailJS
// Triggered by Vercel cron every Sunday at 10am EST (15:00 UTC)

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'tclife-771b9'
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY
const RECIPIENT_EMAIL = process.env.WEEKLY_RECIPIENT_EMAIL

const BUSBOYS = [
  { id: 'seb', name: 'Seb', percentage: 35 },
  { id: 'victor', name: 'Victor', percentage: 30 },
  { id: 'alex', name: 'Alex', percentage: 30 },
  { id: 'hugo', name: 'Hugo', percentage: 30 },
  { id: 'moises', name: 'Moises', percentage: 30 },
]
const MARIA = { id: 'maria', percentage: 20 }
const PAOLA_DEFAULT = 40

const TARGET = [
  ...BUSBOYS.map(b => ({ id: b.id, name: b.name })),
  { id: 'maria', name: 'Maria' },
  { id: 'paola', name: 'Paola' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekRange() {
  const now = new Date()
  // Go back to last Sunday (the week that just ended on Saturday)
  const daysSinceSun = now.getDay()
  const lastSun = new Date(now)
  lastSun.setDate(now.getDate() - daysSinceSun - 7)
  lastSun.setHours(0, 0, 0, 0)
  const lastSat = new Date(lastSun)
  lastSat.setDate(lastSun.getDate() + 6)
  lastSat.setHours(23, 59, 59, 999)
  return { start: lastSun, end: lastSat }
}

function getEmployeePay(entry, employeeId) {
  if (!entry.enabledStaff?.[employeeId]) return null
  let pct
  const busboy = BUSBOYS.find(b => b.id === employeeId)
  if (busboy) {
    pct = entry.pastryBusboy === employeeId ? 20 : busboy.percentage
  } else if (employeeId === 'maria') {
    pct = MARIA.percentage
  } else if (employeeId === 'paola') {
    pct = entry.paolaUdon ? 20 : PAOLA_DEFAULT
  }
  if (pct == null) return null
  const group = entry.breakdown?.find(g => g.percentage === pct)
  return group ? group.perPerson : null
}

async function fetchHistory(start, end) {
  // Use Firestore REST API
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/history?pageSize=100`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Firestore fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.documents) return []

  return data.documents
    .map(doc => {
      const fields = doc.fields
      const parseValue = (v) => {
        if (!v) return null
        if ('stringValue' in v) return v.stringValue
        if ('integerValue' in v) return Number(v.integerValue)
        if ('doubleValue' in v) return v.doubleValue
        if ('booleanValue' in v) return v.booleanValue
        if ('nullValue' in v) return null
        if ('mapValue' in v) {
          const obj = {}
          for (const [k, mv] of Object.entries(v.mapValue.fields || {})) {
            obj[k] = parseValue(mv)
          }
          return obj
        }
        if ('arrayValue' in v) {
          return (v.arrayValue.values || []).map(parseValue)
        }
        return null
      }
      const entry = {}
      for (const [k, v] of Object.entries(fields)) {
        entry[k] = parseValue(v)
      }
      return entry
    })
    .filter(h => {
      const d = new Date(h.date)
      return d >= start && d <= end
    })
}

function buildGrid(history, start, end) {
  const grid = {}
  for (const emp of TARGET) {
    grid[emp.id] = { name: emp.name, days: Array(7).fill(null), total: 0 }
  }
  for (const entry of history) {
    const dayIdx = new Date(entry.date).getDay()
    for (const emp of TARGET) {
      const pay = getEmployeePay(entry, emp.id)
      if (pay != null) {
        grid[emp.id].days[dayIdx] = (grid[emp.id].days[dayIdx] || 0) + pay
        grid[emp.id].total += pay
      }
    }
  }
  return grid
}

function gridToHtml(grid, weekLabel) {
  let html = `<h2 style="font-family:sans-serif;color:#333">Weekly Tips: ${weekLabel}</h2>`
  html += '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%">'
  html += '<tr style="background:#6c5ce7;color:#fff">'
  html += '<th style="padding:8px 12px;text-align:left">Name</th>'
  for (const d of DAYS) html += `<th style="padding:8px 6px;text-align:center">${d}</th>`
  html += '<th style="padding:8px 12px;text-align:right">Total</th></tr>'
  let i = 0
  for (const emp of TARGET) {
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

function gridToText(grid, weekLabel) {
  const pad = (s, n) => String(s).padStart(n)
  const lines = [`Weekly Tips: ${weekLabel}`, '']
  const header = ['Name    ', ...DAYS.map(d => pad(d, 5)), pad('Total', 6)].join(' ')
  lines.push(header)
  lines.push('-'.repeat(header.length))
  for (const emp of TARGET) {
    const row = grid[emp.id]
    const cells = row.days.map(d => pad(d != null ? `$${d}` : '-', 5))
    lines.push([row.name.padEnd(8), ...cells, pad(`$${row.total}`, 6)].join(' '))
  }
  return lines.join('\n')
}

export default async function handler(req, res) {
  try {
    // Verify request is from Vercel cron (Authorization header) or has the secret as query param
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers['authorization']
      const querySecret = req.query?.secret
      if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      return res.status(500).json({ error: 'EmailJS not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY env vars.' })
    }

    // Try env var first, then Firestore settings doc
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

    const { start, end } = getWeekRange()
    const opts = { month: 'short', day: 'numeric' }
    const weekLabel = `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`

    const history = await fetchHistory(start, end)
    const grid = buildGrid(history, start, end)
    const htmlContent = gridToHtml(grid, weekLabel)
    const textContent = gridToText(grid, weekLabel)

    // Send via EmailJS REST API
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
