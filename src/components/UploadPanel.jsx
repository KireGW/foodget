import { useRef, useState } from 'react'

const categoryOptions = [
  'Produce',
  'Protein',
  'Dairy',
  'Pantry',
  'Bakery',
  'Beverages',
  'Snacks',
  'Household',
  'Exclude from budget',
  'Other',
]

export function UploadPanel({
  uploadStatus,
  isReadOnly = false,
  isUploading,
  pendingDuplicateImport,
  manualReceiptToEdit = null,
  onImportReceipts,
  onConfirmDuplicateImport,
  onCancelDuplicateImport,
  onCreateManualReceipt,
}) {
  const fileInputRef = useRef(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [showManualForm, setShowManualForm] = useState(Boolean(manualReceiptToEdit))
  const [editingManualReceiptId, setEditingManualReceiptId] = useState(
    manualReceiptToEdit?.id ?? null,
  )
  const [manualDraft, setManualDraft] = useState(() =>
    manualReceiptToEdit
      ? buildManualDraftFromReceipt(manualReceiptToEdit)
      : buildEmptyManualDraft(),
  )

  return (
    <aside className="upload-panel">
      <div className="receipt-intake__grid">
        <div className="receipt-intake__upload">
          <div
            className={`upload-dropzone${isDragActive ? ' upload-dropzone--active' : ''}${isUploading || isReadOnly ? ' upload-dropzone--busy' : ''}`}
            onDragEnter={isReadOnly ? undefined : handleDragStateChange(setIsDragActive, true)}
            onDragOver={isReadOnly ? undefined : handleDragStateChange(setIsDragActive, true)}
            onDragLeave={isReadOnly ? undefined : handleDragStateChange(setIsDragActive, false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragActive(false)
              if (!isReadOnly) {
                onImportReceipts(event.dataTransfer.files)
              }
            }}
            onClick={() => {
              if (!isReadOnly) {
                fileInputRef.current?.click()
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (!isReadOnly) {
                  fileInputRef.current?.click()
                }
              }
            }}
          >
            <input
              ref={fileInputRef}
              className="upload-dropzone__input"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              multiple
              onChange={(event) => {
                onImportReceipts(event.target.files)
                event.target.value = ''
              }}
            />
            <span className="upload-dropzone__headline">
              {isReadOnly
                ? 'Read-only deployed view'
                : isUploading
                  ? 'Importing receipts...'
                  : 'Drop receipts or screenshots here'}
            </span>
            <span className="upload-dropzone__copy">
              {isReadOnly
                ? 'Uploads, deletes, and edits stay in the local app.'
                : 'PDF, PNG, or JPEG. The importer reads the receipt date first.'}
            </span>
          </div>

          {uploadStatus ? (
            <div className="upload-status" role="status" aria-live="polite">
              <strong>{uploadStatus}</strong>
            </div>
          ) : null}

          {pendingDuplicateImport ? (
            <div className="duplicate-import-modal" role="dialog" aria-modal="true">
              <div className="duplicate-import-modal__card">
                <p className="panel__eyebrow">Possible duplicate</p>
                <h3>This receipt looks identical to one that is already imported.</h3>
                <p className="upload-list__hint">
                  Existing receipt: <strong>{pendingDuplicateImport.duplicate.fileName}</strong>
                </p>
                <p className="upload-list__hint">
                  {formatDuplicateMeta(pendingDuplicateImport.duplicate)}
                </p>
                <div className="duplicate-import-modal__actions">
                  <button
                    type="button"
                    className="receipt-review-secondary"
                    onClick={onCancelDuplicateImport}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="mapping-save"
                    onClick={onConfirmDuplicateImport}
                  >
                    Import anyway
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          </div>

      <div className="manual-entry">
        {showManualForm ? (
          <div className="upload-list__header">
            <button
              className="upload-list__toggle"
              type="button"
              onClick={() => {
                resetManualDraft(setManualDraft, setEditingManualReceiptId)
                setShowManualForm(false)
              }}
              disabled={isReadOnly}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {showManualForm ? (
          <form
            className="manual-entry__form"
            onSubmit={async (event) => {
              event.preventDefault()

              if (
                !manualDraft.purchasedAt ||
                !manualDraft.title.trim() ||
                !manualDraft.category ||
                !manualDraft.totalMxn
              ) {
                return
              }

              await onCreateManualReceipt({
                id: editingManualReceiptId,
                purchasedAt: manualDraft.purchasedAt,
                title: manualDraft.title.trim(),
                category: manualDraft.category,
                totalMxn: Number(manualDraft.totalMxn),
                notes: manualDraft.notes.trim(),
              })

              resetManualDraft(setManualDraft, setEditingManualReceiptId)
              setShowManualForm(false)
            }}
          >
            <label className="manual-entry__field">
              <span>Date</span>
              <input
                className="mapping-input"
                type="date"
                value={manualDraft.purchasedAt}
                onChange={(event) =>
                  setManualDraft((currentDraft) => ({
                    ...currentDraft,
                    purchasedAt: event.target.value,
                  }))
                }
              />
            </label>

            <label className="manual-entry__field">
              <span>Name</span>
              <input
                className="mapping-input"
                type="text"
                placeholder="Taxi, market stand, bakery visit..."
                value={manualDraft.title}
                onChange={(event) =>
                  setManualDraft((currentDraft) => ({
                    ...currentDraft,
                    title: event.target.value,
                  }))
                }
              />
            </label>

            <label className="manual-entry__field">
              <span>Category</span>
              <select
                className="mapping-select"
                value={manualDraft.category}
                onChange={(event) =>
                  setManualDraft((currentDraft) => ({
                    ...currentDraft,
                    category: event.target.value,
                  }))
                }
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="manual-entry__field">
              <span>Amount (MXN)</span>
              <input
                className="mapping-input"
                type="number"
                min="0.01"
                step="0.01"
                value={manualDraft.totalMxn}
                onChange={(event) =>
                  setManualDraft((currentDraft) => ({
                    ...currentDraft,
                    totalMxn: event.target.value,
                  }))
                }
              />
            </label>

            <label className="manual-entry__field manual-entry__field--wide">
              <span>Notes</span>
              <textarea
                className="mapping-input manual-entry__notes"
                placeholder="Optional context if there is no PDF."
                value={manualDraft.notes}
                onChange={(event) =>
                  setManualDraft((currentDraft) => ({
                    ...currentDraft,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <button className="mapping-save" type="submit" disabled={isUploading}>
              {editingManualReceiptId ? 'Save manual changes' : 'Save manual entry'}
            </button>
          </form>
        ) : (
          <button
            className="manual-entry__add"
            type="button"
            onClick={() => setShowManualForm(true)}
            disabled={isReadOnly}
            aria-label="Add manual receipt"
          >
            <span aria-hidden="true">+</span>
            <strong>Add manual</strong>
            <small>No file needed</small>
          </button>
        )}
      </div>
      </div>

    </aside>
  )
}

function resetManualDraft(setManualDraft, setEditingManualReceiptId) {
  setManualDraft(buildEmptyManualDraft())
  setEditingManualReceiptId(null)
}

function buildEmptyManualDraft() {
  return {
    purchasedAt: new Date().toISOString().slice(0, 10),
    title: '',
    category: 'Other',
    totalMxn: '',
    notes: '',
  }
}

function buildManualDraftFromReceipt(receipt) {
  const firstItem = receipt.editableItems?.[0]
  const notes =
    receipt.parseNotes === 'Manual entry added in the app.'
      ? ''
      : receipt.parseNotes?.replace(/^Manual entry\.?\s*/i, '') ?? ''

  return {
    purchasedAt: receipt.purchasedAtValue ?? receipt.monthKey ?? new Date().toISOString().slice(0, 10),
    title: firstItem?.name ?? receipt.fileName.replace(/^Manual\s+-\s*/i, ''),
    category: firstItem?.category ?? 'Other',
    totalMxn: String(firstItem?.totalMxn ?? ''),
    notes: notes === 'Manual entry added in the app.' ? '' : notes,
  }
}

function formatDuplicateMeta(duplicate) {
  return `${formatDateLabel(duplicate.purchasedAt)} · ${duplicate.totalMxn} · ${duplicate.itemCount} items across ${duplicate.lineCount} lines`
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function handleDragStateChange(setter, active) {
  return (event) => {
    event.preventDefault()
    setter(active)
  }
}
