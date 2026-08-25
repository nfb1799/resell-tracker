// Demo harness: the real UI driven by sample data held in memory, with no
// Firebase behind it. Served in dev only, at /resell-tracker/demo.html — handy
// for trying the app before wiring up a project, and for working on screens
// without touching real inventory. Not part of the production build.
import { StrictMode, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Shell } from './App.jsx'
import { AuthContext } from './contexts/AuthContext'
import { ItemsContext } from './contexts/ItemsContext'
import { ToastProvider } from './contexts/ToastProvider'
import { defaultFeeSettings } from './lib/platforms'

const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

const SAMPLE = [
  { id: '1', title: 'Carhartt Detroit jacket', brand: 'Carhartt', category: 'Outerwear', size: 'L', cost: 22, acquiredDate: day(120), source: 'Goodwill on Jefferson', status: 'sold', platforms: ['depop'], listPrice: 140, listedDate: day(110), sale: { platform: 'depop', listedFor: 140, price: 138, shippingCharged: 12, payout: 144.60, shippingCost: 11.4, otherCosts: 1, date: day(96) }, createdAt: day(120) },
  { id: '2', title: 'Nike Air Max 90 infrared', brand: 'Nike', category: 'Shoes', size: '10.5', cost: 45, acquiredDate: day(80), source: 'Estate sale', status: 'sold', platforms: ['ebay'], listPrice: 190, listedDate: day(74), sale: { platform: 'ebay', listedFor: 190, price: 175, shippingCharged: 0, payout: 151.41, shippingCost: 14.2, otherCosts: 0, date: day(58) }, createdAt: day(80) },
  { id: '3', title: 'Ralph Lauren rugby polo', brand: 'Ralph Lauren', category: 'Tops', size: 'M', cost: 6, acquiredDate: day(66), source: 'Bins', status: 'sold', platforms: ['vinted'], listPrice: 48, listedDate: day(60), sale: { platform: 'vinted', listedFor: 48, price: 42, shippingCharged: 0, payout: 42, shippingCost: 0, otherCosts: 0.8, date: day(31) }, createdAt: day(66) },
  { id: '4', title: 'Levi 501 dark wash', brand: "Levi's", category: 'Denim', size: '32x32', cost: 12, acquiredDate: day(40), source: 'Goodwill on Jefferson', status: 'sold', platforms: ['depop'], listPrice: 62, listedDate: day(36), sale: { platform: 'depop', listedFor: 62, price: 55, shippingCharged: 8, payout: 60.40, shippingCost: 7.9, otherCosts: 0, date: day(9) }, createdAt: day(40) },
  { id: '5', title: 'Patagonia Synchilla fleece', brand: 'Patagonia', category: 'Outerwear', size: 'M', cost: 18, acquiredDate: day(30), source: 'Bins', status: 'sold', platforms: ['ebay'], listPrice: 95, listedDate: day(26), sale: { platform: 'ebay', listedFor: 95, price: 88, shippingCharged: 9, payout: 83.75, shippingCost: 9.6, otherCosts: 0, date: day(4) }, createdAt: day(30) },
  { id: '11', title: 'Stussy 8-ball hoodie', brand: 'Stussy', category: 'Tops', size: 'L', cost: 20, acquiredDate: day(28), source: 'Bins', status: 'sold', platforms: ['ebay'], listPrice: 120, listedDate: day(24), sale: { platform: 'ebay', listedFor: 120, price: 115, shippingCharged: 0, payout: null, shippingCost: 9.2, otherCosts: 0, date: day(2) }, createdAt: day(28) },
  { id: '6', title: 'Vintage Harley Davidson tee', brand: 'Harley Davidson', category: 'Tops', size: 'XL', cost: 8, acquiredDate: day(75), status: 'listed', platforms: ['depop', 'ebay'], listPrice: 78, listedDate: day(70), createdAt: day(75) },
  { id: '7', title: 'The North Face Nuptse 700', brand: 'The North Face', category: 'Outerwear', size: 'L', cost: 55, acquiredDate: day(52), status: 'listed', platforms: ['ebay'], listPrice: 210, listedDate: day(50), createdAt: day(52) },
  { id: '8', title: 'Doc Martens 1460 black', brand: 'Dr. Martens', category: 'Shoes', size: '9', cost: 30, acquiredDate: day(20), status: 'listed', platforms: ['depop'], listPrice: 110, listedDate: day(18), createdAt: day(20) },
  { id: '12', title: 'Old Navy cargo shorts', brand: 'Old Navy', category: 'Bottoms', size: '34', cost: 5, acquiredDate: day(190), source: 'Bins', status: 'donated', platforms: ['depop'], listPrice: 18, listedDate: day(185), donation: { date: day(12), org: 'Goodwill on Jefferson', receiptValue: 8 }, createdAt: day(190) },
  { id: '9', title: 'Uniqlo linen shirt', brand: 'Uniqlo', category: 'Tops', size: 'S', cost: 4, acquiredDate: day(6), status: 'inventory', platforms: [], listPrice: 0, createdAt: day(6) },
  { id: '10', title: 'Adidas Sambas OG', brand: 'Adidas', category: 'Shoes', size: '8.5', cost: 26, acquiredDate: day(3), status: 'inventory', platforms: [], listPrice: 0, createdAt: day(3) },
]

export function Harness() {
  const [items, setItems] = useState(SAMPLE)
  const [photos, setPhotos] = useState({})
  const [settings, setSettings] = useState({
    name: 'Nik', currency: 'USD', theme: 'dark', fees: defaultFeeSettings(), profitGoal: 400,
  })

  const value = {
    items,
    loading: false,
    settings,
    feeSettings: settings.fees,
    currency: settings.currency,
    addItem: useCallback(async (item) => {
      const id = String(Date.now())
      setItems(prev => [{ ...item, id, createdAt: new Date().toISOString() }, ...prev])
      return id
    }, []),
    updateItem: useCallback(async (id, updates) => {
      setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)))
    }, []),
    deleteItem: useCallback(async (id) => setItems(prev => prev.filter(i => i.id !== id)), []),
    setPhoto: useCallback(async (id, { thumb, full }) => {
      setPhotos(prev => ({ ...prev, [id]: full }))
      setItems(prev => prev.map(i => (i.id === id ? { ...i, thumb } : i)))
    }, []),
    removePhoto: useCallback(async (id) => {
      setPhotos(prev => { const next = { ...prev }; delete next[id]; return next })
      setItems(prev => prev.map(i => (i.id === id ? { ...i, thumb: '' } : i)))
    }, []),
    getPhoto: useCallback(async (id) => photos[id] || null, [photos]),
    saveSettings: useCallback(async (updates) => setSettings(prev => ({ ...prev, ...updates })), []),
  }

  const auth = {
    currentUser: { uid: 'demo', email: 'demo@example.com' },
    userProfile: { displayName: 'Nik', settings },
    logout: async () => {},
  }

  return (
    <AuthContext.Provider value={auth}>
      <ItemsContext.Provider value={value}>
        <Shell />
      </ItemsContext.Provider>
    </AuthContext.Provider>
  )
}

// Editing the sample data above hot-reloads this module, which would otherwise
// call createRoot a second time on a container that already has one. Reuse it.
const container = document.getElementById('root')
container.__root ||= createRoot(container)
container.__root.render(
  <StrictMode>
    <ToastProvider>
      <Harness />
    </ToastProvider>
  </StrictMode>,
)
