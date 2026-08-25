import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import * as service from '../firebase/firestoreService'
import { withFeeDefaults } from '../lib/platforms'
import { ItemsContext } from './ItemsContext'

// Stable identities so consumers memoised on them do not re-run every render.
const EMPTY_ITEMS = []
const EMPTY_SETTINGS = {}

// Single source of truth for inventory. Every screen reads the same live list
// rather than fetching its own copy, so a sale logged on a phone shows up on a
// laptop without a refresh.
export function ItemsProvider({ children }) {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const showToast = useToast()
  // The snapshot carries the uid it belongs to, so switching accounts reads as
  // "loading" without an effect having to reset state on the way in.
  const [snapshot, setSnapshot] = useState({ userId: null, items: [] })

  const userId = currentUser?.uid

  useEffect(() => {
    if (!userId) return undefined
    return service.subscribeItems(
      userId,
      (docs) => setSnapshot({ userId, items: docs }),
      () => {
        setSnapshot({ userId, items: [] })
        showToast('Could not load inventory', 'error')
      }
    )
  }, [userId, showToast])

  const loading = snapshot.userId !== userId
  const items = loading ? EMPTY_ITEMS : snapshot.items

  const settings = useMemo(() => userProfile?.settings || EMPTY_SETTINGS, [userProfile])
  const feeSettings = useMemo(() => withFeeDefaults(settings.fees), [settings.fees])
  const currency = settings.currency || 'USD'

  const addItem = useCallback(async (item) => {
    const id = await service.addItem(userId, item)
    showToast('Item added', 'success')
    return id
  }, [userId, showToast])

  const updateItem = useCallback(async (itemId, updates) => {
    await service.updateItem(userId, itemId, updates)
  }, [userId])

  const deleteItem = useCallback(async (itemId) => {
    await service.deleteItem(userId, itemId)
    showToast('Item deleted', 'success')
  }, [userId, showToast])

  // Photos: the thumbnail rides on the item document, the full-size JPEG goes
  // in its own document. Both move together so they can never disagree.
  const setPhoto = useCallback(async (itemId, { thumb, full }) => {
    await service.setItemPhoto(userId, itemId, full)
    await service.updateItem(userId, itemId, { thumb })
  }, [userId])

  const removePhoto = useCallback(async (itemId) => {
    await service.deleteItemPhoto(userId, itemId)
    await service.updateItem(userId, itemId, { thumb: '' })
  }, [userId])

  const getPhoto = useCallback((itemId) => service.getItemPhoto(userId, itemId), [userId])

  const saveSettings = useCallback(async (updates) => {
    await updateUserProfile({ settings: { ...settings, ...updates } })
  }, [settings, updateUserProfile])

  const value = useMemo(() => ({
    items,
    loading,
    settings,
    feeSettings,
    currency,
    addItem,
    updateItem,
    deleteItem,
    setPhoto,
    removePhoto,
    getPhoto,
    saveSettings,
  }), [items, loading, settings, feeSettings, currency, addItem, updateItem, deleteItem,
       setPhoto, removePhoto, getPhoto, saveSettings])

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
}
