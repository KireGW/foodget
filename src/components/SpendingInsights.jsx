import { useState } from 'react'

export function SpendingInsights({
  availableMonths,
  selectedMonth,
  onMonthChange,
  metrics,
}) {
  const [excludeHousehold, setExcludeHousehold] = useState(false)
  const todayLabel = formatTodayLabel()
  const totalSpentMxn = excludeHousehold
    ? metrics.totalSpentExcludingHouseholdMxn
    : metrics.totalSpentMxn
  const averageMonthlyTotalMxn = excludeHousehold
    ? metrics.averageMonthlyTotalExcludingHouseholdMxn
    : metrics.averageMonthlyTotalMxn
  const totalPaceStatus = excludeHousehold
    ? metrics.totalPaceExcludingHouseholdStatus
    : metrics.totalPaceStatus
  const totalPaceLabel = excludeHousehold
    ? metrics.totalPaceExcludingHouseholdLabel
    : metrics.totalPaceLabel

  return (
    <section className="panel insights-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Monthly oversight</p>
          <h2>Filter one month and review how your grocery spend changes over time.</h2>
        </div>

        <label className="month-select">
          <span>Report month</span>
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
      </div>

      <div className="insight-strip">
        <article className="insight-strip__card insight-strip__card--sand">
          <time className="insight-strip__today" dateTime={new Date().toISOString().slice(0, 10)}>
            {todayLabel}
          </time>
          <span>MXN total</span>
          <div className="insight-strip__headline">
            <strong>{totalSpentMxn}</strong>
            <small className="insight-strip__value-detail">
              <span>Avg / month {averageMonthlyTotalMxn}</span>
            </small>
          </div>
          <div className="insight-strip__footer">
            <label className="insight-strip__filter">
              <input
                type="checkbox"
                checked={excludeHousehold}
                onChange={(event) => setExcludeHousehold(event.target.checked)}
              />
              <span>Exclude household</span>
            </label>
            {totalPaceLabel ? (
              <div
                className={`insight-strip__pace-card insight-strip__pace-card--${totalPaceStatus}`}
              >
                <span>{totalPaceLabel}</span>
              </div>
            ) : null}
          </div>
        </article>
        <article className="insight-strip__card insight-strip__card--mint">
          <span>Biggest category</span>
          <div className="insight-strip__headline">
            <strong>{metrics.topCategory}</strong>
            <small className="insight-strip__value-detail">{metrics.topCategoryTotal}</small>
          </div>
        </article>
        <article className="insight-strip__card insight-strip__card--clay">
          <span>Most purchased item</span>
          <div className="insight-strip__headline">
            <strong>{metrics.topItem}</strong>
            <small className="insight-strip__value-detail">{metrics.topItemTotal}</small>
          </div>
        </article>
        <article className="insight-strip__card insight-strip__card--sea">
          <span>Items bought</span>
          <strong>{metrics.totalQuantity}</strong>
        </article>
      </div>
    </section>
  )
}

function formatTodayLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}
