import { useMemo, useRef, useState } from 'react'

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
  syncStatus,
  uploadStatus,
  isReadOnly = false,
  receiptCalendar,
  isUploading,
  pendingDuplicateImport,
  onImportReceipts,
  onConfirmDuplicateImport,
  onCancelDuplicateImport,
  onCreateManualReceipt,
  onDeleteReceipt,
}) {
  const fileInputRef = useRef(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [openMonthKey, setOpenMonthKey] = useState(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualDraft, setManualDraft] = useState(() => ({
    purchasedAt: new Date().toISOString().slice(0, 10),
    title: '',
    category: 'Other',
    totalMxn: '',
    notes: '',
  }))

  const openMonth = useMemo(
    () => receiptCalendar.find((month) => month.monthKey === openMonthKey) ?? null,
    [receiptCalendar, openMonthKey],
  )

  return (
    <aside className="upload-panel">
      <div className="upload-panel__header">
        <p className="upload-panel__title">Receipt intake</p>
        <p className="upload-panel__subtitle">
          Drag PDFs straight into the app and it will file them into the right
          <code> /receipts/YYYYMM/ </code>
          folder automatically.
        </p>
      </div>

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
          accept="application/pdf"
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
              : 'Drop PDF receipts here'}
        </span>
        <span className="upload-dropzone__copy">
          {isReadOnly
            ? 'This version shows the receipt data bundled with the latest build. Uploads, deletes, and edits stay in the local app.'
            : 'The importer first tries to read the purchase date from the receipt text, then falls back to the filename, and finally to the upload date if needed.'}
        </span>
      </div>

      <div className="upload-status" role="status" aria-live="polite">
        <strong>{uploadStatus}</strong>
        <span>{syncStatus}</span>
      </div>

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

      <div className="manual-entry">
        <div className="upload-list__header">
          <div className="upload-list__label">Manual receipt</div>
          <button
            className="upload-list__toggle"
            type="button"
            onClick={() => setShowManualForm((currentValue) => !currentValue)}
            disabled={isReadOnly}
          >
            {showManualForm ? 'Hide form' : 'Add manual entry'}
          </button>
        </div>

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
                purchasedAt: manualDraft.purchasedAt,
                title: manualDraft.title.trim(),
                category: manualDraft.category,
                totalMxn: Number(manualDraft.totalMxn),
                notes: manualDraft.notes.trim(),
              })

              setManualDraft((currentDraft) => ({
                ...currentDraft,
                title: '',
                totalMxn: '',
                notes: '',
              }))
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
              Save manual entry
            </button>
          </form>
        ) : (
          <p className="upload-list__hint">
            Add a dated expense directly when there is no receipt to upload.
          </p>
        )}
      </div>

      <div className="upload-list">
        <div className="upload-list__header">
          <div className="upload-list__label">Receipt calendar</div>
          <button
            className="upload-list__toggle"
            type="button"
            onClick={() => setOpenMonthKey(null)}
            disabled={openMonthKey == null}
          >
            Close list
          </button>
        </div>

        {receiptCalendar.length === 0 ? (
          <p className="upload-list__empty">No receipts detected yet.</p>
        ) : (
          <>
            <div className="receipt-calendar">
              {receiptCalendar.map((month) => (
                <button
                  key={month.monthKey}
                  className={`receipt-calendar__month${openMonthKey === month.monthKey ? ' receipt-calendar__month--active' : ''}`}
                  type="button"
                  onClick={() =>
                    setOpenMonthKey((currentMonthKey) =>
                      currentMonthKey === month.monthKey ? null : month.monthKey,
                    )
                  }
                >
                  <span>{month.monthLabel}</span>
                  <strong>
                    {month.receiptCount} PDF{month.receiptCount === 1 ? '' : 's'}
                  </strong>
                </button>
              ))}
            </div>

            {openMonth ? (
              <div className="upload-list__month">
                <div className="upload-list__month-header">
                  <strong>{openMonth.monthLabel}</strong>
                  <span>
                    {openMonth.receiptCount} receipt
                    {openMonth.receiptCount === 1 ? '' : 's'}
                  </span>
                </div>

                <ul>
                  {openMonth.receipts.map((receipt) => (
                    <li key={receipt.id}>
                      <div className="upload-list__receipt">
                        {receipt.url ? (
                          <button
                            className="upload-list__link"
                            type="button"
                            onClick={() => openReceiptWindow(receipt.url, receipt.fileName)}
                          >
                            {receipt.fileName}
                          </button>
                        ) : (
                          <span className="upload-list__link upload-list__link--static">
                            {receipt.fileName}
                          </span>
                        )}
                        <small>{receipt.parseNotes}</small>
                        <small>{receipt.totalCheckDetail}</small>
                      </div>
                      <div className="upload-list__meta">
                        <span>{receipt.purchasedAt}</span>
                        <strong>
                          {formatParseStatus(receipt)}
                        </strong>
                        <button
                          className="upload-list__delete"
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => onDeleteReceipt(receipt)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="upload-list__hint">
                Click a month to open its uploaded PDFs.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  )
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

function formatParseStatus(receipt) {
  if (receipt.totalCheckStatus === 'needs_review') {
    return 'Needs review'
  }

  if (receipt.totalCheckStatus === 'confirmed_official') {
    return `Confirmed ${receipt.budgetTotalMxn}`
  }

  if (receipt.totalCheckStatus === 'confirmed_items') {
    return `Kept parsed ${receipt.budgetTotalMxn}`
  }

  if (receipt.totalCheckStatus === 'aligned') {
    return `Aligned ${receipt.budgetTotalMxn}`
  }

  const { parseStatus, totalMxn } = receipt

  if (parseStatus === 'manual_entry') {
    return totalMxn ? `Manual entry ${totalMxn}` : 'Manual entry'
  }

  if (parseStatus === 'parsed_items') {
    return totalMxn ? `Items + total ${totalMxn}` : 'Items parsed'
  }

  if (parseStatus === 'parsed_total') {
    return totalMxn ? `Total ${totalMxn}` : 'Total parsed'
  }

  if (parseStatus === 'text_only') {
    return 'Text found'
  }

  return 'Date only'
}

function handleDragStateChange(setter, active) {
  return (event) => {
    event.preventDefault()
    setter(active)
  }
}

function openReceiptWindow(url, receiptName) {
  window.open(
    url,
    `receipt-${receiptName}`,
    'popup=yes,width=960,height=1200,resizable=yes,scrollbars=yes',
  )
}
