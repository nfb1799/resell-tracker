import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './config'

// ============== User settings ==============

export async function getUserSettings(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId))
  return userDoc.exists() ? userDoc.data().settings : null
}

export async function updateUserSettings(userId, settings) {
  await setDoc(doc(db, 'users', userId), { settings }, { merge: true })
}

// ============== Items ==============
//
// One collection holds the whole lifecycle: an item starts as `inventory`,
// becomes `listed`, then `sold` (with a `sale` map attached). Keeping it in one
// place means "what did I pay for this thing I just sold" is never a join.

const itemsRef = (userId) => collection(db, 'users', userId, 'items')

// Live subscription — keeps a phone and a laptop in step without a refresh.
// Returns the unsubscribe function.
export function subscribeItems(userId, onData, onError) {
  const q = query(itemsRef(userId), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('Item subscription error:', error)
      onError?.(error)
    }
  )
}

export async function addItem(userId, item) {
  const now = new Date().toISOString()
  const docRef = await addDoc(itemsRef(userId), {
    ...item,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateItem(userId, itemId, updates) {
  await updateDoc(doc(db, 'users', userId, 'items', itemId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteItem(userId, itemId) {
  await deleteDoc(doc(db, 'users', userId, 'items', itemId))
  // Firestore does not cascade, so the photo would otherwise be orphaned.
  await deleteItemPhoto(userId, itemId).catch(() => {})
}

// ============== Photos ==============
//
// The full-size JPEG sits in its own document so the item list can sync without
// dragging every photo down with it. The matching thumbnail lives on the item
// itself (see lib/image.js).

const photoRef = (userId, itemId) => doc(db, 'users', userId, 'items', itemId, 'media', 'photo')

export async function getItemPhoto(userId, itemId) {
  const snap = await getDoc(photoRef(userId, itemId))
  return snap.exists() ? snap.data().dataUrl : null
}

export async function setItemPhoto(userId, itemId, dataUrl) {
  await setDoc(photoRef(userId, itemId), {
    dataUrl,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteItemPhoto(userId, itemId) {
  await deleteDoc(photoRef(userId, itemId))
}
