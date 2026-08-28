import { describe, it, expect } from 'vitest'
import { parseImport, normaliseRow } from './importItems'
import { getLocalDateString } from './date'

// The shape a person actually pastes, using the field names they would write.
const sample = {
  title: 'Nautica Polo',
  brand: 'Nautica',
  size: 'XL',
  category: 'Shirt',
  condition: 'Good',
  cost: 0,
  acquiredDate: '2026-08-28',
  sourcedFrom: 'Dad',
  listingPlatform: 'Depop',
  askingPrice: 20,
  listedDate: '2026-08-28',
  notes: '',
  photo: 'https://example.com/P0.jpg',
}

describe('normaliseRow field mapping', () => {
  it('maps the written field names onto the stored ones', () => {
    const { item, errors } = normaliseRow(sample, 0)
    expect(errors).toEqual([])
    expect(item.title).toBe('Nautica Polo')
    expect(item.source).toBe('Dad')       // sourcedFrom
    expect(item.listPrice).toBe(20)       // askingPrice
    expect(item.platforms).toEqual(['depop']) // listingPlatform
    expect(item.cost).toBe(0)
  })

  it('also accepts this app\'s own field names, so an export round-trips', () => {
    const { item } = normaliseRow(
      { title: 'Tee', source: 'Bins', listPrice: 15, platforms: ['ebay', 'vinted'] }, 0
    )
    expect(item.source).toBe('Bins')
    expect(item.listPrice).toBe(15)
    expect(item.platforms).toEqual(['ebay', 'vinted'])
  })

  it('matches platform and condition names case-insensitively', () => {
    const { item, errors } = normaliseRow(
      { title: 'Tee', listingPlatform: 'DEPOP', condition: 'excellent' }, 0
    )
    expect(errors).toEqual([])
    expect(item.platforms).toEqual(['depop'])
    expect(item.condition).toBe('Excellent')
  })

  it('marks an item listed when a platform is named, as the form does', () => {
    const { item } = normaliseRow(sample, 0)
    expect(item.status).toBe('listed')
    expect(item.listedDate).toBe('2026-08-28')
  })

  it('leaves an item in stock when no platform is named', () => {
    const { item } = normaliseRow({ title: 'Tee' }, 0)
    expect(item.status).toBe('inventory')
    expect(item.platforms).toEqual([])
  })

  it('defaults a missing listed date to today, as the form does', () => {
    const { item } = normaliseRow({ title: 'Tee', listingPlatform: 'Vinted' }, 0)
    expect(item.listedDate).toBe(getLocalDateString())
  })

  it('falls back to the form defaults for anything absent', () => {
    const { item } = normaliseRow({ title: 'Bare' }, 0)
    expect(item.condition).toBe('Excellent')
    expect(item.acquiredDate).toBe(getLocalDateString())
    expect(item.cost).toBe(0)
    expect(item.listPrice).toBe(0)
    expect(item.notes).toBe('')
  })

  it('reads money written with a currency symbol', () => {
    const { item, errors } = normaliseRow({ title: 'Tee', cost: '$12.50', askingPrice: '40' }, 0)
    expect(errors).toEqual([])
    expect(item.cost).toBe(12.5)
    expect(item.listPrice).toBe(40)
  })
})

describe('normaliseRow validation', () => {
  it('requires a title', () => {
    expect(normaliseRow({ brand: 'Nike' }, 0).errors).toContain('title is required')
  })

  it('rejects a title that is only whitespace', () => {
    expect(normaliseRow({ title: '   ' }, 0).errors).toContain('title is required')
  })

  it('rejects an unknown condition rather than storing the typo', () => {
    const { errors } = normaliseRow({ title: 'Tee', condition: 'Mint' }, 0)
    expect(errors.join(' ')).toContain('condition "Mint" is not one of')
  })

  it('rejects an unknown platform', () => {
    const { errors } = normaliseRow({ title: 'Tee', listingPlatform: 'Grailed' }, 0)
    expect(errors.join(' ')).toContain('is not one of Depop, eBay, Vinted, Other')
  })

  it('rejects money that is not a number, rather than quietly storing zero', () => {
    const { errors } = normaliseRow({ title: 'Tee', cost: 'twenty' }, 0)
    expect(errors.join(' ')).toContain('cost is not a number')
  })

  it('rejects a malformed date', () => {
    const { errors } = normaliseRow({ title: 'Tee', acquiredDate: '28/08/2026' }, 0)
    expect(errors.join(' ')).toContain('acquiredDate must look like 2026-08-28')
  })

  it('rejects a photo that is neither a URL nor a data URI', () => {
    const { errors } = normaliseRow({ title: 'Tee', photo: 'IMG_2231.jpg' }, 0)
    expect(errors.join(' ')).toContain('photo must be an http(s) URL')
  })

  it('rejects a row that is not an object at all', () => {
    expect(normaliseRow('Nautica Polo', 0).errors).toEqual(['not a JSON object'])
    expect(normaliseRow(null, 0).errors).toEqual(['not a JSON object'])
  })

  it('collects every problem in a row, not just the first', () => {
    const { errors } = normaliseRow({ condition: 'Mint', cost: 'free' }, 0)
    expect(errors).toHaveLength(3) // title, condition, cost
  })

  it('labels a row by title when it has one, and by number when it does not', () => {
    expect(normaliseRow({ title: 'Nautica Polo' }, 4).label).toBe('Nautica Polo')
    expect(normaliseRow({ brand: 'Nike' }, 4).label).toBe('Row 5')
  })
})

describe('photo handling', () => {
  it('recognises an http URL', () => {
    expect(normaliseRow(sample, 0).photo).toEqual({ src: 'https://example.com/P0.jpg', kind: 'url' })
  })

  it('recognises a base64 data URI', () => {
    const src = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    expect(normaliseRow({ title: 'Tee', photo: src }, 0).photo).toEqual({ src, kind: 'data-uri' })
  })

  it('leaves photo null when absent', () => {
    expect(normaliseRow({ title: 'Tee' }, 0).photo).toBeNull()
  })
})

describe('parseImport', () => {
  it('splits an array into valid and invalid rows, keeping both', () => {
    const result = parseImport(JSON.stringify([sample, { brand: 'no title' }, { ...sample, title: 'Two' }]))
    expect(result.fatal).toBeNull()
    expect(result.valid).toHaveLength(2)
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0].rowNumber).toBe(2)
  })

  it('accepts a single object as a one-item import', () => {
    const result = parseImport(JSON.stringify(sample))
    expect(result.valid).toHaveLength(1)
  })

  it('reports invalid JSON without throwing', () => {
    expect(parseImport('[{title: nope}]').fatal).toMatch(/not valid JSON/)
  })

  it('reports an empty array', () => {
    expect(parseImport('[]').fatal).toMatch(/empty/)
  })

  it('reports empty input', () => {
    expect(parseImport('   ').fatal).toMatch(/Nothing to import/)
  })

  it('numbers rows from one, so the report matches what a person counts', () => {
    const result = parseImport(JSON.stringify([{ title: 'a' }, { title: 'b' }]))
    expect(result.rows.map(r => r.rowNumber)).toEqual([1, 2])
  })
})
