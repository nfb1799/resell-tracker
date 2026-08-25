// CSV export — one row per item, with the full profit breakdown flattened so
// the file is usable as-is for bookkeeping or a tax return.

import { computeProfit } from './money'
import { daysListed } from './date'

const HEADERS = [
  'Title', 'Brand', 'Category', 'Size', 'Condition', 'Status',
  'Source', 'Acquired', 'Cost', 'Listed on', 'Listed date', 'List price',
  'Sold platform', 'Sold date', 'Listed for at sale', 'Offer accepted',
  'Shipping charged', 'Payout', 'Fees kept by platform', 'Fees estimated',
  'Shipping cost', 'Other costs', 'Net profit', 'Margin %',
  'Donated date', 'Donated to', 'Receipt value', 'Written off',
  'Days listed', 'Notes',
]

const escape = (value) => {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function itemsToCsv(items, feeSettings) {
  const rows = items.map(item => {
    const sold = item.status === 'sold'
    const donated = item.status === 'donated'
    const p = sold ? computeProfit(item, feeSettings) : null
    return [
      item.title, item.brand, item.category, item.size,
      item.condition, item.status, item.source, item.acquiredDate,
      item.cost ?? '', (item.platforms || []).join(' + '), item.listedDate,
      item.listPrice ?? '',
      sold ? item.sale?.platform : '', sold ? item.sale?.date : '',
      sold ? item.sale?.listedFor ?? '' : '',
      sold ? item.sale?.price ?? '' : '',
      sold ? item.sale?.shippingCharged ?? '' : '',
      sold ? p.payout : '', sold ? p.fees : '',
      sold ? (p.feesEstimated ? 'yes' : 'no') : '',
      sold ? p.shippingCost : '', sold ? p.otherCosts : '',
      sold ? p.net : '',
      sold && p.margin !== null ? (p.margin * 100).toFixed(1) : '',
      donated ? item.donation?.date ?? '' : '',
      donated ? item.donation?.org ?? '' : '',
      donated ? item.donation?.receiptValue ?? '' : '',
      donated ? item.cost ?? '' : '',
      daysListed(item) ?? '', item.notes,
    ].map(escape).join(',')
  })
  return [HEADERS.join(','), ...rows].join('\n')
}

export function downloadCsv(filename, csv) {
  // Prepend a BOM so Excel opens UTF-8 titles (é, ™, …) correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
