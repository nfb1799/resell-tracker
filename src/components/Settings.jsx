import { useState } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { PLATFORM_IDS, platformLabel, defaultFeeSettings } from '../lib/platforms'
import { num } from '../lib/money'
import { itemsToCsv, downloadCsv } from '../lib/csv'
import { getLocalDateString } from '../lib/date'

const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD']

export default function Settings() {
  const { items, settings, feeSettings, saveSettings, currency } = useItems()
  const { currentUser, userProfile } = useAuth()
  const showToast = useToast()
  const [saving, setSaving] = useState(false)

  const commit = async (updates) => {
    setSaving(true)
    try {
      await saveSettings(updates)
    } catch (error) {
      console.error(error)
      showToast('Could not save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const setFee = (platform, key, value) => {
    commit({
      fees: {
        ...feeSettings,
        [platform]: { ...feeSettings[platform], [key]: key === 'includesShipping' ? value : num(value) },
      },
    })
  }

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    commit({ theme })
  }

  const exportAll = () => {
    downloadCsv(`inventory-${getLocalDateString()}.csv`, itemsToCsv(items, feeSettings))
  }

  const exportJson = () => {
    // Thumbnails would bloat the backup badly; the full photos live in their own
    // documents and are not included either.
    const bare = items.map(item => {
      const copy = { ...item }
      delete copy.thumb
      return copy
    })
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings, items: bare }, null, 2)],
      { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `resell-backup-${getLocalDateString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const theme = settings.theme || localStorage.getItem('theme') || 'dark'
  const withPhotos = items.filter(i => i.thumb).length

  return (
    <>
      <div className="card settings-group">
        <span className="section-label">General</span>

        <div className="field-row">
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <select id="currency" className="select" value={currency} disabled={saving}
              onChange={(e) => commit({ currency: e.target.value })}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="theme">Theme</label>
            <select id="theme" className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="goal">Monthly profit goal</label>
          <input id="goal" className="input mono" type="number" inputMode="decimal" step="1" min="0"
            defaultValue={settings.profitGoal || ''}
            onBlur={(e) => commit({ profitGoal: num(e.target.value) })}
            placeholder="0 to hide" />
        </div>
      </div>

      <div className="card settings-group">
        <span className="section-label">Fee estimates</span>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Rates vary by country, category and account, and they change. Check these
          against a recent payout — but a sale with its real payout entered never
          touches them.
        </p>

        <div className="fee-row">
          <span className="section-label">Platform</span>
          <span className="section-label">%</span>
          <span className="section-label">Fixed</span>
        </div>

        {PLATFORM_IDS.map(id => (
          <div key={id}>
            <div className="fee-row">
              <span className="fee-row-name">{platformLabel(id)}</span>
              <div className="field">
                <input className="input mono" type="number" step="0.01" min="0" inputMode="decimal"
                  defaultValue={feeSettings[id].percent}
                  onBlur={(e) => setFee(id, 'percent', e.target.value)} />
              </div>
              <div className="field">
                <input className="input mono" type="number" step="0.01" min="0" inputMode="decimal"
                  defaultValue={feeSettings[id].fixed}
                  onBlur={(e) => setFee(id, 'fixed', e.target.value)} />
              </div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={!!feeSettings[id].includesShipping}
                onChange={(e) => setFee(id, 'includesShipping', e.target.checked)} />
              Fee also applies to the shipping the buyer paid
            </label>
          </div>
        ))}

        <button className="btn btn-sm" disabled={saving}
          onClick={() => commit({ fees: defaultFeeSettings() })}>
          Reset to defaults
        </button>
      </div>

      <div className="card settings-group">
        <span className="section-label">Your data</span>
        <div className="toggle-row">
          <div className="toggle-row-text">
            <span className="toggle-row-title">Export CSV</span>
            <span className="toggle-row-sub">Every item with its profit breakdown</span>
          </div>
          <button className="btn btn-sm" onClick={exportAll}>Export</button>
        </div>
        <div className="toggle-row">
          <div className="toggle-row-text">
            <span className="toggle-row-title">Download backup</span>
            <span className="toggle-row-sub">Raw JSON of items and settings, photos excluded</span>
          </div>
          <button className="btn btn-sm" onClick={exportJson}>Backup</button>
        </div>
        <div className="toggle-row">
          <div className="toggle-row-text">
            <span className="toggle-row-title">Signed in as</span>
            <span className="toggle-row-sub">
              {currentUser?.email || (currentUser?.isAnonymous ? 'Guest account on this device' : '—')}
            </span>
          </div>
          <span className="mono dimmed" style={{ fontSize: 12 }}>
            {items.length} items · {withPhotos} with photos
          </span>
        </div>
        {currentUser?.isAnonymous && (
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Guest data lives under an anonymous account. Sign out without a backup and it is
            gone — download the JSON first, or make a real account.
          </p>
        )}
      </div>

      <div className="card settings-group">
        <span className="section-label">About the numbers</span>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Whenever a sale carries the payout you were actually paid, the platform's cut
          is worked out from that and these rates are ignored. They only stand in for a
          sale logged before the payout lands, and for the projected net on things still
          listed. Anything resting on an estimate is labelled “est.”
        </p>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Photos are shrunk in your browser and stored in Firestore rather than Cloud
          Storage, which keeps the project on the no-card free tier. One photo per item.
        </p>
      </div>

      <p className="dimmed" style={{ fontSize: 12, textAlign: 'center' }}>
        {userProfile?.displayName ? `${userProfile.displayName} · ` : ''}Resell Tracker
      </p>
    </>
  )
}
