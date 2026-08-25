import { useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db, isConfigured } from '../firebase/config'
import { defaultFeeSettings } from '../lib/platforms'
import { AuthContext } from './AuthContext'

function defaultSettings(displayName) {
  return {
    name: displayName,
    currency: 'USD',
    theme: 'dark',
    fees: defaultFeeSettings(),
    profitGoal: 0,
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(isConfigured)

  async function createProfile(user, displayName, extra = {}) {
    const profile = {
      displayName,
      email: user.email || '',
      createdAt: new Date().toISOString(),
      settings: defaultSettings(displayName),
      ...extra,
    }
    await setDoc(doc(db, 'users', user.uid), profile)
    setUserProfile(profile)
    return profile
  }

  async function signup(email, password, displayName) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })
    await createProfile(credential.user, displayName)
    return credential
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  // Guest mode: usable immediately, upgradeable later by linking an email.
  async function loginAnonymously() {
    const credential = await signInAnonymously(auth)
    await updateProfile(credential.user, { displayName: 'Guest' })

    const existing = await getDoc(doc(db, 'users', credential.user.uid))
    if (!existing.exists()) {
      await createProfile(credential.user, 'Guest', { isAnonymous: true })
    }
    return credential
  }

  function logout() {
    setUserProfile(null)
    return signOut(auth)
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const profile = snap.data()
    setUserProfile(profile)
    return profile
  }

  async function updateUserProfile(updates) {
    if (!currentUser) return
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true })
    setUserProfile(prev => ({ ...prev, ...updates }))
  }

  useEffect(() => {
    if (!isConfigured) return
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await fetchUserProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    loginAnonymously,
    logout,
    resetPassword,
    updateUserProfile,
    fetchUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
