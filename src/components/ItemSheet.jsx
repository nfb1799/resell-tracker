import { useState, useEffect, useMemo, useRef } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { useToast } from '../contexts/ToastContext'
import { PLATFORM_IDS, platformLabel } from '../lib/platforms'
import { formatMoney, projectedNet, num } from '../lib/money'
import { getLocalDateString } from '../lib/date'
import { processPhoto } from '../lib/image'
import { Sheet, BreakdownRow } from './ui'

const CONDITIONS = ['New with tags', 'New without tags', 'Excellent', 'Good', 'Fair', 'For parts']

const blankItem = () => ({
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

export default function ItemSheet({ item, onClose, onSell, onDonate }) {
  const { items, addItem, updateItem, deleteItem, setPhoto, removePhoto, getPhoto, currency, feeSettings } = useItems()
  const showToast = useToast()
  const isNew = !item?.id

  const [form, setForm] = useState(() =>
    isNew ? blankItem() : { ...blankItem(), ...item }
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // The thumbnail is enough to show straight away; the full photo replaces it
  // once its own document loads.
  const [preview, setPreview] = useState(item?.thumb || '')
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [photoCleared, setPhotoCleared] = useState(false)
  const [busyPhoto, setBusyPhoto] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (isNew || !item?.thumb) return
    let active = true
    getPhoto(item.id)
      .then(full => { if (active && full) setPreview(full) })
      .catch(error => console.error('Could not load photo:', error))
    return () => { active = false }
  }, [isNew, item?.id, item?.thumb, getPhoto])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const togglePlatform = (id) => {
    setForm(prev => {
      const platforms = prev.platforms.includes(id)
        ? prev.platforms.filter(p => p !== id)
        : [...prev.platforms, id]
      // First platform added implies the item is now live somewhere.
      const becameListed = platforms.length > 0 && prev.status === 'inventory'
      return {
        ...prev,
        platforms,
        status: becameListed ? 'listed' : platforms.length === 0 && prev.status === 'listed' ? 'inventory' : prev.status,
        listedDate: becameListed && !prev.listedDate ? getLocalDateString() : prev.listedDate,
      }
    })
  }

  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file twice still fires a change
    if (!file) return
    setBusyPhoto(true)
    try {
      const photo = await processPhoto(file)
      setPendingPhoto(photo)
      setPreview(photo.full)
      setPhotoCleared(false)
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Could not read that image', 'error')
    } finally {
      setBusyPhoto(false)
    }
  }

  const handleClearPhoto = () => {
    setPendingPhoto(null)
    setPreview('')
    setPhotoCleared(true)
  }

  // Suggest categories and sources already used, so they stay consistent.
  const knownCategories = useMemo(
    () => [...new Set(items.map(i => i.category).filter(Boolean))].sort(),
    [items]
  )
  const knownSources = useMemo(
    () => [...new Set(items.map(i => i.source).filter(Boolean))].sort(),
    [items]
  )

  const projected = projectedNet(form, feeSettings)

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Give the item a title', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        cost: num(form.cost),
        listPrice: num(form.listPrice),
      }
      // The photo helpers own `thumb`; keep the form from writing a stale copy.
      delete payload.thumb
      delete payload.id

      const itemId = isNew ? await addItem(payload) : (await updateItem(item.id, payload), item.id)

      if (pendingPhoto) {
        await setPhoto(itemId, pendingPhoto)
      } else if (photoCleared && !isNew) {
        await removePhoto(itemId)
      }

      if (!isNew) showToast('Saved', 'success')
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Could not save item', 'error')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    try {
      await deleteItem(item.id)
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Could not delete item', 'error')
    }
  }

  return (
    <Sheet
      title={isNew ? 'New item' : form.title || 'Edit item'}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || busyPhoto}>
            {saving ? 'Saving…' : isNew ? 'Add item' : 'Save'}
          </button>
        </>
      }
    >
      <div className="photo-field">
        <div className="photo-frame">
          {preview
            ? <img src={preview} alt={form.title || 'Item photo'} />
            : <span className="photo-empty">No photo</span>}
        </div>
        <div className="photo-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePickPhoto}
            hidden
          />
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={busyPhoto}>
            {busyPhoto ? 'Working…' : preview ? 'Replace photo' : 'Add photo'}
          </button>
          {preview && (
            <button className="btn btn-sm btn-ghost" onClick={handleClearPhoto} disabled={busyPhoto}>
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          className="input"
          value={form.title}
          onChange={set('title')}
          placeholder="Carhartt detroit jacket"
          autoFocus={isNew}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="brand">Brand</label>
          <input id="brand" className="input" value={form.brand} onChange={set('brand')} />
        </div>
        <div className="field">
          <label htmlFor="size">Size</label>
          <input id="size" className="input" value={form.size} onChange={set('size')} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="category">Category</label>
          <input id="category" className="input" list="known-categories" value={form.category} onChange={set('category')} />
          <datalist id="known-categories">
            {knownCategories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="condition">Condition</label>
          <select id="condition" className="select" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <span className="section-label">Cost of goods</span>

      <div className="field-row">
        <div className="field">
          <label htmlFor="cost">What you paid</label>
          <input id="cost" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={form.cost} onChange={set('cost')} placeholder="0.00" />
        </div>
        <div className="field">
          <label htmlFor="acquired">Acquired</label>
          <input id="acquired" className="input" type="date" value={form.acquiredDate} onChange={set('acquiredDate')} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="source">Sourced from</label>
        <input id="source" className="input" list="known-sources" value={form.source} onChange={set('source')}
          placeholder="Goodwill on Jefferson" />
        <datalist id="known-sources">
          {knownSources.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>

      <span className="section-label">Listing</span>

      <div className="chip-row">
        {PLATFORM_IDS.map(id => (
          <button
            key={id}
            type="button"
            className={`chip${form.platforms.includes(id) ? ' active' : ''}`}
            onClick={() => togglePlatform(id)}
          >
            {platformLabel(id)}
          </button>
        ))}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="listPrice">Asking price</label>
          <input id="listPrice" className="input mono" type="number" inputMode="decimal" step="0.01" min="0"
            value={form.listPrice} onChange={set('listPrice')} placeholder="0.00" />
        </div>
        <div className="field">
          <label htmlFor="listedDate">Listed on</label>
          <input id="listedDate" className="input" type="date" value={form.listedDate} onChange={set('listedDate')} />
        </div>
      </div>

      {projected !== null && (
        <div className="breakdown">
          <BreakdownRow
            label={`Est. net if it sells at asking on ${platformLabel(form.platforms[0] || 'other')}`}
            value={formatMoney(projected, currency)}
            tone={projected >= 0 ? 'pos' : 'neg'}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="textarea" value={form.notes} onChange={set('notes')}
          placeholder="Small stain on left cuff, measured 22in pit to pit" />
      </div>

      {!isNew && (
        <>
          {form.status !== 'sold' && form.status !== 'donated' && (
            <>
              <button className="btn btn-block" onClick={() => onSell(item)}>Mark as sold</button>
              <button className="btn btn-block" onClick={() => onDonate(item)}>Mark as donated</button>
            </>
          )}
          <button className={`btn btn-block ${confirmDelete ? 'btn-danger' : 'btn-ghost'}`} onClick={handleDelete}>
            {confirmDelete ? 'Tap again to delete permanently' : 'Delete item'}
          </button>
        </>
      )}
    </Sheet>
  )
}
