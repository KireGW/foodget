import { useMemo, useState } from 'react'

const defaultSort = {
  column: 'spent',
  direction: 'desc',
}

export function MonthlyOverview({
  monthlyItems,
  availableMonths,
  selectedMonth,
  onMonthChange,
}) {
  const [sortConfig, setSortConfig] = useState(defaultSort)
  const [isOpen, setIsOpen] = useState(true)

  const sortedItems = useMemo(() => {
    const items = [...monthlyItems]

    items.sort((left, right) => {
      const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1
      const leftValue = getSortValue(left, sortConfig.column)
      const rightValue = getSortValue(right, sortConfig.column)

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        return leftValue.localeCompare(rightValue) * directionMultiplier
      }

      return (leftValue - rightValue) * directionMultiplier
    })

    return items
  }, [monthlyItems, sortConfig])

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Itemized view</p>
          <h2>See how many items you bought and what you spent.</h2>
        </div>
        <div className="receipt-audit__controls">
          <label className="month-select">
            <span>Item month</span>
            <select
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
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

      {!isOpen ? null : (
        <div className="table-wrap">
          {monthlyItems.length === 0 ? (
          <p className="table-empty">
            No items available for this month yet. Upload a PDF receipt to start
            building the report.
          </p>
          ) : (
            <table className="overview-table">
              <thead>
                <tr>
                  <th>{renderSortButton('Item', 'item', sortConfig, setSortConfig)}</th>
                  <th>{renderSortButton('Category', 'category', sortConfig, setSortConfig)}</th>
                  <th>{renderSortButton('Items', 'items', sortConfig, setSortConfig)}</th>
                  <th>{renderSortButton('Spent (MXN)', 'spent', sortConfig, setSortConfig)}</th>
                  <th>{renderSortButton('Avg / item (MXN)', 'unitMxn', sortConfig, setSortConfig)}</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <div className="item-cell">
                        <span>{item.name}</span>
                        {item.originalNames[0] !== item.name ? (
                          <small>{item.originalNames.join(', ')}</small>
                        ) : null}
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.itemCountLabel}</td>
                    <td>{item.totalMxn}</td>
                    <td>{item.unitMxn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  )
}

function renderSortButton(label, column, sortConfig, setSortConfig) {
  const isActive = sortConfig.column === column
  const indicator = isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'

  return (
    <button
      className={`table-sort${isActive ? ' table-sort--active' : ''}`}
      type="button"
      aria-label={`Sort by ${label}`}
      onClick={() =>
        setSortConfig((currentSort) => ({
          column,
          direction:
            currentSort.column === column && currentSort.direction === 'asc'
              ? 'desc'
              : 'asc',
        }))
      }
    >
      <span>{label}</span>
      <span className="table-sort__icon" aria-hidden="true">{indicator}</span>
    </button>
  )
}

function getSortValue(item, column) {
  switch (column) {
    case 'item':
      return item.name
    case 'category':
      return item.category
    case 'items':
      return item.itemCount
    case 'spent':
      return item.totalMxnValue
    case 'unitMxn':
      return item.unitMxnValue
    default:
      return item.totalMxnValue
  }
}
