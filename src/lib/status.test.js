import { describe, it, expect } from 'vitest'
import { isOnHand, isSold, isDonated, statusAfterUndo } from './status'

describe('lifecycle helpers', () => {
  it('counts only inventory and listed items as stock on hand', () => {
    expect(isOnHand({ status: 'inventory' })).toBe(true)
    expect(isOnHand({ status: 'listed' })).toBe(true)
    // Both of these have left the shelf and must stay out of cash-tied-up.
    expect(isOnHand({ status: 'sold' })).toBe(false)
    expect(isOnHand({ status: 'donated' })).toBe(false)
  })

  it('keeps sold and donated apart', () => {
    expect(isSold({ status: 'sold' })).toBe(true)
    expect(isSold({ status: 'donated' })).toBe(false)
    expect(isDonated({ status: 'donated' })).toBe(true)
  })

  it('survives an item with no status at all', () => {
    expect(isOnHand({})).toBe(false)
    expect(isOnHand(undefined)).toBe(false)
  })

  it('sends an undone item back to listed only if it is still on a platform', () => {
    expect(statusAfterUndo({ platforms: ['depop'] })).toBe('listed')
    expect(statusAfterUndo({ platforms: [] })).toBe('inventory')
    expect(statusAfterUndo({})).toBe('inventory')
  })
})
