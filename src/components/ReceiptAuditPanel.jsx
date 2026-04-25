import { useMemo, useState } from 'react'
import { UploadPanel } from './UploadPanel.jsx'

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

export function ReceiptAuditPanel({
  auditItems,
  availableMonths,
  selectedMonth,
  uploadStatus,
  uploadProgress,
  isReadOnly,
  isUploading,
  pendingDuplicateImport,
  onImportReceipts,
  onConfirmDuplicateImport,
  onCancelDuplicateImport,
  onCreateManualReceipt,
  onDeleteReceipt,
  onSaveReceiptItems,
}) {
  const [openReceiptId, setOpenReceiptId] = useState(null)
  const [manualEditRequest, setManualEditRequest] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [auditMonth, setAuditMonth] = useState(selectedMonth)
  const [isOpen, setIsOpen] = useState(true)
  const [savingReceiptId, setSavingReceiptId] = useState(null)
  const effectiveAuditMonth = useMemo(() => {
    if (availableMonths.some((month) => month.value === auditMonth)) {
      return auditMonth
    }

    return selectedMonth
  }, [auditMonth, availableMonths, selectedMonth])

  const visibleAuditItems = useMemo(
    () =>
      effectiveAuditMonth
        ? auditItems.filter((receipt) => receipt.monthKey === effectiveAuditMonth)
        : auditItems,
    [auditItems, effectiveAuditMonth],
  )

  const openReceipt = useMemo(
    () => visibleAuditItems.find((receipt) => receipt.id === openReceiptId) ?? null,
    [visibleAuditItems, openReceiptId],
  )

  return (
    <>
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Receipt manager</p>
          </div>

          <div className="receipt-audit__controls">
            <button
              type="button"
              className="trend-panel__toggle"
              onClick={() => setIsOpen((currentValue) => !currentValue)}
              aria-expanded={isOpen}
            >
              <span
                className={`trend-panel__toggle-icon${
                  isOpen ? ' trend-panel__toggle-icon--open' : ''
                }`}
                aria-hidden="true"
              >
                ⌃
              </span>
            </button>
          </div>
        </div>

        {isOpen ? (
          <UploadPanel
            key={manualEditRequest?.requestId ?? 'receipt-intake'}
            uploadStatus={uploadStatus}
            uploadProgress={uploadProgress}
            isReadOnly={isReadOnly}
            isUploading={isUploading}
            pendingDuplicateImport={pendingDuplicateImport}
            manualReceiptToEdit={manualEditRequest?.receipt ?? null}
            onImportReceipts={onImportReceipts}
            onConfirmDuplicateImport={onConfirmDuplicateImport}
            onCancelDuplicateImport={onCancelDuplicateImport}
            onCreateManualReceipt={onCreateManualReceipt}
          />
        ) : null}

        {!isOpen ? null : visibleAuditItems.length === 0 ? (
          <p className="table-empty">No receipts available to audit for this month yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="overview-table desktop-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Parsed count</th>
                  <th>Status</th>
                  <th>Totals</th>
                  <th>Items</th>
                  <th>
                    <label className="month-select receipt-audit__month-select">
                      <span>Month</span>
                      <select
                        value={effectiveAuditMonth}
                        onChange={(event) => setAuditMonth(event.target.value)}
                      >
                        {availableMonths.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleAuditItems.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>
                      <div className="item-cell">
                        <button
                          className="upload-list__link upload-list__link--panel"
                          type="button"
                          disabled={!receipt.url && receipt.sourceType !== 'manual'}
                          onClick={() => {
                            if (receipt.sourceType === 'manual') {
                              setManualEditRequest({
                                receipt,
                                requestId: `${receipt.id}-${Date.now()}`,
                              })
                              return
                            }

                            openReceiptWindow(receipt.url, receipt.fileName)
                          }}
                        >
                          {receipt.fileName}
                        </button>
                        <small>{receipt.parseNotes}</small>
                      </div>
                    </td>
                    <td>{receipt.parsedItemsCount}</td>
                    <td>
                      <div className="item-cell">
                        <span className={`audit-badge audit-badge--${receipt.auditStatus}`}>
                          {receipt.auditLabel}
                        </span>
                        <small>{receipt.auditDetail}</small>
                      </div>
                    </td>
                    <td>
                      <div className="item-cell">
                        <span>{receipt.officialTotalMxn}</span>
                        <small>
                          Parsed {receipt.parsedItemsTotalMxn}
                          {receipt.hasMaterialDifference ? ` · Diff ${receipt.differenceMxn}` : ''}
                        </small>
                        {receipt.removedItemsCount > 0 ? (
                          <small className="receipt-audit__removed-note">
                            Budget excludes {receipt.removedItemsSummary}.
                          </small>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="item-cell">
                        <button
                          className="receipt-review-link"
                          type="button"
                          onClick={() => openReceiptEditor(receipt, setOpenReceiptId, setDrafts)}
                        >
                          {receipt.parsedItemDetails.length === 0
                            ? 'No items'
                            : `Open ${receipt.parsedItemDetails.length} parsed ${receipt.parsedItemDetails.length === 1 ? 'line' : 'lines'}`}
                        </button>
                        {receipt.removedItemsCount > 0 ? (
                          <span className="receipt-removed-chip">
                            {receipt.removedItemsCount} removed
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="receipt-audit__actions">
                        <button
                          className="receipt-review-secondary"
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => onDeleteReceipt(receipt)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-audit-cards">
              {visibleAuditItems.map((receipt) => (
                <article key={receipt.id} className="mobile-audit-card">
                  <div className="item-cell">
                    <button
                      className="upload-list__link upload-list__link--panel"
                      type="button"
                      disabled={!receipt.url && receipt.sourceType !== 'manual'}
                      onClick={() => {
                        if (receipt.sourceType === 'manual') {
                          setManualEditRequest({
                            receipt,
                            requestId: `${receipt.id}-${Date.now()}`,
                          })
                          return
                        }

                        openReceiptWindow(receipt.url, receipt.fileName)
                      }}
                    >
                      {receipt.fileName}
                    </button>
                    <small>{receipt.parseNotes}</small>
                  </div>
                  <div className="mobile-audit-card__row">
                    <span className={`audit-badge audit-badge--${receipt.auditStatus}`}>
                      {receipt.auditLabel}
                    </span>
                    <strong>{receipt.parsedItemsCount} parsed items</strong>
                  </div>
                  <small className="mobile-audit-card__detail">{receipt.auditDetail}</small>
                  <small className="mobile-audit-card__detail">
                    Printed {receipt.officialTotalMxn} · Parsed {receipt.parsedItemsTotalMxn}
                    {receipt.hasMaterialDifference ? ` · Diff ${receipt.differenceMxn}` : ''}
                  </small>
                  {receipt.removedItemsCount > 0 ? (
                    <small className="mobile-audit-card__detail receipt-audit__removed-note">
                      Budget excludes {receipt.removedItemsSummary}.
                    </small>
                  ) : null}
                  <button
                    className="receipt-review-link"
                    type="button"
                    onClick={() => openReceiptEditor(receipt, setOpenReceiptId, setDrafts)}
                  >
                    {receipt.parsedItemDetails.length === 0
                      ? 'No items'
                      : `Open ${receipt.parsedItemDetails.length} parsed ${receipt.parsedItemDetails.length === 1 ? 'line' : 'lines'}`}
                  </button>
                  <div className="receipt-audit__actions">
                    <button
                      className="receipt-review-secondary"
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => onDeleteReceipt(receipt)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {openReceipt ? (
        <div
          className="receipt-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-audit-title"
          onClick={() => setOpenReceiptId(null)}
        >
          <div
            className="receipt-modal__card panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Digital receipt</p>
                <h2 id="receipt-audit-title">
                  Adjust parsed items for {openReceipt.fileName}.
                </h2>
                {openReceipt.removedItemsCount > 0 ? (
                  <p className="receipt-removed-summary">
                    {openReceipt.removedItemsSummary} removed from the app budget.
                  </p>
                ) : null}
              </div>
              <div className="receipt-modal__actions">
                {openReceipt.url ? (
                  <button
                    className="receipt-review-secondary"
                    type="button"
                    onClick={() => openReceiptWindow(openReceipt.url, openReceipt.fileName)}
                  >
                    Open receipt
                  </button>
                ) : null}
                <button
                  className="upload-list__toggle"
                  type="button"
                  onClick={() => setOpenReceiptId(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <p className="table-empty">
              Use this to fix missed multipliers, wrong line totals, or product
              rows that do not match the actual receipt.
            </p>

            <div className="table-wrap">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Line total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {getDraftItems(drafts, openReceipt).length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <p className="table-empty">
                          No parsed items yet. Add lines manually from the receipt.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    getDraftItems(drafts, openReceipt).map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <div className="item-cell">
                            <input
                              className="mapping-input"
                              value={item.name}
                              onChange={(event) =>
                                updateDraftItem(
                                  setDrafts,
                                  openReceipt.id,
                                  index,
                                  'name',
                                  event.target.value,
                                )
                              }
                            />
                            <small>{item.originalName || item.name}</small>
                          </div>
                        </td>
                        <td>
                          <select
                            className="mapping-select"
                            value={item.category}
                            onChange={(event) =>
                              updateDraftItem(
                                setDrafts,
                                openReceipt.id,
                                index,
                                'category',
                                event.target.value,
                              )
                            }
                          >
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="mapping-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(event) =>
                              updateDraftItem(
                                setDrafts,
                                openReceipt.id,
                                index,
                                'quantity',
                                event.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="mapping-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.totalMxn}
                            onChange={(event) =>
                              updateDraftItem(
                                setDrafts,
                                openReceipt.id,
                                index,
                                'totalMxn',
                                event.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="receipt-review-secondary"
                            type="button"
                            onClick={() =>
                              removeDraftItem(setDrafts, openReceipt.id, index)
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="receipt-editor__actions">
              <button
                className="receipt-review-secondary"
                type="button"
                onClick={() => addDraftItem(setDrafts, openReceipt.id)}
              >
                Add line
              </button>
              <button
                className="mapping-save"
                type="button"
                disabled={savingReceiptId === openReceipt.id || isReadOnly}
                onClick={async () => {
                  setSavingReceiptId(openReceipt.id)
                  const draftItems = getDraftItems(drafts, openReceipt)
                  const sanitizedItems = sanitizeDraftItems(draftItems)
                  const removedItems = buildRemovedDraftItems(
                    openReceipt.editableItems,
                    draftItems,
                  )
                  const saved = await onSaveReceiptItems(
                    openReceipt.id,
                    sanitizedItems,
                    removedItems,
                  )
                  setSavingReceiptId(null)

                  if (saved) {
                    setDrafts((currentDrafts) => {
                      const nextDrafts = { ...currentDrafts }
                      delete nextDrafts[openReceipt.id]
                      return nextDrafts
                    })
                    setOpenReceiptId(null)
                  }
                }}
              >
                {savingReceiptId === openReceipt.id ? 'Saving...' : 'Save parsed items'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function getDraftItems(drafts, receipt) {
  return drafts[receipt.id] ?? receipt.editableItems
}

function openReceiptEditor(receipt, setOpenReceiptId, setDrafts) {
  setOpenReceiptId(receipt.id)
  setDrafts((currentDrafts) => ({
    ...currentDrafts,
    [receipt.id]:
      currentDrafts[receipt.id] ?? receipt.editableItems.map((item) => ({ ...item })),
  }))
}

function updateDraftItem(setDrafts, receiptId, index, field, value) {
  setDrafts((currentDrafts) => ({
    ...currentDrafts,
    [receiptId]: currentDrafts[receiptId].map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ),
  }))
}

function removeDraftItem(setDrafts, receiptId, index) {
  setDrafts((currentDrafts) => ({
    ...currentDrafts,
    [receiptId]: currentDrafts[receiptId].filter((_, itemIndex) => itemIndex !== index),
  }))
}

function addDraftItem(setDrafts, receiptId) {
  setDrafts((currentDrafts) => ({
    ...currentDrafts,
    [receiptId]: [
      ...(currentDrafts[receiptId] ?? []),
      {
        id: `${receiptId}-new-${Date.now()}`,
        name: '',
        originalName: '',
        productCode: null,
        category: 'Other',
        quantity: 1,
        totalMxn: 0,
        swedenUnitSek: 0,
        normalizationStatus: 'user_override',
      },
    ],
  }))
}

function sanitizeDraftItems(items) {
  return items
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      originalName: (item.originalName || item.name).trim(),
      quantity: Number(item.quantity),
      totalMxn: Number(item.totalMxn),
    }))
    .filter(
      (item) =>
        item.name &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.totalMxn) &&
        item.totalMxn >= 0,
    )
}

function buildRemovedDraftItems(originalItems, currentItems) {
  const currentIds = new Set(currentItems.map((item) => item.id))

  return originalItems
    .filter((item) => !currentIds.has(item.id))
    .map((item) => ({
      name: item.name,
      originalName: item.originalName || item.name,
      productCode: item.productCode ?? null,
      category: item.category,
      quantity: Number(item.quantity),
      totalMxn: Number(item.totalMxn),
    }))
    .filter(
      (item) =>
        item.name &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.totalMxn) &&
        item.totalMxn >= 0,
    )
}

function openReceiptWindow(url, fileName) {
  window.open(
    url,
    `receipt-${fileName}`,
    'popup=yes,width=980,height=1200,resizable=yes,scrollbars=yes',
  )
}
