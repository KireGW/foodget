import { useEffect, useMemo, useRef, useState } from 'react'

export function CategorySpendChart({
  categoryChart,
  categoryChartsByMonth,
  availableMonths,
  selectedMonth,
  categoryRangeMode,
  onCategoryRangeModeChange,
  categoryRangeStart,
  onCategoryRangeStartChange,
  categoryRangeEnd,
  onCategoryRangeEndChange,
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [openCategory, setOpenCategory] = useState(null)
  const [comparisonMonth, setComparisonMonth] = useState('')
  const [hoveredComparisonCategory, setHoveredComparisonCategory] = useState(null)
  const [selectedChartMonth, setSelectedChartMonth] = useState(selectedMonth)
  const categoryRowRefs = useRef(new Map())

  const effectiveSelectedMonth = useMemo(() => {
    if (
      selectedChartMonth &&
      availableMonths.some((month) => month.value === selectedChartMonth)
    ) {
      return selectedChartMonth
    }

    return selectedMonth
  }, [availableMonths, selectedChartMonth, selectedMonth])

  const activeCategoryChart = useMemo(() => {
    if (categoryRangeMode === 'custom') {
      return categoryChart
    }

    return categoryChartsByMonth[effectiveSelectedMonth] ?? []
  }, [categoryChart, categoryChartsByMonth, categoryRangeMode, effectiveSelectedMonth])

  const effectiveComparisonMonth = useMemo(() => {
    if (!comparisonMonth || comparisonMonth === effectiveSelectedMonth) {
      return ''
    }

    return availableMonths.some((month) => month.value === comparisonMonth)
      ? comparisonMonth
      : ''
  }, [availableMonths, comparisonMonth, effectiveSelectedMonth])

  const mergedChart = useMemo(() => {
    const comparisonChart = effectiveComparisonMonth
      ? (categoryChartsByMonth[effectiveComparisonMonth] ?? [])
      : []
    const currentMap = new Map(activeCategoryChart.map((entry) => [entry.category, entry]))
    const comparisonMap = new Map(comparisonChart.map((entry) => [entry.category, entry]))
    const categories = [...new Set([...currentMap.keys(), ...comparisonMap.keys()])]
    const maxValue = categories.reduce((max, category) => {
      const currentValue = Math.abs(currentMap.get(category)?.totalMxnValue ?? 0)
      const compareValue = Math.abs(comparisonMap.get(category)?.totalMxnValue ?? 0)
      return Math.max(max, currentValue, compareValue)
    }, 0)

    return categories
      .map((category) => {
        const currentEntry = currentMap.get(category)
        const comparisonEntry = comparisonMap.get(category)

        return {
          category,
          totalMxnValue: currentEntry?.totalMxnValue ?? 0,
          totalMxn: currentEntry?.totalMxn ?? 'MX$0',
          averageMonthlySpendMxnValue: currentEntry?.averageMonthlySpendMxnValue ?? 0,
          averageMonthlySpendMxn: currentEntry?.averageMonthlySpendMxn ?? 'MX$0',
          averageShare: currentEntry?.averageShare ?? 0,
          isNegative: currentEntry?.isNegative ?? false,
          items: currentEntry?.items ?? [],
          share:
            maxValue === 0
              ? 0
              : (Math.abs(currentEntry?.totalMxnValue ?? 0) / maxValue) * 100,
          comparisonTotalMxnValue: comparisonEntry?.totalMxnValue ?? 0,
          comparisonTotalMxn: comparisonEntry?.totalMxn ?? 'MX$0',
          comparisonShare:
            maxValue === 0
              ? 0
              : (Math.abs(comparisonEntry?.totalMxnValue ?? 0) / maxValue) * 100,
          comparisonIsNegative: comparisonEntry?.isNegative ?? false,
        }
      })
      .sort((left, right) => {
        const leftWeight = Math.max(Math.abs(left.totalMxnValue), Math.abs(left.comparisonTotalMxnValue))
        const rightWeight = Math.max(
          Math.abs(right.totalMxnValue),
          Math.abs(right.comparisonTotalMxnValue),
        )
        return rightWeight - leftWeight
      })
  }, [activeCategoryChart, categoryChartsByMonth, effectiveComparisonMonth])

  const currentMonthTotal = useMemo(
    () => activeCategoryChart.reduce((sum, entry) => sum + entry.totalMxnValue, 0),
    [activeCategoryChart],
  )

  const toggleCategory = (category) => {
    setOpenCategory((currentCategory) =>
      currentCategory === category ? null : category,
    )
  }

  useEffect(() => {
    if (!isOpen || !openCategory) {
      return
    }

    const row = categoryRowRefs.current.get(openCategory)

    if (!row) {
      return
    }

    window.requestAnimationFrame(() => {
      row.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [isOpen, openCategory])

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Category totals</p>
          <h2>See which budget categories carry the most weight this month.</h2>
        </div>

        <div className="receipt-audit__controls">
          <label className="month-select category-chart__compare">
            <span>Month</span>
            <select
              value={categoryRangeMode === 'custom' ? 'custom' : effectiveSelectedMonth}
              onChange={(event) => {
                if (event.target.value === 'custom') {
                  onCategoryRangeModeChange('custom')
                  return
                }

                onCategoryRangeModeChange('month')
                setSelectedChartMonth(event.target.value)
              }}
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
              <option value="custom">Custom range</option>
            </select>
          </label>

          {categoryRangeMode === 'custom' ? (
            <>
              <label className="month-select category-chart__compare">
                <span>From</span>
                <select
                  value={categoryRangeStart}
                  onChange={(event) => onCategoryRangeStartChange(event.target.value)}
                >
                  {availableMonths.map((month) => (
                    <option key={`category-start-${month.value}`} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="month-select category-chart__compare">
                <span>To</span>
                <select
                  value={categoryRangeEnd}
                  onChange={(event) => onCategoryRangeEndChange(event.target.value)}
                >
                  {availableMonths.map((month) => (
                    <option key={`category-end-${month.value}`} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <label className="month-select category-chart__compare">
            <span>Compare with</span>
            <select
              className={effectiveComparisonMonth ? 'category-chart__compare-select' : ''}
              value={effectiveComparisonMonth}
              onChange={(event) => setComparisonMonth(event.target.value)}
            >
              <option value="">No comparison</option>
              {availableMonths
                .filter((month) => month.value !== effectiveSelectedMonth)
                .map((month) => (
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

      {!isOpen ? null : mergedChart.length === 0 ? (
        <p className="table-empty">
          Category totals appear here as soon as parsed receipts contribute item
          data for the selected month.
        </p>
      ) : (
        <div className="category-chart" role="img" aria-label="Bar chart of monthly spend by category">
          <div className="category-chart__header" aria-hidden="true">
            <span className="category-chart__header-spacer" />
            <div className="category-chart__header-values">
              <span>Avg / month</span>
              <span>Total</span>
            </div>
          </div>
          {mergedChart.map((entry) => (
            <article
              key={entry.category}
              className="category-chart__row"
              ref={(node) => {
                if (node) {
                  categoryRowRefs.current.set(entry.category, node)
                } else {
                  categoryRowRefs.current.delete(entry.category)
                }
              }}
            >
              <button
                type="button"
                className={`category-chart__toggle${
                  openCategory === entry.category ? ' category-chart__toggle--open' : ''
                }`}
                onClick={() => toggleCategory(entry.category)}
                aria-expanded={openCategory === entry.category}
              >
                <div className="category-chart__meta">
                  <div className="category-chart__label-group">
                    <div className="category-chart__title-row">
                      <strong>{entry.category}</strong>
                      <small className="category-chart__share">
                        {formatCategoryShare(entry.totalMxnValue, currentMonthTotal)}
                      </small>
                    </div>
                  </div>
                  <div className="category-chart__value-group">
                    <small className="category-chart__average">{entry.averageMonthlySpendMxn}</small>
                    <strong className="category-chart__total">{entry.totalMxn}</strong>
                  </div>
                </div>
                <div className="category-chart__bars" aria-hidden="true">
                  <div className="category-chart__track">
                    <div
                      className={`category-chart__bar${
                        entry.isNegative ? ' category-chart__bar--negative' : ''
                      }`}
                      style={{ width: `${Math.max(entry.share, 6)}%` }}
                    />
                  </div>
                  {effectiveComparisonMonth ? (
                    <div
                      className="category-chart__track category-chart__track--comparison"
                      onMouseEnter={() => setHoveredComparisonCategory(entry.category)}
                      onMouseLeave={() => setHoveredComparisonCategory((currentCategory) =>
                        currentCategory === entry.category ? null : currentCategory,
                      )}
                    >
                      <div
                        className={`category-chart__bar category-chart__bar--ghost${
                          entry.comparisonIsNegative ? ' category-chart__bar--ghost-negative' : ''
                        }`}
                        style={{ width: `${Math.max(entry.comparisonShare, 0)}%` }}
                      />
                      {hoveredComparisonCategory === entry.category ? (
                        <span
                          className={`category-chart__hover-value${
                            entry.comparisonIsNegative
                              ? ' category-chart__hover-value--negative'
                              : ''
                          }`}
                          style={{ left: `${Math.max(entry.comparisonShare, 0)}%` }}
                        >
                          {entry.comparisonTotalMxn}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </button>

              <div
                className={`category-chart__items${
                  openCategory === entry.category ? ' category-chart__items--open' : ''
                }`}
                aria-hidden={openCategory === entry.category ? 'false' : 'true'}
              >
                <div className="category-chart__items-inner">
                  {entry.items.map((item) => (
                    <div key={`${entry.category}-${item.name}`} className="category-chart__item">
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.isAdjustment ? 'Receipt-level adjustment' : `${item.itemCountLabel} items`}
                        </span>
                      </div>
                      <strong>{item.totalMxn}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function formatCategoryShare(value, total) {
  if (!total) {
    return '0%'
  }

  const share = (value / total) * 100
  return `${share.toFixed(1)}% of total`
}
