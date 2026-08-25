// The marketplaces an item can be listed on or sold through, plus the fee rates
// used to *estimate* a cut before you know the real one.
//
// Estimates never overrule reality: once a sale carries the payout you actually
// received, the fee is derived from that instead and these rates are ignored.
// They matter in two places — a sale logged before the payout lands, and the
// projected net on something still listed.
//
// A schedule is: fee = base * (percent / 100) + fixed, where `base` is the item
// price alone, or price + shipping charged when `includesShipping`.

export const PLATFORMS = {
  depop: {
    id: 'depop',
    label: 'Depop',
    // US: the 10% selling fee was dropped in 2024 (buyers pay it instead);
    // what's left for the seller is payment processing on the whole order.
    defaultFees: { percent: 3.3, fixed: 0.45, includesShipping: true },
  },
  ebay: {
    id: 'ebay',
    label: 'eBay',
    // Final value fee for most categories, plus the per-order fixed fee.
    defaultFees: { percent: 13.25, fixed: 0.40, includesShipping: true },
  },
  vinted: {
    id: 'vinted',
    label: 'Vinted',
    // No seller fees — the buyer pays Buyer Protection on top.
    defaultFees: { percent: 0, fixed: 0, includesShipping: false },
  },
  other: {
    id: 'other',
    label: 'Other',
    defaultFees: { percent: 0, fixed: 0, includesShipping: false },
  },
}

export const PLATFORM_IDS = Object.keys(PLATFORMS)

export const platformLabel = (id) => PLATFORMS[id]?.label || id || '—'

// The fee-schedule map stored in user settings, seeded from the defaults.
export function defaultFeeSettings() {
  return Object.fromEntries(
    PLATFORM_IDS.map(id => [id, { ...PLATFORMS[id].defaultFees }])
  )
}

// Settings written by an older build may be missing a platform: fill the gaps
// so callers can always index straight into the result.
export function withFeeDefaults(feeSettings) {
  const base = defaultFeeSettings()
  if (!feeSettings) return base
  for (const id of PLATFORM_IDS) {
    base[id] = { ...base[id], ...(feeSettings[id] || {}) }
  }
  return base
}
