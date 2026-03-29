import { useState } from 'react'

export function MonthMetricCard({
  availableMonths,
  selectedMonth,
  onMonthChange,
  monthLabel,
  receiptCount,
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <article className="metric-card metric-card--sand metric-card--month">
      <button
        type="button"
        className="metric-card__button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
      >
        <p className="metric-card__label">Month</p>
        <div className="metric-card__headline">
          <p className="metric-card__value">{monthLabel}</p>
          <span
            className={`metric-card__chevron${isOpen ? ' metric-card__chevron--open' : ''}`}
            aria-hidden="true"
          >
            ˅
          </span>
        </div>
        <p className="metric-card__detail">
          {receiptCount} receipt{receiptCount === 1 ? '' : 's'} in view
        </p>
      </button>

      <div className={`metric-card__menu${isOpen ? ' metric-card__menu--open' : ''}`}>
        <div className="metric-card__menu-inner">
          {availableMonths.map((month) => (
            <button
              key={month.value}
              type="button"
              className={`metric-card__menu-item${month.value === selectedMonth ? ' metric-card__menu-item--active' : ''}`}
              onClick={() => {
                onMonthChange(month.value)
                setIsOpen(false)
              }}
            >
              <span>{month.label}</span>
              {month.value === selectedMonth ? <strong>Current</strong> : null}
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}
