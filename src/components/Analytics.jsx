import { useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useItems } from '../contexts/ItemsContext'
import { useThemeColors } from '../lib/theme'
import { computeProfit, totalProfit, formatMoney, formatPercent, num } from '../lib/money'
import { monthKey, monthLabel, daysListed } from '../lib/date'
import { PLATFORM_IDS, platformLabel } from '../lib/platforms'
import { isOnHand } from '../lib/status'
import { EmptyState } from './ui'

const TOKENS = [
  'success-color', 'danger-color', 'border-subtle', 'text-dimmed', 'bg-secondary',
  'border-color', 'text-primary', 'accent-primary',
  'depop-color', 'ebay-color', 'vinted-color', 'other-color',
]

const MONTHS_SHOWN = 12
const AGE_BUCKETS = [
  { label: '0–30 days', min: 0, max: 30 },
  { label: '31–60', min: 31, max: 60 },
  { label: '61–90', min: 61, max: 90 },
  { label: '90+', min: 91, max: Infinity },
]

// Every calendar month from the first sale to now, so gaps read as gaps rather
// than being silently skipped by the axis.
function monthSeries(sold, feeSettings) {
  if (sold.length === 0) return []
  const keys = sold.map(i => monthKey(i.sale?.date)).filter(Boolean).sort()
  const [startY, startM] = keys[0].split('-').map(Number)
  const now = new Date()

  const series = []
  const cursor = new Date(startY, startM - 1, 1)
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const inMonth = sold.filter(i => monthKey(i.sale?.date) === key)
    const totals = totalProfit(inMonth, feeSettings)
    series.push({
      key,
      // Axis ticks stay short; January carries the year so the span is readable.
      label: cursor.toLocaleDateString(undefined, {
        month: 'short',
        ...(cursor.getMonth() === 0 ? { year: '2-digit' } : {}),
      }),
      net: totals.net,
      gross: totals.gross,
      fees: totals.fees,
      count: totals.count,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return series.slice(-MONTHS_SHOWN)
}

function ProfitTooltip({ active, payload, colors, currency }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: colors['bg-secondary'],
      border: `1px solid ${colors['border-color']}`,
      borderRadius: 10,
      padding: '8px 11px',
      color: colors['text-primary'],
      fontSize: 12.5,
      boxShadow: '0 8px 24px rgba(0,0,0,.3)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 3 }}>{monthLabel(d.key)}</div>
      <div>{formatMoney(d.net, currency)} net</div>
      <div style={{ color: colors['text-dimmed'] }}>
        {d.count} sold · {formatMoney(d.gross, currency)} in · {formatMoney(d.fees, currency)} fees
      </div>
    </div>
  )
}

// A labelled proportional bar — identity comes from the written label, colour
// only reinforces it.
function BreakdownBar({ label, value, share, color, currency, note }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontWeight: 600 }}>
          {formatMoney(value, currency)}
          {note && <span className="dimmed" style={{ fontWeight: 400 }}> · {note}</span>}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(0, Math.min(1, share)) * 100}%`,
          height: '100%',
          borderRadius: 4,
          background: color,
        }} />
      </div>
    </div>
  )
}

export default function Analytics() {
  const { items, loading, currency, feeSettings } = useItems()
  const colors = useThemeColors(TOKENS)

  const sold = useMemo(() => items.filter(i => i.status === 'sold'), [items])
  const series = useMemo(() => monthSeries(sold, feeSettings), [sold, feeSettings])

  const byPlatform = useMemo(() => {
    const rows = PLATFORM_IDS.map(id => {
      const group = sold.filter(i => i.sale?.platform === id)
      return { id, label: platformLabel(id), ...totalProfit(group, feeSettings) }
    }).filter(r => r.count > 0)
    const max = Math.max(1, ...rows.map(r => Math.abs(r.net)))
    return { rows: rows.sort((a, b) => b.net - a.net), max }
  }, [sold, feeSettings])

  const byCategory = useMemo(() => {
    const groups = new Map()
    for (const item of sold) {
      const key = item.category?.trim() || 'Uncategorised'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    return [...groups.entries()]
      .map(([label, group]) => {
        const t = totalProfit(group, feeSettings)
        const days = group.map(daysListed).filter(d => d !== null)
        return {
          label,
          ...t,
          margin: t.gross > 0 ? t.net / t.gross : null,
          avgDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
        }
      })
      .sort((a, b) => b.net - a.net)
      .slice(0, 8)
  }, [sold, feeSettings])

  const aging = useMemo(() => {
    const onHand = items.filter(isOnHand)
    return AGE_BUCKETS.map(bucket => {
      const group = onHand.filter(i => {
        const d = daysListed(i)
        return d !== null && d >= bucket.min && d <= bucket.max
      })
      return {
        label: bucket.label,
        count: group.length,
        cost: group.reduce((sum, i) => sum + num(i.cost), 0),
      }
    })
  }, [items])

  const best = useMemo(() => {
    if (sold.length === 0) return null
    return sold
      .map(item => ({ item, profit: computeProfit(item, feeSettings) }))
      .sort((a, b) => b.profit.net - a.profit.net)[0]
  }, [sold, feeSettings])

  if (loading) return <p className="muted">Loading…</p>

  if (sold.length === 0) {
    return (
      <EmptyState title="No numbers yet">
        Log a sale or two and this page fills in: profit by month, which platform
        actually pays, and what sits unsold the longest.
      </EmptyState>
    )
  }

  const maxAgingCost = Math.max(1, ...aging.map(a => a.cost))

  return (
    <>
      <div className="card chart-card">
        <div className="chart-head">
          <span className="section-label">Net profit by month</span>
          <span className="dimmed" style={{ fontSize: 12 }}>after fees & shipping</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={series} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={colors['border-subtle']} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: colors['text-dimmed'], fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              width={46}
              tickLine={false}
              axisLine={false}
              tick={{ fill: colors['text-dimmed'], fontSize: 10 }}
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : v)}
            />
            <Tooltip
              cursor={{ fill: colors['border-subtle'], opacity: 0.45 }}
              content={<ProfitTooltip colors={colors} currency={currency} />}
            />
            {/* Animation off: recharts 3.10 renders the bar shapes empty until the
                entry animation completes, which under StrictMode it never does. */}
            <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={38} isAnimationActive={false}>
              {series.map(entry => (
                <Cell
                  key={entry.key}
                  fill={entry.net >= 0 ? colors['success-color'] : colors['danger-color']}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card settings-group">
        <span className="section-label">Profit by platform</span>
        {byPlatform.rows.map(row => (
          <BreakdownBar
            key={row.id}
            label={row.label}
            value={row.net}
            share={Math.abs(row.net) / byPlatform.max}
            color={colors[`${row.id}-color`]}
            currency={currency}
            note={`${row.count} sold · ${formatMoney(row.fees, currency)} fees`}
          />
        ))}
      </div>

      <div className="card settings-group">
        <span className="section-label">Cash sitting in unsold stock</span>
        {aging.map(bucket => (
          <BreakdownBar
            key={bucket.label}
            label={bucket.label}
            value={bucket.cost}
            share={bucket.cost / maxAgingCost}
            color={colors['accent-primary']}
            currency={currency}
            note={`${bucket.count} item${bucket.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>

      <div className="card">
        <span className="section-label">By category</span>
        <div className="breakdown" style={{ marginTop: 8 }}>
          {byCategory.map(row => (
            <div key={row.label} className="breakdown-row">
              <span className="breakdown-label">
                {row.label}
                <span className="dimmed"> · {row.count} sold</span>
              </span>
              <span className={`breakdown-value ${row.net >= 0 ? 'pos' : 'neg'}`}>
                {formatMoney(row.net, currency)}
                <span className="dimmed" style={{ fontWeight: 400 }}>
                  {' '}{formatPercent(row.margin)}{row.avgDays !== null ? ` · ${row.avgDays}d` : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {best && (
        <div className="card">
          <span className="section-label">Best flip so far</span>
          <div className="breakdown" style={{ marginTop: 8 }}>
            <div className="breakdown-row">
              <span className="breakdown-label">{best.item.title}</span>
              <span className="breakdown-value pos">{formatMoney(best.profit.net, currency)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">
                {formatMoney(best.profit.cogs, currency)} in ·{' '}
                {formatMoney(best.item.sale?.price, currency)} out on{' '}
                {platformLabel(best.item.sale?.platform)}
              </span>
              <span className="breakdown-value">
                {best.profit.roi === null ? '—' : `${formatPercent(best.profit.roi)} ROI`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
