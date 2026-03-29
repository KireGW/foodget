import { useMemo, useState } from 'react'

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

export function ReceiptReviewPanel({
  reviewItems,
  reviewStatus,
  onSaveReceiptReview,
  onSaveReceiptItems,
}) {
  const [openReceiptId, setOpenReceiptId] = useState(null)
  const [drafts, setDrafts] = useState({})

  const openReceipt = useMemo(
    () => reviewItems.find((receipt) => receipt.id === openReceiptId) ?? null,
    [reviewItems, openReceiptId],
  )

  return (
    <>
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Receipt checks</p>
            <h2>Receipts with bigger total differences land here for review.</h2>
          </div>
        </div>

        <p className="unknown-products__status">{reviewStatus}</p>

        {reviewItems.length === 0 ? (
          <p className="table-empty">
            No receipts currently need review. Small differences under 2 MXN are
            auto-aligned to the printed receipt total.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="overview-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Printed total</th>
                  <th>Parsed items</th>
                  <th>Difference</th>
                  <th>Budget now uses</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {reviewItems.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>
                      <div className="item-cell">
                        <button
                          className="upload-list__link upload-list__link--panel"
                          type="button"
                          onClick={() => openReceiptWindow(receipt.url, receipt.fileName)}
                        >
                          {receipt.fileName}
                        </button>
                        <small>{receipt.totalCheckDetail}</small>
                      </div>
                    </td>
                    <td>{receipt.officialTotalMxn}</td>
                    <td>
                      <button
                        className="receipt-review-link"
                        type="button"
                        onClick={() => openReceiptEditor(receipt, setOpenReceiptId, setDrafts)}
                      >
                        {receipt.parsedItemsTotalMxn}
                      </button>
                    </td>
                    <td>{receipt.differenceMxn}</td>
                    <td>{receipt.budgetTotalMxn}</td>
                    <td>
                      <div className="receipt-review-actions">
                        <button
                          className="mapping-save"
                          type="button"
                          onClick={() =>
                            onSaveReceiptReview({
                              receiptId: receipt.id,
                              decision: 'use_official_total',
                            })
                          }
                        >
                          Use printed total
                        </button>
                        <button
                          className="receipt-review-secondary"
                          type="button"
                          onClick={() =>
                            onSaveReceiptReview({
                              receiptId: receipt.id,
                              decision: 'keep_parsed_items',
                            })
                          }
                        >
                          Keep parsed items
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openReceipt ? (
        <div
          className="receipt-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-editor-title"
          onClick={() => setOpenReceiptId(null)}
        >
          <div
            className="receipt-modal__card panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Digital receipt</p>
                <h2 id="receipt-editor-title">
                  Adjust parsed items for {openReceipt.fileName}.
                </h2>
              </div>
              <div className="receipt-modal__actions">
                <button
                  className="receipt-review-secondary"
                  type="button"
                  onClick={() => openReceiptWindow(openReceipt.url, openReceipt.fileName)}
                >
                  Open receipt
                </button>
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
                  {getDraftItems(drafts, openReceipt).map((item, index) => (
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
                  ))}
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
                onClick={() =>
                  onSaveReceiptItems(
                    openReceipt.id,
                    sanitizeDraftItems(getDraftItems(drafts, openReceipt)),
                  )
                }
              >
                Save parsed items
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

function openReceiptWindow(url, receiptName) {
  window.open(
    url,
    `receipt-${receiptName}`,
    'popup=yes,width=960,height=1200,resizable=yes,scrollbars=yes',
  )
}
