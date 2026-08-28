import { useState, useMemo, useRef } from 'react'
import { useItems } from '../contexts/ItemsContext'
import { useToast } from '../contexts/ToastContext'
import { parseImport } from '../lib/importItems'
import { photoFromSource } from '../lib/image'
import { platformLabel } from '../lib/platforms'
import { formatMoney } from '../lib/money'
import { Sheet } from './ui'

const SAMPLE = `[
  {
    "title": "Nautica Polo",
    "brand": "Nautica",
    "size": "XL",
    "category": "Shirt",
    "condition": "Good",
    "cost": 0,
    "acquiredDate": "2026-08-28",
    "sourcedFrom": "Dad",
    "listingPlatform": "Depop",
    "askingPrice": 20,
    "listedDate": "2026-08-28",
    "notes": "",
    "photo": "https://example.com/photo.jpg"
  }
]`

// Adds many items at once from pasted JSON or a .json file.
//
// It does not write anything itself: every row goes through the same addItem and
// setPhoto the "New item" form uses, one at a time, so imported items carry the
// same defaults and the same computed figures as hand-added ones. A row that
// fails validation is skipped and reported; the rest still go in.
export default function BulkImportSheet({ onClose }) {
  const { addItem, setPhoto, currency } = useItems()
  const showToast = useToast()

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  // Re-validated as you type, so problems surface before you commit to anything.
  const parsed = useMemo(() => (text.trim() ? parseImport(text) : null), [text])
  const importing = progress !== null

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setText(await file.text())
      setFileName(file.name)
      setResult(null)
    } catch (error) {
      console.error(error)
      showToast('Could not read that file', 'error')
    }
  }

  const handleImport = async () => {
    if (!parsed || parsed.fatal || parsed.valid.length === 0) return

    const added = []
    const photoWarnings = []
    setResult(null)

    for (const [index, row] of parsed.valid.entries()) {
      setProgress({ done: index, total: parsed.valid.length, label: row.label })

      let photo = null
      if (row.photo) {
        try {
          photo = await photoFromSource(row.photo.src)
        } catch (error) {
          // A photo we cannot fetch is not a reason to lose the item.
          photoWarnings.push({ label: row.label, reason: error.message })
        }
      }

      try {
        const id = await addItem(row.item, { notify: false })
        if (photo) await setPhoto(id, photo)
        added.push(row.label)
      } catch (error) {
        console.error(error)
        parsed.invalid.push({
          rowNumber: row.rowNumber,
          label: row.label,
          errors: [`could not be saved: ${error.message}`],
        })
      }
    }

    setProgress(null)
    setResult({ added, photoWarnings, skipped: parsed.invalid })
  }

  const reset = () => {
    setText('')
    setFileName('')
    setResult(null)
  }

  // ── after the run: the summary, not a silent redirect ──
  if (result) {
    const { added, skipped, photoWarnings } = result
    return (
      <Sheet
        title="Import finished"
        onClose={onClose}
        actions={
          <>
            <button className="btn" onClick={reset}>Import more</button>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </>
        }
      >
        <div className="import-summary">
          <span className="import-count pos">{added.length} added</span>
          {skipped.length > 0 && <span className="import-count neg">{skipped.length} skipped</span>}
          {photoWarnings.length > 0 && (
            <span className="import-count muted">{photoWarnings.length} without a photo</span>
          )}
        </div>

        {skipped.length > 0 && (
          <div className="card">
            <span className="section-label">Skipped</span>
            <ul className="import-issues">
              {skipped.map(row => (
                <li key={row.rowNumber}>
                  <strong>Row {row.rowNumber}</strong> {row.label !== `Row ${row.rowNumber}` && `· ${row.label}`}
                  <ul>{row.errors.map(e => <li key={e}>{e}</li>)}</ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        {photoWarnings.length > 0 && (
          <div className="card">
            <span className="section-label">Imported without a photo</span>
            <ul className="import-issues">
              {photoWarnings.map(w => (
                <li key={w.label}><strong>{w.label}</strong> · {w.reason}</li>
              ))}
            </ul>
            <p className="muted" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
              The item is in — only the image could not be fetched, usually because
              that host blocks other sites from reading its files. Open the item and
              add the photo yourself, or paste it as a data URI instead.
            </p>
          </div>
        )}

        {added.length > 0 && (
          <div className="card">
            <span className="section-label">Added</span>
            <ul className="import-issues">
              {added.map(label => <li key={label}>{label}</li>)}
            </ul>
          </div>
        )}
      </Sheet>
    )
  }

  // ── before the run: paste, check, import ──
  return (
    <Sheet
      title="Bulk import"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose} disabled={importing}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || !parsed || !!parsed.fatal || parsed.valid.length === 0}
          >
            {importing
              ? `Importing ${progress.done + 1} of ${progress.total}…`
              : parsed && !parsed.fatal
                ? `Import ${parsed.valid.length} item${parsed.valid.length === 1 ? '' : 's'}`
                : 'Import'}
          </button>
        </>
      }
    >
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Paste a JSON array of items, or choose a <code>.json</code> file. Every row
        goes in exactly as if you had typed it into the New item form.
      </p>

      <div className="photo-actions" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} hidden />
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
          Choose .json file
        </button>
        {fileName && <span className="dimmed" style={{ fontSize: 12 }}>{fileName}</span>}
        {text && !importing && (
          <button className="btn btn-sm btn-ghost" onClick={reset}>Clear</button>
        )}
      </div>

      <div className="field">
        <label htmlFor="import-json">JSON</label>
        <textarea
          id="import-json"
          className="textarea import-textarea mono"
          value={text}
          onChange={(e) => { setText(e.target.value); setFileName('') }}
          placeholder={SAMPLE}
          spellCheck="false"
          disabled={importing}
        />
      </div>

      {parsed?.fatal && <p className="inline-warning">{parsed.fatal}</p>}

      {parsed && !parsed.fatal && (
        <>
          <div className="import-summary">
            <span className="import-count pos">{parsed.valid.length} ready</span>
            {parsed.invalid.length > 0 && (
              <span className="import-count neg">{parsed.invalid.length} with problems</span>
            )}
          </div>

          {parsed.invalid.length > 0 && (
            <div className="card">
              <span className="section-label">These rows will be skipped</span>
              <ul className="import-issues">
                {parsed.invalid.map(row => (
                  <li key={row.rowNumber}>
                    <strong>Row {row.rowNumber}</strong>
                    {row.label !== `Row ${row.rowNumber}` && ` · ${row.label}`}
                    <ul>{row.errors.map(e => <li key={e}>{e}</li>)}</ul>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.valid.length > 0 && (
            <div className="card">
              <span className="section-label">Ready to import</span>
              <ul className="import-preview">
                {parsed.valid.slice(0, 8).map(row => (
                  <li key={row.rowNumber}>
                    <span className="import-preview-title">{row.item.title}</span>
                    <span className="dimmed">
                      {[
                        row.item.platforms.map(platformLabel).join(' + ') || 'not listed',
                        `cost ${formatMoney(row.item.cost, currency)}`,
                        row.item.listPrice ? `asking ${formatMoney(row.item.listPrice, currency)}` : null,
                        row.photo ? 'photo' : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
                {parsed.valid.length > 8 && (
                  <li className="dimmed">…and {parsed.valid.length - 8} more</li>
                )}
              </ul>
            </div>
          )}
        </>
      )}

      {importing && (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Adding {progress.label}…
        </p>
      )}
    </Sheet>
  )
}
