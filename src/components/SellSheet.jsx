import { useState } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { useToast } from '../contexts/ToastContext'
import { PLATFORM_IDS, platformLabel } from '../lib/platforms'
import { computeProfit, formatMoney, formatPercent, num, round2 } from '../lib/money'
import { getLocalDateString, daysListed } from '../lib/date'
import { statusAfterUndo } from '../lib/status'
import { Sheet, BreakdownRow } from './ui'

// Records (or edits) the sale of one item. Four numbers, each one a thing you can
// actually read off a screen rather than work out:
//
//   listedFor  what it was up for — snapshotted here, so later edits to the
//              item's asking price cannot rewrite what happened
//   price      the offer you took: what the buyer paid for the item, before shipping
//   payout     what landed in your account, which fixes the platform's cut exactly
//   costs      the label, the packaging, what you paid for it in the first place
export default function SellSheet({ item, onClose, onEditDetails }) {
  const { updateItem, currency, feeSettings } = useItems()
  const showToast = useToast()
  const editing = item.status === 'sold'

  const [sale, setSale] = useState(() => ({
    platform: item.sale?.platform || item.platforms?.[0] || 'depop',
    listedFor: item.sale?.listedFor ?? item.listPrice ?? '',
    price: item.sale?.price ?? item.listPrice ?? '',
    payout: item.sale?.payout ?? '',
    shippingCharged: item.sale?.shippingCharged ?? '',
    shippingCost: item.sale?.shippingCost ?? '',
    otherCosts: item.sale?.otherCosts ?? '',
    date: item.sale?.date || getLocalDateString(),
  }))
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setSale(prev => ({ ...prev, [key]: e.target.value }))

  const preview = computeProfit({ ...item, sale }, feeSettings)
  const held = daysListed({ ...item, status: 'sold', sale })
  // A payout above the total the buyer paid means one of the two was mistyped.
  const payoutTooHigh = !preview.feesEstimated && preview.fees < 0

  // How far under the asking price the accepted offer landed.
  const listed = num(sale.listedFor)
  const accepted = num(sale.price)
  const discount = listed > 0 && accepted > 0 && accepted < listed
    ? { amount: round2(listed - accepted), fraction: (listed - accepted) / listed }
    : null

  const handleSave = async () => {
    if (accepted <= 0) {
      showToast('Enter the offer you accepted', 'error')
      return
    }
    setSaving(true)
    try {
      await updateItem(item.id, {
        status: 'sold',
        sale: {
          platform: sale.platform,
          listedFor: num(sale.listedFor),
          price: accepted,
          // Left blank, the payout stays null and the platform's cut falls back
          // to the estimated rate until you fill in the real figure.
          payout: sale.payout === '' ? null : num(sale.payout),
          shippingCharged: num(sale.shippingCharged),
          shippingCost: num(sale.shippingCost),
          otherCosts: num(sale.otherCosts),
          date: sale.date,
        },
      })
      showToast(editing ? 'Sale updated' : `Sold for ${formatMoney(preview.net, currency)} net`, 'success')
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Could not save the sale', 'error')
      setSaving(false)
    }
  }

  const handleUnsell = async () => {
    try {
      await updateItem(item.id, { status: statusAfterUndo(item), sale: null })
      showToast('Moved back to inventory', 'success')
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Could not undo the sale', 'error')
    }
  }

  return (
    <Sheet
      title={editing ? 'Edit sale' : 'Log a sale'}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save sale' : 'Mark sold'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Platform</label>
        <div className="chip-row">
          {PLATFORM_IDS.map(id => (
            <button
              key={id}
              type="button"
              className={`chip${sale.platform === id ? ' active' : ''}`}
              onClick={() => setSale(prev => ({ ...prev, platform: id }))}
            >
              {platformLabel(id)}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="sale-listed">Listed for</label>
          <input id="sale-listed" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={sale.listedFor} onChange={set('listedFor')} placeholder="0.00" />
        </div>
        <div className="field">
          <label htmlFor="sale-price">Offer accepted</label>
          <input id="sale-price" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={sale.price} onChange={set('price')} autoFocus />
        </div>
      </div>

      <p className="field-hint">
        Offer accepted is what the buyer paid for the item, before shipping. Sold at
        full price? Leave it matching what you listed for.
      </p>

      <div className="field-row">
        <div className="field">
          <label htmlFor="sale-payout">You got paid</label>
          <input id="sale-payout" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={sale.payout} onChange={set('payout')} placeholder="from payout" />
        </div>
        <div className="field">
          <label htmlFor="sale-date">Sale date</label>
          <input id="sale-date" className="input" type="date" value={sale.date} onChange={set('date')} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="ship-charged">Shipping buyer paid</label>
          <input id="ship-charged" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={sale.shippingCharged} onChange={set('shippingCharged')} placeholder="0.00" />
        </div>
        <div className="field">
          <label htmlFor="ship-cost">Shipping you paid</label>
          <input id="ship-cost" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={sale.shippingCost} onChange={set('shippingCost')} placeholder="0.00" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="other-costs">Other costs</label>
        <input id="other-costs" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
          value={sale.otherCosts} onChange={set('otherCosts')} placeholder="Packaging, tape" />
      </div>

      <div className="card">
        <div className="breakdown">
          {listed > 0 && (
            <BreakdownRow label="Listed for" value={formatMoney(listed, currency)} />
          )}
          <BreakdownRow label="Offer accepted" value={formatMoney(accepted, currency)} />
          {discount && (
            <BreakdownRow
              label="Came down by"
              value={`${formatMoney(discount.amount, currency)} · ${formatPercent(discount.fraction)}`}
            />
          )}
          {num(sale.shippingCharged) > 0 && (
            <BreakdownRow label="Shipping collected" value={formatMoney(sale.shippingCharged, currency)} />
          )}
          <BreakdownRow
            label={`${platformLabel(sale.platform)} kept${preview.feesEstimated ? ' (est.)' : ''}`}
            value={`-${formatMoney(preview.fees, currency)}`}
          />
          <BreakdownRow
            label={preview.feesEstimated ? 'You got paid (est.)' : 'You got paid'}
            value={formatMoney(preview.payout, currency)}
          />
          <BreakdownRow label="Cost of goods" value={`-${formatMoney(preview.cogs, currency)}`} />
          {preview.shippingCost > 0 && (
            <BreakdownRow label="Shipping paid" value={`-${formatMoney(preview.shippingCost, currency)}`} />
          )}
          {preview.otherCosts > 0 && (
            <BreakdownRow label="Other costs" value={`-${formatMoney(preview.otherCosts, currency)}`} />
          )}
          <BreakdownRow
            label="Net profit"
            value={formatMoney(preview.net, currency)}
            tone={preview.net >= 0 ? 'pos' : 'neg'}
            total
          />
          <BreakdownRow
            label="Margin · ROI · days held"
            value={[
              formatPercent(preview.margin),
              preview.roi === null ? '—' : formatPercent(preview.roi),
              held === null ? '—' : `${held}d`,
            ].join('  ·  ')}
          />
        </div>
      </div>

      {payoutTooHigh && (
        <p className="inline-warning">
          The payout is more than the buyer paid. Check both figures — shipping the
          buyer covered belongs in “shipping buyer paid”.
        </p>
      )}

      {/* A sold item opens straight into its sale, so this is the only way back
          to its title, cost and photo. */}
      <button className="btn btn-block" onClick={() => onEditDetails(item)}>
        Edit item details
      </button>

      {editing && (
        <button className="btn btn-block btn-ghost" onClick={handleUnsell}>
          Undo sale, put back in inventory
        </button>
      )}
    </Sheet>
  )
}
