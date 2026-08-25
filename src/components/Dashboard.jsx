import { useMemo } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { totalProfit, writeOffTotal, formatMoney, formatPercent, num } from '../lib/money'
import { currentMonthKey, monthKey, monthLabel, daysListed } from '../lib/date'
import { isOnHand, isSold, isDonated } from '../lib/status'
import { StatTile, ItemRow, EmptyState } from './ui'

const STALE_DAYS = 45

export default function Dashboard({ onOpenItem, onSellItem, onAddItem }) {
  const { items, loading, currency, feeSettings, settings } = useItems()

  const stats = useMemo(() => {
    const sold = items.filter(isSold)
    const onHand = items.filter(isOnHand)
    const thisMonth = sold.filter(i => monthKey(i.sale?.date) === currentMonthKey())

    const month = totalProfit(thisMonth, feeSettings)
    const allTime = totalProfit(sold, feeSettings)
    const writeOffs = writeOffTotal(items.filter(isDonated))

    const tiedUp = onHand.reduce((sum, i) => sum + num(i.cost), 0)
    const listed = onHand.filter(i => i.status === 'listed')
    const listedValue = listed.reduce((sum, i) => sum + num(i.listPrice), 0)

    const daysToSell = sold.map(daysListed).filter(d => d !== null)
    const avgDays = daysToSell.length
      ? Math.round(daysToSell.reduce((a, b) => a + b, 0) / daysToSell.length)
      : null

    return {
      month,
      allTime,
      writeOffs,
      tiedUp,
      onHandCount: onHand.length,
      listedCount: listed.length,
      listedValue,
      avgDays,
      avgMargin: month.gross > 0 ? month.net / month.gross : null,
    }
  }, [items, feeSettings])

  const recentSales = useMemo(
    () => items
      .filter(i => i.status === 'sold')
      .sort((a, b) => (b.sale?.date || '').localeCompare(a.sale?.date || ''))
      .slice(0, 5),
    [items]
  )

  const stale = useMemo(
    () => items
      .filter(i => i.status === 'listed' && (daysListed(i) ?? 0) >= STALE_DAYS)
      .sort((a, b) => (daysListed(b) ?? 0) - (daysListed(a) ?? 0))
      .slice(0, 5),
    [items]
  )

  const goal = num(settings.profitGoal)

  if (loading) return <p className="muted">Loading inventory…</p>

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing tracked yet"
        action={<button className="btn btn-primary" onClick={onAddItem}>Add your first item</button>}
      >
        Add something you have bought to resell. Once you log what it sold for, the
        profit after fees and shipping shows up here.
      </EmptyState>
    )
  }

  return (
    <>
      <div className="stat-grid">
        <StatTile
          wide
          accent
          label={`Net profit · ${monthLabel(currentMonthKey())}`}
          value={formatMoney(stats.month.net, currency)}
          tone={stats.month.net >= 0 ? 'pos' : 'neg'}
          sub={
            goal > 0
              ? `${formatPercent(stats.month.net / goal)} of your ${formatMoney(goal, currency)} goal · ${stats.month.count} sold`
              : `${stats.month.count} sold · ${formatMoney(stats.month.gross, currency)} revenue`
          }
        />
        <StatTile
          label="Margin this month"
          value={formatPercent(stats.avgMargin)}
          sub={`${formatMoney(stats.month.fees, currency)} in fees`}
        />
        <StatTile
          label="Avg days to sell"
          value={stats.avgDays === null ? '—' : `${stats.avgDays}`}
          sub="across all sales"
        />
        <StatTile
          label="Cash tied up"
          value={formatMoney(stats.tiedUp, currency)}
          sub={`${stats.onHandCount} items on hand`}
        />
        <StatTile
          label="Listed value"
          value={formatMoney(stats.listedValue, currency)}
          sub={`${stats.listedCount} live listings`}
        />
        <StatTile
          wide
          label="All-time net profit"
          value={formatMoney(stats.allTime.net, currency)}
          tone={stats.allTime.net >= 0 ? 'pos' : 'neg'}
          sub={`${stats.allTime.count} sales · ${formatMoney(stats.allTime.gross, currency)} revenue · ${formatMoney(stats.allTime.fees, currency)} fees`}
        />
        {stats.writeOffs.count > 0 && (
          <StatTile
            wide
            label="Written off"
            value={`-${formatMoney(stats.writeOffs.cost, currency)}`}
            tone="neg"
            sub={`${stats.writeOffs.count} donated · not counted against sale profit`}
          />
        )}
      </div>

      {stale.length > 0 && (
        <div>
          <div className="page-head">
            <span className="section-label">Sitting longest</span>
            <span className="dimmed" style={{ fontSize: 12 }}>{STALE_DAYS}+ days listed</span>
          </div>
          <div className="item-list" style={{ marginTop: 8 }}>
            {stale.map(item => (
              <ItemRow key={item.id} item={item} currency={currency} feeSettings={feeSettings}
                staleAfter={STALE_DAYS} onClick={() => onOpenItem(item)} onSell={onSellItem} />
            ))}
          </div>
        </div>
      )}

      {recentSales.length > 0 && (
        <div>
          <span className="section-label">Recent sales</span>
          <div className="item-list" style={{ marginTop: 8 }}>
            {recentSales.map(item => (
              <ItemRow key={item.id} item={item} currency={currency} feeSettings={feeSettings}
                onClick={() => onOpenItem(item)} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
