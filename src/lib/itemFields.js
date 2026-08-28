import { getLocalDateString } from './date'

// The shape of a brand-new item, in one place so the "New item" form and the
// bulk importer cannot drift apart on defaults.

export const CONDITIONS = [
  'New with tags',
  'New without tags',
  'Excellent',
  'Good',
  'Fair',
  'For parts',
]

export const blankItem = () => ({
  title: '',
  brand: '',
  category: '',
  size: '',
  condition: 'Excellent',
  notes: '',
  cost: '',
  source: '',
  acquiredDate: getLocalDateString(),
  status: 'inventory',
  platforms: [],
  listPrice: '',
  listedDate: '',
})
