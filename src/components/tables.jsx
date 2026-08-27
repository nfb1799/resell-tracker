import { computeProfit, projectedNet, formatMoney, formatSigned, formatPercent } from '../lib/money'
import { formatDate, daysListed } from '../lib/date'
import { isSold, isDonated, isOnHand } from '../lib/status'
import { platformLabel } from '../lib/platforms'
import { Badge, PlatformBadge, ItemThumb } from './ui'

// Desktop-only list views. A phone row stacks a few facts vertically because
// that is all that fits; a desktop has room to put every item on one line with
// its numbers in aligned columns, which is what makes a list scannable.

// Column headers that drive the sort the page already owns, so clicking a header
// and picking from the select stay the same state.
function SortHeader({ label, active, onClick, align }) {
  return (
    <th className={align === 'right' ? 'num' : undefined}>
      <button className={`th-sort${active ? ' active' : ''}`} onClick={onClick}>
        {label}
        <span className="th-caret" aria-hidden="true">{active ? '▾' : ''}</span>
      </button>
    </th>
  )
}

export function ItemTable({ items, currency, feeSettings, sort, onSort, onOpenItem, onSell, staleAfter = 45 }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="col-thumb"><span className="sr-only">Photo</span></th>
            <SortHeader label="Item" active={sort === 'title'} onClick={() => onSort('title')} />
            <th>Status</th>
            <SortHeader label="Listed" active={sort === 'oldest'} onClick={() => onSort('oldest')} />
            <th className="num">Cost</th>
            <SortHeader
              label="Price"
              align="right"
              active={sort === 'priceHigh' || sort === 'priceLow'}
              onClick={() => onSort(sort === 'priceHigh' ? 'priceLow' : 'priceHigh')}
            />
            <th className="num">Result</th>
            <th className="col-action"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const sold = isSold(item)
            const donated = isDonated(item)
            const onHand = isOnHand(item)
            const profit = sold ? computeProfit(item, feeSettings) : null
            const days = daysListed(item)
            const stale = item.status === 'listed' && days !== null && days >= staleAfter
            const projected = onHand ? projectedNet(item, feeSettings) : null

            return (
              <tr key={item.id} onClick={() => onOpenItem(item)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpenItem(item) }}>
                <td className="col-thumb"><ItemThumb item={item} /></td>

                <td>
                  <div className="cell-title">{item.title || 'Untitled item'}</div>
                  <div className="cell-sub">
                    {[item.brand, item.size, item.category].filter(Boolean).join(' · ') || '—'}
                  </div>
                </td>

                <td>
                  <div className="cell-badges">
                    {sold
                      ? <PlatformBadge platform={item.sale?.platform} />
                      : donated
                        ? <Badge kind="donated">Donated</Badge>
                        : item.platforms?.length
                          ? item.platforms.map(p => <PlatformBadge key={p} platform={p} />)
                          : <Badge kind="inventory">Not listed</Badge>}
                  </div>
                </td>

                <td>
                  <div className="cell-title">
                    {sold ? formatDate(item.sale?.date)
                      : donated ? formatDate(item.donation?.date)
                        : days === null ? '—' : `${days}d`}
                  </div>
                  <div className={`cell-sub${stale ? ' neg' : ''}`}>
                    {sold ? `${days ?? '—'}d to sell`
                      : donated ? (item.donation?.org || 'donated')
                        : stale ? 'going stale'
                          : item.status === 'listed' ? 'listed'
                            : 'in stock'}
                  </div>
                </td>

                <td className="num mono">{formatMoney(item.cost, currency)}</td>

                <td className="num mono">
                  {sold ? formatMoney(item.sale?.price, currency)
                    : item.listPrice ? formatMoney(item.listPrice, currency) : '—'}
                </td>

                <td className="num">
                  {sold ? (
                    <>
                      <div className={`cell-title mono ${profit.net >= 0 ? 'pos' : 'neg'}`}>
                        {formatSigned(profit.net, currency)}
                      </div>
                      <div className="cell-sub">
                        {profit.feesEstimated ? 'est. · ' : ''}{formatPercent(profit.margin)} margin
                      </div>
                    </>
                  ) : donated ? (
                    <>
                      <div className="cell-title mono neg">-{formatMoney(item.cost, currency)}</div>
                      <div className="cell-sub">written off</div>
                    </>
                  ) : projected !== null ? (
                    <>
                      <div className="cell-title mono">{formatMoney(projected, currency)}</div>
                      <div className="cell-sub">est. net</div>
                    </>
                  ) : (
                    <span className="dimmed">—</span>
                  )}
                </td>

                <td className="col-action">
                  {onHand && onSell && (
                    <button
                      className="item-row-sell"
                      onClick={(e) => { e.stopPropagation(); onSell(item) }}
                      aria-label={`Mark ${item.title || 'item'} as sold`}
                    >
                      Sold
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// The sales ledger: every figure behind one month's profit, side by side, which
// is the view that makes "where did the money go" answerable at a glance.
export function SalesTable({ items, currency, feeSettings, onOpenItem }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Sold</th>
            <th>Item</th>
            <th>Platform</th>
            <th className="num">Listed for</th>
            <th className="num">Accepted</th>
            <th className="num">Payout</th>
            <th className="num">Fees</th>
            <th className="num">Costs</th>
            <th className="num">Net</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const p = computeProfit(item, feeSettings)
            const listedFor = item.sale?.listedFor
            return (
              <tr key={item.id} onClick={() => onOpenItem(item)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpenItem(item) }}>
                <td className="mono">{formatDate(item.sale?.date)}</td>
                <td>
                  <div className="cell-title">{item.title || 'Untitled item'}</div>
                  <div className="cell-sub">{[item.brand, item.size].filter(Boolean).join(' · ') || '—'}</div>
                </td>
                <td>{platformLabel(item.sale?.platform)}</td>
                <td className="num mono dimmed">{listedFor ? formatMoney(listedFor, currency) : '—'}</td>
                <td className="num mono">{formatMoney(item.sale?.price, currency)}</td>
                <td className="num mono">{formatMoney(p.payout, currency)}</td>
                <td className="num mono">
                  -{formatMoney(p.fees, currency)}
                  {p.feesEstimated && <span className="dimmed"> est.</span>}
                </td>
                <td className="num mono">-{formatMoney(p.costs, currency)}</td>
                <td className={`num mono ${p.net >= 0 ? 'pos' : 'neg'}`} style={{ fontWeight: 700 }}>
                  {formatSigned(p.net, currency)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
