import { useMemo, useState } from 'react'

export function ReceiptAuditPanel({ auditItems, availableMonths, selectedMonth }) {
  const [openReceiptId, setOpenReceiptId] = useState(null)
  const [auditMonth, setAuditMonth] = useState(selectedMonth)
  const [isOpen, setIsOpen] = useState(true)
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
            <p className="panel__eyebrow">Receipt audit</p>
            <h2>Check receipt by receipt that uploaded items really made it into the app.</h2>
          </div>

          <div className="receipt-audit__controls">
            <label className="month-select">
              <span>Audit month</span>
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
                  <th>Items</th>
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
                          onClick={() => openReceiptWindow(receipt.url, receipt.fileName)}
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
                      <button
                        className="receipt-review-link"
                        type="button"
                        disabled={receipt.parsedItemDetails.length === 0}
                        onClick={() => setOpenReceiptId(receipt.id)}
                      >
                        {receipt.parsedItemDetails.length === 0
                          ? 'No items'
                          : `Open ${receipt.parsedItemDetails.length} parsed ${receipt.parsedItemDetails.length === 1 ? 'line' : 'lines'}`}
                      </button>
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
                      onClick={() => openReceiptWindow(receipt.url, receipt.fileName)}
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
                  <button
                    className="receipt-review-link"
                    type="button"
                    disabled={receipt.parsedItemDetails.length === 0}
                    onClick={() => setOpenReceiptId(receipt.id)}
                  >
                    {receipt.parsedItemDetails.length === 0
                      ? 'No items'
                      : `Open ${receipt.parsedItemDetails.length} parsed ${receipt.parsedItemDetails.length === 1 ? 'line' : 'lines'}`}
                  </button>
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
                <p className="panel__eyebrow">Parsed items</p>
                <h2 id="receipt-audit-title">
                  Audit parsed items for {openReceipt.fileName}.
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

            <p className="table-empty">{openReceipt.auditDetail}</p>

            <div className="table-wrap">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {openReceipt.parsedItemDetails.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <div className="item-cell">
                          <span>{item.name}</span>
                          {item.originalName !== item.name ? (
                            <small>{item.originalName}</small>
                          ) : null}
                        </div>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.quantity}</td>
                      <td>{item.totalMxn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function openReceiptWindow(url, fileName) {
  window.open(
    url,
    `receipt-${fileName}`,
    'popup=yes,width=980,height=1200,resizable=yes,scrollbars=yes',
  )
}
