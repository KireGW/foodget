import { useState } from 'react'

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

export function UnknownProductsPanel({
  unknownProducts,
  saveStatus,
  onSaveOverride,
  learningSuggestions = [],
  onApplyLearningSuggestion,
}) {
  const [drafts, setDrafts] = useState({})
  const hasNeedsMapping = unknownProducts.some(
    (product) =>
      product.normalizationStatus === 'unmatched' ||
      product.normalizationStatus === 'needs_mapping',
  )
  const [isOpen, setIsOpen] = useState(hasNeedsMapping)

  if (unknownProducts.length === 0) {
    return (
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Product mappings</p>
            <h2>No product mappings are available yet.</h2>
          </div>
        </div>
        <p className="table-empty">
          As receipts are parsed, products with a confident guess will be
          categorized automatically. You can still come back here to correct
          anything that lands on the wrong item or category.
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Product mappings</p>
          <h2>Review the parser's guesses and fix anything that landed wrong.</h2>
        </div>
        <button
          className="trend-panel__toggle"
          type="button"
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

      {isOpen ? <p className="unknown-products__status">{saveStatus}</p> : null}

      {isOpen && learningSuggestions.length > 0 ? (
        <div className="learning-suggestions">
          <p className="panel__eyebrow">Learn from receipt edits</p>
          {learningSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="learning-suggestions__row">
              <div>
                <strong>{suggestion.originalName}</strong>
                <small>{suggestion.reason}</small>
              </div>
              <button
                className="mapping-save"
                type="button"
                onClick={() => onApplyLearningSuggestion(suggestion)}
              >
                Save for future receipts
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="table-wrap">
          <table className="mapping-table desktop-table">
            <thead>
              <tr>
                <th>Receipt text</th>
                <th></th>
                <th>Status</th>
                <th>Seen</th>
                <th>Product name</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {unknownProducts.map((product) => {
                const draft = drafts[product.overrideKey] ?? {
                  canonicalName: product.currentName,
                  category: product.currentCategory,
                }
                const needsMapping = product.normalizationStatus === 'unmatched' || product.normalizationStatus === 'needs_mapping'
                const hasChanges =
                  draft.canonicalName.trim() !== product.currentName ||
                  draft.category !== product.currentCategory

                return (
                  <tr key={product.overrideKey}>
                    <td>
                      <div className="mapping-code">
                        <strong>{product.originalName}</strong>
                        {product.productCode ? (
                          <small>
                            <button
                              className="mapping-code__link"
                              type="button"
                              onClick={() =>
                                openProductSearchWindow(product)
                              }
                              title={buildProductSearchTitle(product)}
                            >
                              {product.productCode}
                            </button>
                          </small>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {product.latestReceiptUrl ? (
                        <a
                          className="mapping-receipt-link"
                          href={product.latestReceiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open latest receipt for ${product.productCode ?? product.originalName}`}
                          title={`Open ${product.latestReceiptFileName}`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 3.75h7.8L19.25 8.2v11.05a1 1 0 0 1-1 1H15.5a1 1 0 0 1-.85-.47L13 17.25l-1.65 2.53a1 1 0 0 1-1.67 0L8 17.25l-1.65 2.53a1 1 0 0 1-1.67 0L3 17.25l-1.65 2.53A1 1 0 0 1 .5 19.25V4.75a1 1 0 0 1 1-1H7Zm.5 1.5H2v12.35l1.65-2.53a1 1 0 0 1 1.67 0L7 17.6l1.65-2.53a1 1 0 0 1 1.67 0L12 17.6l1.65-2.53a1 1 0 0 1 1.67 0L17 17.6V8.82L14.18 6H7.5v-.75Zm1.25 4h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Zm0 3.5h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Z" />
                          </svg>
                        </a>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`mapping-status mapping-status--${product.normalizationStatus}`}
                      >
                        {formatMappingStatus(product.normalizationStatus)}
                      </span>
                    </td>
                    <td>{product.timesSeen}</td>
                    <td>
                      <input
                        className="mapping-input"
                        value={draft.canonicalName}
                        onChange={(event) =>
                          setDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [product.overrideKey]: {
                              ...draft,
                              canonicalName: event.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="mapping-select"
                        value={draft.category}
                        onChange={(event) =>
                          setDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [product.overrideKey]: {
                              ...draft,
                              category: event.target.value,
                            },
                          }))
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
                      {hasChanges || needsMapping ? (
                        <button
                          className="mapping-save"
                          type="button"
                          onClick={() =>
                            onSaveOverride({
                              productCode: product.productCode,
                              originalName: product.originalName,
                              canonicalName:
                                draft.canonicalName.trim() || product.currentName,
                              category: draft.category,
                            })
                          }
                        >
                          Save
                        </button>
                      ) : (
                        <span className="mapping-saved">Saved</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mobile-mapping-cards">
            {unknownProducts.map((product) => {
              const draft = drafts[product.overrideKey] ?? {
                canonicalName: product.currentName,
                category: product.currentCategory,
              }
              const needsMapping = product.normalizationStatus === 'unmatched' || product.normalizationStatus === 'needs_mapping'
              const hasChanges =
                draft.canonicalName.trim() !== product.currentName ||
                draft.category !== product.currentCategory

              return (
                <article key={product.overrideKey} className="mobile-mapping-card">
                  <div className="mobile-mapping-card__header">
                    <div className="mapping-code">
                      <strong>{product.originalName}</strong>
                      {product.productCode ? (
                        <small>
                          <button
                            className="mapping-code__link"
                            type="button"
                            onClick={() => openProductSearchWindow(product)}
                            title={buildProductSearchTitle(product)}
                          >
                            {product.productCode}
                          </button>
                        </small>
                      ) : null}
                    </div>
                    <span
                      className={`mapping-status mapping-status--${product.normalizationStatus}`}
                    >
                      {formatMappingStatus(product.normalizationStatus)}
                    </span>
                  </div>
                  <div className="mobile-mapping-card__meta">
                    <span>Seen {product.timesSeen} times</span>
                    {product.latestReceiptUrl ? (
                      <a
                        className="mapping-receipt-link"
                        href={product.latestReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open latest receipt for ${product.productCode ?? product.originalName}`}
                        title={`Open ${product.latestReceiptFileName}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7 3.75h7.8L19.25 8.2v11.05a1 1 0 0 1-1 1H15.5a1 1 0 0 1-.85-.47L13 17.25l-1.65 2.53a1 1 0 0 1-1.67 0L8 17.25l-1.65 2.53a1 1 0 0 1-1.67 0L3 17.25l-1.65 2.53A1 1 0 0 1 .5 19.25V4.75a1 1 0 0 1 1-1H7Zm.5 1.5H2v12.35l1.65-2.53a1 1 0 0 1 1.67 0L7 17.6l1.65-2.53a1 1 0 0 1 1.67 0L12 17.6l1.65-2.53a1 1 0 0 1 1.67 0L17 17.6V8.82L14.18 6H7.5v-.75Zm1.25 4h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Zm0 3.5h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Z" />
                        </svg>
                      </a>
                    ) : null}
                  </div>
                  <input
                    className="mapping-input"
                    value={draft.canonicalName}
                    onChange={(event) =>
                      setDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [product.overrideKey]: {
                          ...draft,
                          canonicalName: event.target.value,
                        },
                      }))
                    }
                  />
                  <select
                    className="mapping-select"
                    value={draft.category}
                    onChange={(event) =>
                      setDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [product.overrideKey]: {
                          ...draft,
                          category: event.target.value,
                        },
                      }))
                    }
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {hasChanges || needsMapping ? (
                    <button
                      className="mapping-save"
                      type="button"
                      onClick={() =>
                        onSaveOverride({
                          productCode: product.productCode,
                          originalName: product.originalName,
                          canonicalName:
                            draft.canonicalName.trim() || product.currentName,
                          category: draft.category,
                        })
                      }
                    >
                      Save
                    </button>
                  ) : (
                    <span className="mapping-saved">Saved</span>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="table-empty">
          Hidden for now. Open this panel when you want to review or correct
          product mappings.
        </p>
      )}
    </section>
  )
}

function formatMappingStatus(status) {
  if (status === 'user_override') {
    return 'User corrected'
  }

  if (status === 'unmatched' || status === 'needs_mapping') {
    return 'Needs mapping'
  }

  return 'Auto-mapped'
}

function buildWalmartSearchUrl(productCode) {
  return `https://www.walmart.com.mx/search?q=${encodeURIComponent(productCode)}`
}

function buildLaComerSearchUrl(searchText) {
  return `https://www.lacomer.com.mx/lacomer/#!/item-search/377/${encodeURIComponent(searchText)}/false?p=1&t=0&succId=377&succFmt=200`
}

function buildProductSearchTitle(product) {
  if (isLaComerProduct(product)) {
    return `Search ${product.originalName} on La Comer`
  }

  return `Search ${product.productCode} on Walmart Mexico`
}

function openProductSearchWindow(product) {
  const url = isLaComerProduct(product)
    ? buildLaComerSearchUrl(product.originalName)
    : buildWalmartSearchUrl(product.productCode)
  const windowId = isLaComerProduct(product)
    ? `lacomer-search-${slugifyWindowKey(product.originalName)}`
    : `walmart-search-${product.productCode}`

  window.open(
    url,
    windowId,
    'popup=yes,width=1200,height=1000,resizable=yes,scrollbars=yes',
  )
}

function isLaComerProduct(product) {
  return /La Comer|City Market/i.test(product.latestStore ?? '')
}

function slugifyWindowKey(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
