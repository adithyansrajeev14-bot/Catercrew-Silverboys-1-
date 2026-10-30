/**
 * Indian Rupee & Date/Time formatting helpers
 */

// Format money as ₹ with Indian comma formatting (e.g. ₹1,200)
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0'
  }
  const num = Number(amount)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

// Format date like "Sat, 15 Nov 2026"
export function formatEventDate(dateStr) {
  if (!dateStr) return ''
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return dateStr
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Format time string to "4:00 PM"
export function formatEventTime(timeStr) {
  if (!timeStr) return ''
  // If already formatted like "4:00 PM"
  if (/am|pm/i.test(timeStr)) return timeStr.trim()

  // If "HH:MM" 24h format
  const parts = timeStr.split(':')
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10)
    const minutes = parts[1].padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`
  }
  return timeStr
}

// Calculate total hours between two times like "10:00 AM" and "6:00 PM"
export function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return null
  const parseToMinutes = (str) => {
    const s = str.trim().toLowerCase()
    const match = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/)
    if (!match) return null
    let h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    const ampm = match[3]
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    return h * 60 + m
  }

  const startM = parseToMinutes(startTime)
  const endM = parseToMinutes(endTime)
  if (startM === null || endM === null) return null

  let diff = endM - startM
  if (diff < 0) diff += 24 * 60 // crosses midnight
  const hours = (diff / 60).toFixed(1)
  return hours.endsWith('.0') ? `${Math.round(diff / 60)} hrs` : `${hours} hrs`
}

// Validate Google Maps links
export function validateGoogleMapsLink(link) {
  if (!link || typeof link !== 'string') return false
  const trimmed = link.trim().toLowerCase()
  return (
    trimmed.includes('google.com/maps') ||
    trimmed.includes('maps.app.goo.gl') ||
    trimmed.includes('goo.gl/maps') ||
    trimmed.startsWith('https://maps.google.com')
  )
}
