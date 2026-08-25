import { describe, it, expect } from 'vitest'
import { computeProfit, estimateFees, totalProfit, projectedNet, writeOffTotal } from './money'
import { defaultFeeSettings } from './platforms'

const fees = defaultFeeSettings()

// A typical eBay sale: $40 item, buyer paid $5 shipping, $38.64 hit the account.
const item = {
  cost: 8,
  sale: { platform: 'ebay', price: 40, shippingCharged: 5, payout: 38.64, shippingCost: 4.5, otherCosts: 0.5 },
}

describe('estimateFees', () => {
  it('charges eBay on price plus shipping', () => {
    // (40 + 5) * 13.25% + 0.40
    expect(estimateFees({ platform: 'ebay', price: 40, shippingCharged: 5 }, fees)).toBe(6.36)
  })

  it('charges Depop payment processing on the whole order', () => {
    // (30 + 4) * 3.3% + 0.45
    expect(estimateFees({ platform: 'depop', price: 30, shippingCharged: 4 }, fees)).toBe(1.57)
  })

  it('charges nothing on Vinted', () => {
    expect(estimateFees({ platform: 'vinted', price: 30, shippingCharged: 4 }, fees)).toBe(0)
  })

  it('returns zero rather than a bare fixed fee for an empty sale', () => {
    expect(estimateFees({ platform: 'ebay', price: 0, shippingCharged: 0 }, fees)).toBe(0)
  })

  it('falls back to the "other" schedule for an unknown platform', () => {
    expect(estimateFees({ platform: 'grailed', price: 50 }, fees)).toBe(0)
  })
})

describe('computeProfit with a payout entered', () => {
  it('derives the platform cut from what the buyer paid and what you were paid', () => {
    const p = computeProfit(item, fees)
    expect(p.gross).toBe(45)
    expect(p.payout).toBe(38.64)
    expect(p.fees).toBe(6.36) // 45 - 38.64, not the rate table
    expect(p.feesEstimated).toBe(false)
  })

  it('nets the payout against every cost', () => {
    const p = computeProfit(item, fees)
    expect(p.costs).toBe(13) // 8 + 4.5 + 0.5
    expect(p.net).toBe(25.64) // 38.64 - 13
  })

  it('ignores the rate table entirely, even a wildly wrong one', () => {
    const silly = { ...fees, ebay: { percent: 90, fixed: 10, includesShipping: true } }
    expect(computeProfit(item, silly).fees).toBe(6.36)
  })

  it('treats a zero payout as a real number, not a missing one', () => {
    const p = computeProfit({ ...item, sale: { ...item.sale, payout: 0 } }, fees)
    expect(p.feesEstimated).toBe(false)
    expect(p.payout).toBe(0)
    expect(p.fees).toBe(45)
    expect(p.net).toBe(-13)
  })

  it('reports a negative platform cut when the payout exceeds what the buyer paid', () => {
    // Wrong data rather than a real scenario — the sell sheet flags it.
    expect(computeProfit({ ...item, sale: { ...item.sale, payout: 50 } }, fees).fees).toBe(-5)
  })
})

describe('computeProfit falling back to an estimate', () => {
  const noPayout = { ...item, sale: { ...item.sale, payout: '' } }

  it('uses the rate table when the payout has not been entered', () => {
    const p = computeProfit(noPayout, fees)
    expect(p.fees).toBe(6.36) // estimated this time
    expect(p.payout).toBe(38.64) // gross less the estimate
    expect(p.net).toBe(25.64)
    expect(p.feesEstimated).toBe(true)
  })

  it('follows an edited rate table', () => {
    const cheaper = { ...fees, ebay: { percent: 10, fixed: 0, includesShipping: true } }
    const p = computeProfit(noPayout, cheaper)
    expect(p.fees).toBe(4.5)
    expect(p.net).toBe(27.5)
  })

  it('treats a null payout the same as a blank one', () => {
    expect(computeProfit({ ...item, sale: { ...item.sale, payout: null } }, fees).feesEstimated).toBe(true)
  })
})

describe('computeProfit edge cases', () => {
  it('reports margin on revenue and ROI on cost of goods', () => {
    const p = computeProfit(item, fees)
    expect(p.margin).toBeCloseTo(25.64 / 45, 6)
    expect(p.roi).toBeCloseTo(25.64 / 8, 6)
  })

  it('leaves ROI null for a free item instead of dividing by zero', () => {
    expect(computeProfit({ ...item, cost: 0 }, fees).roi).toBeNull()
  })

  it('leaves margin null when there is no revenue at all', () => {
    expect(computeProfit({ cost: 5, sale: {} }, fees).margin).toBeNull()
  })

  it('handles a loss', () => {
    const p = computeProfit({ cost: 50, sale: { platform: 'vinted', price: 20, payout: 20 } }, fees)
    expect(p.net).toBe(-30)
  })

  it('reads string form values without producing NaN', () => {
    const p = computeProfit({
      cost: '8',
      sale: { platform: 'ebay', price: '40', shippingCharged: '5', payout: '38.64', shippingCost: '', otherCosts: null },
    }, fees)
    expect(p.fees).toBe(6.36)
    expect(p.net).toBe(30.64) // 38.64 - 8
  })

  it('survives an item with no sale attached', () => {
    const p = computeProfit({ cost: 12 }, fees)
    expect(p.gross).toBe(0)
    expect(p.net).toBe(-12)
  })
})

describe('totalProfit', () => {
  it('sums a mixed batch of sales', () => {
    const sold = [
      { cost: 8, sale: { platform: 'vinted', price: 30, payout: 30 } },
      { cost: 10, sale: { platform: 'vinted', price: 5, payout: 5 } },
    ]
    const t = totalProfit(sold, fees)
    expect(t.count).toBe(2)
    expect(t.gross).toBe(35)
    expect(t.net).toBe(17) // (30-8) + (5-10)
  })

  it('counts how many rows are leaning on an estimate', () => {
    const t = totalProfit([item, { cost: 1, sale: { platform: 'ebay', price: 10 } }], fees)
    expect(t.count).toBe(2)
    expect(t.estimated).toBe(1)
  })

  it('returns zeros for an empty list', () => {
    expect(totalProfit([], fees)).toEqual({
      gross: 0, payout: 0, fees: 0, costs: 0, net: 0, count: 0, estimated: 0,
    })
  })
})

describe('writeOffTotal', () => {
  it('adds up what donated stock cost', () => {
    const donated = [{ cost: 5 }, { cost: 12.5 }, { cost: 0 }]
    expect(writeOffTotal(donated)).toEqual({ cost: 17.5, count: 3 })
  })

  it('ignores the asking price — the write-off is what you paid, not what you hoped for', () => {
    expect(writeOffTotal([{ cost: 5, listPrice: 40 }]).cost).toBe(5)
  })

  it('returns zeros when nothing has been donated', () => {
    expect(writeOffTotal([])).toEqual({ cost: 0, count: 0 })
  })
})

describe('projectedNet', () => {
  it('estimates take-home at the asking price on the first platform listed', () => {
    expect(projectedNet({ listPrice: 40, cost: 8, platforms: ['ebay'] }, fees)).toBe(26.3)
  })

  it('is null for an item with no asking price yet', () => {
    expect(projectedNet({ cost: 8, platforms: ['ebay'] }, fees)).toBeNull()
  })
})
