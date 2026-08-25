import { useEffect } from 'react'
import { platformLabel } from '../lib/platforms'
import { formatMoney, formatSigned, computeProfit, projectedNet } from '../lib/money'
import { formatDate, daysListed } from '../lib/date'
import { isSold, isDonated, isOnHand } from '../lib/status'

// Small shared presentational pieces. Components only, so fast refresh is happy.

export function Badge({ kind, children }) {
  return <span className={`badge badge-${kind}`}>{children}</span>
}

export function PlatformBadge({ platform }) {
  return <Badge kind={platform}>{platformLabel(platform)}</Badge>
}

export function StatTile({ label, value, sub, tone, wide, accent }) {
  return (
    <div className={`stat-tile${wide ? ' wide' : ''}${accent ? ' accent' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value${tone ? ` ${tone}` : ''}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  )
}

// Bottom sheet on phones, centred modal on wider screens. Locks background
// scroll and closes on Escape.
export function Sheet({ title, onClose, children, actions }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <>
      <div className="app-overlay" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="sheet-body">{children}</div>
        {actions && <div className="sheet-actions">{actions}</div>}
      </div>
    </>
  )
}

export function BreakdownRow({ label, value, tone, total }) {
  return (
    <div className={`breakdown-row${total ? ' total' : ''}`}>
      <span className="breakdown-label">{label}</span>
      <span className={`breakdown-value${tone ? ` ${tone}` : ''}`}>{value}</span>
    </div>
  )
}

// The inline thumbnail stored on the item document, or a placeholder tag icon.
export function ItemThumb({ item }) {
  if (item.thumb) {
    // No lazy loading: the thumbnail is already inline in the document, so
    // there is no fetch to defer — deferring only delays the decode.
    return <img className="item-thumb" src={item.thumb} alt="" />
  }
  return (
    <span className="item-thumb" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 7.2 9.4 3l7.6 3.4v6.4L10 17l-7-3.6z" strokeLinejoin="round" />
        <circle cx="7.4" cy="7.6" r="1.3" />
      </svg>
    </span>
  )
}

// One line in any item list. The right-hand column changes with status: an
// asking price while listed, realised profit once sold.
//
// The row is a div wrapping two buttons rather than one big button, so the
// "Sold" shortcut can sit inside it — a button nested in a button is invalid.
export function ItemRow({ item, currency, feeSettings, onClick, onSell, staleAfter = 45 }) {
  const sold = isSold(item)
  const donated = isDonated(item)
  const onHand = isOnHand(item)
  const profit = sold ? computeProfit(item, feeSettings) : null
  const days = daysListed(item)
  const isStale = item.status === 'listed' && days !== null && days >= staleAfter
  const projected = onHand ? projectedNet(item, feeSettings) : null

  return (
    <div className="item-row">
      <button className="item-row-main" onClick={onClick}>
        <ItemThumb item={item} />

        <span className="item-main">
          <span className="item-title">{item.title || 'Untitled item'}</span>
          <span className="item-meta">
            {sold
              ? <PlatformBadge platform={item.sale?.platform} />
              : donated
                ? <Badge kind="donated">Donated</Badge>
                : item.platforms?.length
                  ? item.platforms.map(p => <PlatformBadge key={p} platform={p} />)
                  : <Badge kind="inventory">Not listed</Badge>}
            {isStale && <Badge kind="stale">{days}d</Badge>}
            {item.brand && <span>{item.brand}</span>}
            {item.size && <span>· {item.size}</span>}
          </span>
        </span>

        <span className="item-side">
          {sold ? (
            <>
              <span className={`item-price ${profit.net >= 0 ? 'pos' : 'neg'}`}>
                {formatSigned(profit.net, currency)}
              </span>
              <span className="item-note">
                {profit.feesEstimated && 'est. · '}{formatDate(item.sale?.date)}
              </span>
            </>
          ) : donated ? (
            <>
              <span className="item-price neg">-{formatMoney(item.cost, currency)}</span>
              <span className="item-note">{formatDate(item.donation?.date)}</span>
            </>
          ) : (
            <>
              <span className="item-price">
                {item.listPrice ? formatMoney(item.listPrice, currency) : '—'}
              </span>
              <span className="item-note">
                {projected !== null
                  ? `est. net ${formatMoney(projected, currency)}`
                  : `cost ${formatMoney(item.cost, currency)}`}
              </span>
            </>
          )}
        </span>
      </button>

      {onHand && onSell && (
        <button
          className="item-row-sell"
          onClick={() => onSell(item)}
          aria-label={`Mark ${item.title || 'item'} as sold`}
          title="Mark as sold"
        >
          Sold
        </button>
      )}
    </div>
  )
}
