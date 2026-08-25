// Shown when no Firebase credentials are present, instead of the blank screen
// the SDK would otherwise produce.
export default function Setup() {
  return (
    <div className="setup-screen">
      <div className="setup-card card">
        <div>
          <span className="app-brand-sub">SETUP</span>
          <h1 style={{ fontSize: 24 }}>Connect a Firebase project</h1>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Your inventory lives in your own Firebase project, so it syncs between your
          phone and desktop. The free tier covers this comfortably. One-time setup:
        </p>
        <ol>
          <li>
            Create a project at <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">
            console.firebase.google.com</a>.
          </li>
          <li>In Build → Authentication, enable the <strong>Email/Password</strong> and <strong>Anonymous</strong> sign-in methods.</li>
          <li>In Build → Firestore Database, create a database in production mode.</li>
          <li>Project settings → Your apps → add a <strong>Web app</strong>, then copy its config values.</li>
          <li>
            Save them in a <code>.env</code> file next to <code>package.json</code>:
            <pre>{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
          </li>
          <li>
            Publish the rules from <code>firestore.rules</code> (paste them into the Firestore
            Rules tab, or run <code>firebase deploy --only firestore:rules</code>).
          </li>
          <li>Restart <code>npm run dev</code> — Vite only reads <code>.env</code> at startup.</li>
        </ol>
      </div>
    </div>
  )
}
