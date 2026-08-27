import { useState, useMemo } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { PLATFORM_IDS, platformLabel } from '../lib/platforms'
import { formatMoney, num } from '../lib/money'
import { daysListed } from '../lib/date'
import { useIsDesktop } from '../lib/useMediaQuery'
import { ItemTable } from './tables'
import { ItemRow, EmptyState } from './ui'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'listed', label: 'Listed' },
  { id: 'inventory', label: 'In stock' },
  { id: 'sold', label: 'Sold' },
  { id: 'donated', label: 'Donated' },
]

const SORTS = {
  newest: { label: 'Newest first', compare: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  oldest: { label: 'Longest listed', compare: (a, b) => (daysListed(b) ?? -1) - (daysListed(a) ?? -1) },
  priceHigh: { label: 'Price: high to low', compare: (a, b) => num(b.listPrice) - num(a.listPrice) },
  priceLow: { label: 'Price: low to high', compare: (a, b) => num(a.listPrice) - num(b.listPrice) },
  title: { label: 'Title A–Z', compare: (a, b) => (a.title || '').localeCompare(b.title || '') },
}

const matchesSearch = (item, needle) => {
  if (!needle) return true
  const haystack = [item.title, item.brand, item.category, item.size, item.source, item.notes, item.donation?.org]
    .filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(needle)
}

export default function Inventory({ onOpenItem, onSellItem, onAddItem }) {
  const { items, loading, currency, feeSettings } = useItems()
  const isDesktop = useIsDesktop()
  const [status, setStatus] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => ({
    all: items.length,
    listed: items.filter(i => i.status === 'listed').length,
    inventory: items.filter(i => i.status === 'inventory').length,
    sold: items.filter(i => i.status === 'sold').length,
    donated: items.filter(i => i.status === 'donated').length,
  }), [items])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items
      .filter(item => {
        if (status !== 'all' && item.status !== status) return false
        if (platform !== 'all') {
          // A sold item belongs to the platform it actually sold on; a donated
          // one keeps whatever it was listed on before it was given up on.
          const on = item.status === 'sold'
            ? [item.sale?.platform]
            : (item.platforms || [])
          if (!on.includes(platform)) return false
        }
        return matchesSearch(item, needle)
      })
      .sort(SORTS[sort].compare)
  }, [items, status, platform, sort, search])

  const shownCost = visible.reduce((sum, i) => sum + num(i.cost), 0)

  if (loading) return <p className="muted">Loading inventory…</p>

  return (
    <>
      <div className="filter-bar">
        <input
          className="input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, brand, category, notes…"
        />

        <div className="chip-row">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              className={`chip${status === f.id ? ' active' : ''}`}
              onClick={() => setStatus(f.id)}
            >
              {f.label}<span className="chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        <div className="chip-row">
          <button className={`chip${platform === 'all' ? ' active' : ''}`} onClick={() => setPlatform('all')}>
            Any platform
          </button>
          {PLATFORM_IDS.map(id => (
            <button
              key={id}
              className={`chip${platform === id ? ' active' : ''}`}
              onClick={() => setPlatform(id)}
            >
              {platformLabel(id)}
            </button>
          ))}
        </div>

        <div className="page-head">
          <span className="section-label">
            {visible.length} item{visible.length === 1 ? '' : 's'} · {formatMoney(shownCost, currency)} cost
          </span>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          action={items.length === 0
            ? <button className="btn btn-primary" onClick={onAddItem}>Add an item</button>
            : <button className="btn" onClick={() => { setStatus('all'); setPlatform('all'); setSearch('') }}>
                Clear filters
              </button>}
        >
          {items.length === 0
            ? 'Your inventory is empty. Add the first thing you picked up to resell.'
            : 'No items match these filters.'}
        </EmptyState>
      ) : isDesktop ? (
        <ItemTable
          items={visible}
          currency={currency}
          feeSettings={feeSettings}
          sort={sort}
          onSort={setSort}
          onOpenItem={onOpenItem}
          onSell={onSellItem}
        />
      ) : (
        <div className="item-list">
          {visible.map(item => (
            <ItemRow key={item.id} item={item} currency={currency} feeSettings={feeSettings}
              onClick={() => onOpenItem(item)} onSell={onSellItem} />
          ))}
        </div>
      )}
    </>
  )
}
