import { useState } from 'react'

export function TrendPanel({
  monthComparison,
  categoryTrends,
  productMovers,
}) {
  const [isOpen, setIsOpen] = useState(monthComparison.hasComparison)

  return (
    <section className="panel trend-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Month-over-month</p>
          <h2>See how this month compares with the previous one.</h2>
          {monthComparison.hasComparison ? (
            <p className="panel__subtitle">
              {monthComparison.currentMonthLabel} compared with {monthComparison.previousMonthLabel}
            </p>
          ) : null}
        </div>
        <button
          className="trend-panel__toggle"
          type="button"
          aria-label={isOpen ? 'Collapse month-over-month panel' : 'Expand month-over-month panel'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
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

      {!monthComparison.hasComparison ? (
        <p className="table-empty">{monthComparison.title}</p>
      ) : !isOpen ? (
        <p className="unknown-products__status">
          Month-over-month comparison is hidden.
        </p>
      ) : (
        <>
          <div className="trend-summary">
            <article>
              <span>Spend</span>
              <strong>{monthComparison.spendDelta}</strong>
              <small>{monthComparison.spendDirection}</small>
            </article>
            <article>
              <span>Items bought</span>
              <strong>{monthComparison.itemsDelta}</strong>
              <small>{monthComparison.itemsDirection}</small>
            </article>
            <article>
              <span>Receipts</span>
              <strong>{monthComparison.receiptDelta}</strong>
              <small>{monthComparison.receiptDirection}</small>
            </article>
          </div>

          <div className="trend-grid">
            <div className="trend-card">
              <p className="panel__eyebrow">Category trends</p>
              {categoryTrends.length === 0 ? (
                <p className="table-empty">No category trends yet.</p>
              ) : (
                <div className="trend-list">
                  {categoryTrends.map((entry) => (
                    <div key={entry.category} className="trend-row">
                      <div>
                        <strong>{entry.category}</strong>
                        <small>
                          {entry.previousTotalMxn} to {entry.currentTotalMxn}
                        </small>
                      </div>
                      <strong>{entry.delta}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="trend-card">
              <p className="panel__eyebrow">Top increases</p>
              {productMovers.increases.length === 0 ? (
                <p className="table-empty">No increases to show yet.</p>
              ) : (
                <div className="trend-list">
                  {productMovers.increases.map((entry) => (
                    <div key={entry.name} className="trend-row">
                      <div>
                        <strong>{entry.name}</strong>
                        <small>{entry.category}</small>
                      </div>
                      <strong>{entry.delta}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="trend-card">
              <p className="panel__eyebrow">Top decreases</p>
              {productMovers.decreases.length === 0 ? (
                <p className="table-empty">No decreases to show yet.</p>
              ) : (
                <div className="trend-list">
                  {productMovers.decreases.map((entry) => (
                    <div key={entry.name} className="trend-row">
                      <div>
                        <strong>{entry.name}</strong>
                        <small>{entry.category}</small>
                      </div>
                      <strong>{entry.delta}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
