// Shared date helpers. Dates are stored as plain 'YYYY-MM-DD' local calendar
// strings so they never shift across timezones the way Date objects do.

export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse 'YYYY-MM-DD' as a *local* midnight, not UTC.
export const parseDate = (str) => {
  if (!str || typeof str !== 'string') return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export const formatDate = (str) => {
  const d = parseDate(str)
  if (!d) return '—'
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export const daysBetween = (fromStr, toStr) => {
  const a = parseDate(fromStr)
  const b = parseDate(toStr) || new Date()
  if (!a) return null
  return Math.max(0, Math.round((b - a) / 86400000))
}

// How long an item has been sitting: listed → sold, or listed → today.
export const daysListed = (item) => {
  const start = item?.listedDate || item?.acquiredDate
  const end = item?.status === 'sold' ? item?.sale?.date : null
  return daysBetween(start, end)
}

export const monthKey = (str) => (str && str.length >= 7 ? str.slice(0, 7) : '')

export const monthLabel = (key) => {
  if (!key) return '—'
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export const currentMonthKey = () => getLocalDateString().slice(0, 7)
