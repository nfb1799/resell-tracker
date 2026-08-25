import { useState, useMemo } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { useToast } from '../contexts/ToastContext'
import { formatMoney, num } from '../lib/money'
import { getLocalDateString, daysListed } from '../lib/date'
import { statusAfterUndo } from '../lib/status'
import { Sheet, BreakdownRow } from './ui'

// Retires an item that is never going to sell. No profit to work out — the whole
// point is that the cost does not come back — so this records where it went and
// writes the cost off.
export default function DonateSheet({ item, onClose }) {
  const { items, updateItem, currency } = useItems()
  const showToast = useToast()
  const editing = item.status === 'donated'

  const [donation, setDonation] = useState(() => ({
    date: item.donation?.date || getLocalDateString(),
    org: item.donation?.org || '',
    receiptValue: item.donation?.receiptValue ?? '',
  }))
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setDonation(prev => ({ ...prev, [key]: e.target.value }))

  // Places already donated to, so the name stays spelled the same way.
  const knownOrgs = useMemo(
    () => [...new Set(items.map(i => i.donation?.org).filter(Boolean))].sort(),
    [items]
  )

  const held = daysListed(item)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateItem(item.id, {
        status: 'donated',
        donation: {
          date: donation.date,
          org: donation.org.trim(),
          receiptValue: donation.receiptValue === '' ? null : num(donation.receiptValue),
        },
      })
      showToast('Marked as donated', 'success')
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Could not save the donation', 'error')
      setSaving(false)
    }
  }

  const handleUndo = async () => {
    try {
      await updateItem(item.id, { status: statusAfterUndo(item), donation: null })
      showToast('Back in inventory', 'success')
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Could not undo the donation', 'error')
    }
  }

  return (
    <Sheet
      title={editing ? 'Edit donation' : 'Mark as donated'}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Donate'}
          </button>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label htmlFor="donate-date">Date donated</label>
          <input id="donate-date" className="input" type="date" value={donation.date}
            onChange={set('date')} />
        </div>
        <div className="field">
          <label htmlFor="donate-receipt">Receipt value</label>
          <input id="donate-receipt" className="input mono" type="number" inputMode="decimal"
            step="0.01" min="0" value={donation.receiptValue} onChange={set('receiptValue')}
            placeholder="if you got one" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="donate-org">Donated to</label>
        <input id="donate-org" className="input" list="known-orgs" value={donation.org}
          onChange={set('org')} placeholder="Goodwill on Jefferson" autoFocus />
        <datalist id="known-orgs">
          {knownOrgs.map(o => <option key={o} value={o} />)}
        </datalist>
      </div>

      <div className="card">
        <div className="breakdown">
          <BreakdownRow label="What you paid for it" value={formatMoney(item.cost, currency)} />
          {item.listPrice > 0 && (
            <BreakdownRow label="Was asking" value={formatMoney(item.listPrice, currency)} />
          )}
          {held !== null && <BreakdownRow label="Held for" value={`${held} days`} />}
          <BreakdownRow
            label="Written off"
            value={`-${formatMoney(item.cost, currency)}`}
            tone={num(item.cost) > 0 ? 'neg' : undefined}
            total
          />
        </div>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        The cost is written off — counted separately from sale profit, not mixed into it.
        The receipt value is recorded as-is and not used in any calculation.
      </p>

      {editing && (
        <button className="btn btn-block btn-ghost" onClick={handleUndo}>
          Undo donation, put back in inventory
        </button>
      )}
    </Sheet>
  )
}
