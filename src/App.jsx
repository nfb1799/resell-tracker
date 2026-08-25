import { useState, useEffect, lazy, Suspense } from 'react'
import './App.css'
import { isConfigured } from './firebase/config'
import { useAuth } from './contexts/AuthContext'
import { ItemsProvider } from './contexts/ItemsProvider'
import { useItems } from './contexts/ItemsContext'
import Auth from './components/Auth'
import Setup from './components/Setup'
import Dashboard from './components/Dashboard'
import Inventory from './components/Inventory'
import Sales from './components/Sales'
import Settings from './components/Settings'
import ItemSheet from './components/ItemSheet'
import SellSheet from './components/SellSheet'
import DonateSheet from './components/DonateSheet'
import OfflineIndicator from './components/OfflineIndicator'

// Recharts is a big dependency and only the Trends tab needs it.
const Analytics = lazy(() => import('./components/Analytics'))

const PAGES = {
  dashboard: { title: 'Overview' },
  inventory: { title: 'Inventory' },
  sales: { title: 'Sales' },
  analytics: { title: 'Trends' },
  settings: { title: 'Settings' },
}

const TABS = [
  {
    id: 'dashboard', label: 'Overview',
    icon: (c) => <rect x="3" y="3" width="14" height="14" rx="3" stroke={c} strokeWidth="1.6" fill="none" />,
  },
  {
    id: 'inventory', label: 'Inventory',
    icon: (c) => (
      <g stroke={c} strokeWidth="1.6" fill="none" strokeLinejoin="round">
        <path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5z" />
        <path d="M3 6.5 10 10l7-3.5M10 10v7" />
      </g>
    ),
  },
  {
    id: 'sales', label: 'Sales',
    icon: (c) => (
      <g stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <circle cx="10" cy="10" r="6.5" />
        <path d="M12 7.5H9.2a1.6 1.6 0 0 0 0 3.2h1.6a1.6 1.6 0 0 1 0 3.2H8M10 6v1.5M10 13.9v1.5" />
      </g>
    ),
  },
  {
    id: 'analytics', label: 'Trends',
    icon: (c) => (
      <polyline points="3,14 7,9 11,12 17,5" stroke={c} strokeWidth="1.6" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
]

export function Shell() {
  const { currentUser, userProfile, logout } = useAuth()
  const { settings } = useItems()
  const [page, setPage] = useState('dashboard')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  // One sheet at a time: { mode: 'new' | 'edit' | 'sell', item }
  const [sheet, setSheet] = useState(null)

  // The saved theme follows the account, so a second device picks it up once
  // the profile arrives rather than sticking with this device's last choice.
  useEffect(() => {
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme)
      localStorage.setItem('theme', settings.theme)
    }
  }, [settings.theme])

  const goTo = (next) => {
    setPage(next)
    setProfileMenuOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      setPage('dashboard')
      setProfileMenuOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Tapping a finished item goes straight to how it ended; anything still on
  // the shelf opens the editor, which can hand off to either outcome.
  const openItem = (item) => setSheet({
    mode: item.status === 'sold' ? 'sell' : item.status === 'donated' ? 'donate' : 'edit',
    item,
  })
  const sellItem = (item) => setSheet({ mode: 'sell', item })
  const donateItem = (item) => setSheet({ mode: 'donate', item })
  const addItem = () => setSheet({ mode: 'new', item: null })

  const initials = (userProfile?.displayName || currentUser?.email || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <span className="app-brand-sub">RESELL TRACKER</span>
          <h1 className="app-brand">{PAGES[page].title}</h1>
        </div>
        <button className="app-avatar" onClick={() => setProfileMenuOpen(v => !v)} aria-label="Profile menu">
          {initials}
        </button>
      </header>

      {profileMenuOpen && (
        <>
          <div className="app-overlay" onClick={() => setProfileMenuOpen(false)} />
          <div className="profile-menu">
            <div className="profile-menu-head">
              <div className="profile-menu-name">{userProfile?.displayName || 'You'}</div>
              <div className="profile-menu-mail">{currentUser?.email || 'Guest account'}</div>
            </div>
            <button className="profile-menu-item" onClick={() => goTo('settings')}>Settings</button>
            <button className="profile-menu-item danger" onClick={handleLogout}>Sign out</button>
          </div>
        </>
      )}

      <main className="main-content">
        {page === 'dashboard' && <Dashboard onOpenItem={openItem} onSellItem={sellItem} onAddItem={addItem} />}
        {page === 'inventory' && <Inventory onOpenItem={openItem} onSellItem={sellItem} onAddItem={addItem} />}
        {page === 'sales' && <Sales onOpenItem={openItem} />}
        {page === 'analytics' && (
          <Suspense fallback={<p className="muted">Loading charts…</p>}>
            <Analytics />
          </Suspense>
        )}
        {page === 'settings' && <Settings />}
      </main>

      {sheet?.mode === 'sell' ? (
        <SellSheet
          item={sheet.item}
          onClose={() => setSheet(null)}
          onEditDetails={(item) => setSheet({ mode: 'edit', item })}
        />
      ) : sheet?.mode === 'donate' ? (
        <DonateSheet item={sheet.item} onClose={() => setSheet(null)} />
      ) : sheet ? (
        <ItemSheet
          item={sheet.item}
          onClose={() => setSheet(null)}
          onSell={sellItem}
          onDonate={donateItem}
        />
      ) : null}

      {!sheet && page !== 'settings' && (
        <button className="fab" onClick={addItem} aria-label="Add item">+</button>
      )}

      <nav className="bottom-tabs">
        {TABS.map(tab => {
          const active = tab.id === page
          const color = active ? 'var(--accent-primary)' : 'var(--text-dimmed)'
          return (
            <button
              key={tab.id}
              className={`bottom-tab${active ? ' active' : ''}`}
              onClick={() => goTo(tab.id)}
              style={{ color }}
              aria-current={active ? 'page' : undefined}
            >
              <svg width="22" height="22" viewBox="0 0 20 20">{tab.icon(color)}</svg>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <OfflineIndicator />
    </div>
  )
}

export default function App() {
  const { currentUser } = useAuth()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark')
  }, [])

  if (!isConfigured) return <Setup />
  if (!currentUser) return <Auth />

  return (
    <ItemsProvider>
      <Shell />
    </ItemsProvider>
  )
}
