// Desktop navigation. A phone hides everything behind a four-slot tab bar
// because there is no room; a desktop has a whole column going spare, so the
// destinations, the primary action and the account all stay visible at once.
export default function SideNav({
  tabs, page, onNavigate, onAddItem, onBulkImport, onSettings, onLogout, displayName, email,
}) {
  return (
    <nav className="side-nav" aria-label="Main">
      <div className="side-nav-brand">
        <span className="app-brand-sub">RESELL TRACKER</span>
      </div>

      <button className="btn btn-primary side-nav-add" onClick={onAddItem}>
        <span aria-hidden="true">+</span> New item
      </button>

      <button className="btn btn-sm side-nav-import" onClick={onBulkImport}>
        Bulk import
      </button>

      <ul className="side-nav-list">
        {tabs.map(tab => {
          const active = tab.id === page
          const color = active ? 'var(--accent-primary)' : 'var(--text-muted)'
          return (
            <li key={tab.id}>
              <button
                className={`side-nav-item${active ? ' active' : ''}`}
                onClick={() => onNavigate(tab.id)}
                aria-current={active ? 'page' : undefined}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">{tab.icon(color)}</svg>
                <span>{tab.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="side-nav-foot">
        <div className="side-nav-account">
          <div className="side-nav-name">{displayName || 'You'}</div>
          <div className="side-nav-mail">{email || 'Guest account'}</div>
        </div>
        <button
          className={`side-nav-item${page === 'settings' ? ' active' : ''}`}
          onClick={onSettings}
          aria-current={page === 'settings' ? 'page' : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M10 2.6v2M10 15.4v2M17.4 10h-2M4.6 10h-2M15.2 4.8l-1.4 1.4M6.2 13.8l-1.4 1.4M15.2 15.2l-1.4-1.4M6.2 6.2 4.8 4.8"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Settings</span>
        </button>
        <button className="side-nav-item danger" onClick={onLogout}>
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12 6V4.5a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 4 4.5v11A1.5 1.5 0 0 0 5.5 17h5a1.5 1.5 0 0 0 1.5-1.5V14"
              stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 10h8m0 0-2.4-2.4M16.5 10l-2.4 2.4"
              stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}
