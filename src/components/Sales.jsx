import { useMemo } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { totalProfit, formatMoney, formatSigned } from '../lib/money'
import { monthKey, monthLabel, getLocalDateString } from '../lib/date'
import { itemsToCsv, downloadCsv } from '../lib/csv'
import { useIsDesktop } from '../lib/useMediaQuery'
import { SalesTable } from './tables'
import { ItemRow, EmptyState } from './ui'

export default function Sales({ onOpenItem }) {
  const { items, loading, currency, feeSettings } = useItems()
  const isDesktop = useIsDesktop()

  // Sold items bucketed by the month they sold in, newest month first.
  const months = useMemo(() => {
    const sold = items
      .filter(i => i.status === 'sold')
      .sort((a, b) => (b.sale?.date || '').localeCompare(a.sale?.date || ''))

    const groups = new Map()
    for (const item of sold) {
      const key = monthKey(item.sale?.date) || 'unknown'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    return [...groups.entries()].map(([key, group]) => ({
      key,
      items: group,
      totals: totalProfit(group, feeSettings),
    }))
  }, [items, feeSettings])

  const handleExport = () => {
    const sold = items.filter(i => i.status === 'sold')
    downloadCsv(`sales-${getLocalDateString()}.csv`, itemsToCsv(sold, feeSettings))
  }

  if (loading) return <p className="muted">Loading sales…</p>

  if (months.length === 0) {
    return (
      <EmptyState title="No sales logged yet">
        When something sells, open it from Inventory and tap “Mark as sold”. The
        profit after fees, shipping and what you paid lands here.
      </EmptyState>
    )
  }

  return (
    <>
      <div className="page-head">
        <span className="section-label">{months.reduce((n, m) => n + m.items.length, 0)} sales</span>
        <button className="btn btn-sm" onClick={handleExport}>Export CSV</button>
      </div>

      {months.map(month => (
        <div key={month.key}>
          <div className="month-head">
            <span className="section-label">{monthLabel(month.key)}</span>
            <span className={`month-total ${month.totals.net >= 0 ? 'pos' : 'neg'}`}>
              {formatSigned(month.totals.net, currency)}
              <span className="dimmed"> · {formatMoney(month.totals.gross, currency)} in</span>
            </span>
          </div>
          {isDesktop ? (
            <SalesTable
              items={month.items}
              currency={currency}
              feeSettings={feeSettings}
              onOpenItem={onOpenItem}
            />
          ) : (
            <div className="item-list">
              {month.items.map(item => (
                <ItemRow key={item.id} item={item} currency={currency} feeSettings={feeSettings}
                  onClick={() => onOpenItem(item)} />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
