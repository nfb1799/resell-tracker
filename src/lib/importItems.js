// Bulk import: turning a pasted JSON array into the same item shape the "New
// item" form produces.
//
// Parsing and validation are pure and live here; the writing is done by the
// importer component through the ordinary addItem/setPhoto path, so an imported
// item is indistinguishable from a hand-entered one.
//
// The JSON uses the field names a person would write, which are not always the
// names the document uses (`sourcedFrom` → `source`, `askingPrice` → `listPrice`,
// a single `listingPlatform` → the `platforms` array). Both spellings are
// accepted so an export of this app's own data imports cleanly too.

import { PLATFORMS, PLATFORM_IDS } from './platforms'
import { CONDITIONS, blankItem } from './itemFields'
import { getLocalDateString } from './date'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// "Depop" / "depop" / "eBay" / "ebay" all land on the right id.
const PLATFORM_BY_LABEL = new Map(
  PLATFORM_IDS.flatMap(id => [
    [id.toLowerCase(), id],
    [PLATFORMS[id].label.toLowerCase(), id],
  ])
)

const CONDITION_BY_LABEL = new Map(CONDITIONS.map(c => [c.toLowerCase(), c]))

const firstDefined = (row, ...names) => {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') return row[name]
  }
  return undefined
}

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

// Accepts 20, "20", "$20.50"; rejects "twenty" rather than quietly storing 0,
// because a cost silently becoming zero corrupts every profit figure downstream.
function readMoney(value, field, errors) {
  if (isBlank(value)) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      errors.push(`${field} is not a number`)
      return ''
    }
    return value
  }
  if (typeof value !== 'string') {
    errors.push(`${field} is not a number`)
    return ''
  }
  const cleaned = value.replace(/[$£€,\s]/g, '')
  const n = Number(cleaned)
  if (cleaned === '' || !Number.isFinite(n)) {
    errors.push(`${field} is not a number (got ${JSON.stringify(value)})`)
    return ''
  }
  return n
}

function readDate(value, field, errors) {
  if (isBlank(value)) return ''
  if (typeof value !== 'string' || !DATE_PATTERN.test(value.trim())) {
    errors.push(`${field} must look like 2026-08-28 (got ${JSON.stringify(value)})`)
    return ''
  }
  return value.trim()
}

function readText(value) {
  if (isBlank(value)) return ''
  return String(value).trim()
}

function readPlatforms(value, errors) {
  if (isBlank(value)) return []
  const list = Array.isArray(value) ? value : [value]
  const ids = []
  for (const entry of list) {
    if (isBlank(entry)) continue
    const id = PLATFORM_BY_LABEL.get(String(entry).trim().toLowerCase())
    if (!id) {
      errors.push(
        `listingPlatform ${JSON.stringify(entry)} is not one of ` +
        PLATFORM_IDS.map(p => PLATFORMS[p].label).join(', ')
      )
      continue
    }
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

function readCondition(value, errors) {
  if (isBlank(value)) return undefined
  const match = CONDITION_BY_LABEL.get(String(value).trim().toLowerCase())
  if (!match) {
    errors.push(`condition ${JSON.stringify(value)} is not one of ${CONDITIONS.join(', ')}`)
    return undefined
  }
  return match
}

// A photo is either somewhere to fetch from or an inline data URI. Anything else
// is a typo worth reporting rather than silently dropping.
function readPhoto(value, errors) {
  if (isBlank(value)) return null
  const src = String(value).trim()
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(src)) return { src, kind: 'data-uri' }
  if (/^https?:\/\//i.test(src)) return { src, kind: 'url' }
  errors.push('photo must be an http(s) URL or a data:image/…;base64 URI')
  return null
}

// One row in, one decision out. `errors` non-empty means the row is skipped.
export function normaliseRow(raw, index) {
  const rowNumber = index + 1
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { rowNumber, label: `Row ${rowNumber}`, errors: ['not a JSON object'] }
  }

  const errors = []
  const title = readText(firstDefined(raw, 'title', 'name'))
  if (!title) errors.push('title is required')

  const condition = readCondition(firstDefined(raw, 'condition'), errors)
  const platforms = readPlatforms(
    firstDefined(raw, 'listingPlatform', 'listingPlatforms', 'platform', 'platforms'),
    errors
  )
  const cost = readMoney(firstDefined(raw, 'cost'), 'cost', errors)
  const listPrice = readMoney(firstDefined(raw, 'askingPrice', 'listPrice'), 'askingPrice', errors)
  const acquiredDate = readDate(firstDefined(raw, 'acquiredDate'), 'acquiredDate', errors)
  const listedDate = readDate(firstDefined(raw, 'listedDate'), 'listedDate', errors)
  const photo = readPhoto(firstDefined(raw, 'photo', 'photoUrl', 'image', 'imageUrl'), errors)

  const label = title || `Row ${rowNumber}`
  if (errors.length) return { rowNumber, label, errors }

  // Start from the form's own defaults, then lay the row over the top, so an
  // imported item carries exactly what a hand-added one would.
  const defaults = blankItem()
  const listed = platforms.length > 0

  return {
    rowNumber,
    label,
    errors: [],
    photo,
    item: {
      ...defaults,
      title,
      brand: readText(firstDefined(raw, 'brand')),
      size: readText(firstDefined(raw, 'size')),
      category: readText(firstDefined(raw, 'category')),
      condition: condition ?? defaults.condition,
      notes: readText(firstDefined(raw, 'notes')),
      source: readText(firstDefined(raw, 'sourcedFrom', 'source')),
      cost: cost === '' ? 0 : cost,
      listPrice: listPrice === '' ? 0 : listPrice,
      acquiredDate: acquiredDate || defaults.acquiredDate,
      platforms,
      // Naming a platform is what makes an item "listed" in the form, and the
      // listed date defaults to today there too.
      status: listed ? 'listed' : 'inventory',
      listedDate: listed ? (listedDate || getLocalDateString()) : listedDate,
    },
  }
}

// Text (pasted or read off a file) → rows ready to import, or a parse failure.
export function parseImport(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return { fatal: 'Nothing to import yet — paste a JSON array or choose a file.', rows: [] }

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch (error) {
    return { fatal: `That is not valid JSON: ${error.message}`, rows: [] }
  }

  // A single object is an obvious enough intent to accept.
  const list = Array.isArray(parsed) ? parsed : [parsed]
  if (list.length === 0) return { fatal: 'The array is empty — nothing to import.', rows: [] }

  const rows = list.map(normaliseRow)
  return {
    fatal: null,
    rows,
    valid: rows.filter(r => r.errors.length === 0),
    invalid: rows.filter(r => r.errors.length > 0),
  }
}
