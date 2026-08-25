// Money helpers and the profit math. Pure functions only — see money.test.js.

import { withFeeDefaults } from './platforms'

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Form fields arrive as strings ('', '12.50'); treat anything unusable as 0.
export const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function formatMoney(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num(amount))
  } catch {
    return `${round2(amount).toFixed(2)}`
  }
}

// Compact signed form for deltas, e.g. "+$14.20" / "-$3.00".
export function formatSigned(amount, currency = 'USD') {
  const n = round2(amount)
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatMoney(Math.abs(n), currency)}`
}

export function formatPercent(fraction, digits = 0) {
  if (!Number.isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

// What the platform's rate table says a sale should cost. Only ever a stand-in
// for the real figure — see computeProfit.
export function estimateFees(sale, feeSettings) {
  const fees = withFeeDefaults(feeSettings)
  const schedule = fees[sale?.platform] || fees.other
  const price = num(sale?.price)
  const shippingCharged = num(sale?.shippingCharged)
  const base = schedule.includesShipping ? price + shippingCharged : price
  if (base <= 0) return 0
  return round2(base * (num(schedule.percent) / 100) + num(schedule.fixed))
}

// Full profit breakdown for a sold item.
//
//   gross = what the buyer paid — item price + any shipping they covered
//   fees  = what the platform kept
//   net   = your payout, less the item and the shipping label
//
// The payout is the pivot. Enter what actually landed in your account and the
// fee is derived from it, exact by construction. Leave it blank — the sale is
// logged, the payout has not cleared — and the platform's rate table fills in
// until you come back with the real number. `feesEstimated` says which of the
// two you are looking at, and every screen that shows a fee says so too.
//
// `margin` is net over gross revenue; `roi` is net over cost of goods (null when
// the item cost nothing, since dividing by zero isn't a useful number).
export function computeProfit(item, feeSettings) {
  const sale = item?.sale || {}
  const price = num(sale.price)
  const shippingCharged = num(sale.shippingCharged)
  const gross = round2(price + shippingCharged)

  const hasPayout = sale.payout !== '' && sale.payout !== null && sale.payout !== undefined

  let payout
  let fees
  if (hasPayout) {
    payout = round2(num(sale.payout))
    fees = round2(gross - payout)
  } else {
    fees = estimateFees(sale, feeSettings)
    payout = round2(gross - fees)
  }

  const cogs = num(item?.cost)
  const shippingCost = num(sale.shippingCost)
  const otherCosts = num(sale.otherCosts)
  const costs = round2(cogs + shippingCost + otherCosts)

  const net = round2(payout - costs)

  return {
    gross,
    payout,
    fees,
    cogs: round2(cogs),
    shippingCost: round2(shippingCost),
    otherCosts: round2(otherCosts),
    costs,
    net,
    margin: gross > 0 ? net / gross : null,
    roi: cogs > 0 ? net / cogs : null,
    feesEstimated: !hasPayout,
  }
}

// Aggregate a list of sold items into one set of totals.
export function totalProfit(items, feeSettings) {
  return items.reduce(
    (acc, item) => {
      const p = computeProfit(item, feeSettings)
      acc.gross += p.gross
      acc.payout += p.payout
      acc.fees += p.fees
      acc.costs += p.costs
      acc.net += p.net
      acc.count += 1
      if (p.feesEstimated) acc.estimated += 1
      return acc
    },
    { gross: 0, payout: 0, fees: 0, costs: 0, net: 0, count: 0, estimated: 0 }
  )
}

// Donated stock never earns its cost back, so that cost is a write-off. Kept
// apart from sale profit rather than folded into it: "I made $40 on that jacket"
// and "I gave up on $18 of stock" are two different facts, and averaging them
// into one number hides both.
export function writeOffTotal(items) {
  return items.reduce(
    (acc, item) => {
      acc.cost = round2(acc.cost + num(item?.cost))
      acc.count += 1
      return acc
    },
    { cost: 0, count: 0 }
  )
}

// What a listing would net at its asking price, before it sells. Shipping is
// unknown at this point, so this is price-only — useful for pricing decisions.
export function projectedNet(item, feeSettings) {
  const price = num(item?.listPrice)
  if (price <= 0) return null
  const platform = item?.platforms?.[0] || 'other'
  const fees = estimateFees({ platform, price, shippingCharged: 0 }, feeSettings)
  return round2(price - fees - num(item?.cost))
}
