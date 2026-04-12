export function SpendingInsights({
  availableMonths,
  selectedMonth,
  onMonthChange,
  metrics,
}) {
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
          <span>MXN total</span>
          <div className="insight-strip__headline">
            <strong>{metrics.totalSpentMxn}</strong>
            <small className="insight-strip__value-detail">
              <span>Avg / month {metrics.averageMonthlyTotalMxn}</span>
              {metrics.totalPaceLabel ? (
                <span
                  className={`insight-strip__pace insight-strip__pace--${metrics.totalPaceStatus}`}
                >
                  {metrics.totalPaceLabel}
                </span>
              ) : null}
            </small>
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
