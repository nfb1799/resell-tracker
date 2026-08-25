import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const MESSAGES = {
  'auth/invalid-credential': 'That email and password do not match an account.',
  'auth/invalid-email': 'That does not look like an email address.',
  'auth/email-already-in-use': 'There is already an account with that email.',
  'auth/weak-password': 'Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/operation-not-allowed': 'Enable this sign-in method in the Firebase console first.',
}

export default function Auth() {
  const { login, signup, loginAnonymously, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action) => {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      console.error(err)
      setError(MESSAGES[err.code] || err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    run(() => (mode === 'login'
      ? login(email, password)
      : signup(email, password, displayName.trim() || email.split('@')[0])))
  }

  const handleReset = () => {
    if (!email) {
      setError('Enter your email first, then tap reset.')
      return
    }
    run(async () => {
      await resetPassword(email)
      setNotice('Password reset email sent.')
    })
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <div className="auth-brand">
          <span className="app-brand-sub">INVENTORY · SALES · PROFIT</span>
          <h1>Resell Tracker</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            One place for what you bought, what is listed, and what you actually kept.
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {notice && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{notice}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              No account?<button onClick={() => setMode('signup')}>Sign up</button>
              ·<button onClick={handleReset}>Forgot password</button>
            </>
          ) : (
            <>Already have one?<button onClick={() => setMode('login')}>Sign in</button></>
          )}
        </div>

        <div className="auth-divider">OR</div>

        <button className="btn btn-block" disabled={busy} onClick={() => run(loginAnonymously)}>
          Try it as a guest
        </button>
      </div>
    </div>
  )
}
