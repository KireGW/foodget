const AUTO_APPLY_TOTAL_DIFF_MXN = 2

export function buildAvailableMonths(receipts) {
  return [...new Set(receipts.map((receipt) => receipt.purchasedAt.slice(0, 7)))]
    .sort()
    .map((month) => ({
      value: month,
      label: new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${month}-01T00:00:00Z`)),
    }))
}

export function buildMonthlyItems(receipts) {
  const itemsByName = new Map()

  receipts.forEach((receipt) => {
    buildReceiptBudgetItems(receipt).forEach((item) => {
      if (item.category === 'Exclude from budget') {
        return
      }

      const currentItem = itemsByName.get(item.name) ?? {
        name: item.name,
        category: item.category,
        quantity: 0,
        itemCount: 0,
        totalMxn: 0,
        swedenAverageSek: 0,
        originalNames: new Set(),
        normalizationStatus: item.normalizationStatus,
        isAdjustment: item.isAdjustment ?? false,
      }

      currentItem.quantity += item.quantity
      currentItem.itemCount +=
        item.isAdjustment ? 0 : item.unitType === 'weight' ? 1 : item.quantity
      currentItem.totalMxn += item.totalMxn
      currentItem.swedenAverageSek += item.swedenAverageSek
      currentItem.originalNames.add(item.originalName)
      if (item.normalizationStatus === 'unmatched') {
        currentItem.normalizationStatus = 'unmatched'
      }
      if (item.isAdjustment) {
        currentItem.isAdjustment = true
      }

      itemsByName.set(item.name, currentItem)
    })
  })

  return [...itemsByName.values()]
    .sort((left, right) => right.totalMxn - left.totalMxn)
    .map((item) => ({
      ...item,
      originalNames: [...item.originalNames].sort(),
      totalMxnValue: item.totalMxn,
      swedenAverageSekValue: item.swedenAverageSek,
      unitMxnValue: item.isAdjustment ? 0 : item.totalMxn / item.quantity,
      relativeCostIndex:
        item.swedenAverageSek === 0 ? 0 : item.totalMxn / item.swedenAverageSek,
      itemCountLabel: item.isAdjustment ? '—' : formatItemCount(item.itemCount),
      totalMxn: formatCurrency(item.totalMxn, 'MXN'),
      unitMxn: item.isAdjustment ? '—' : formatCurrency(item.totalMxn / item.quantity, 'MXN'),
      swedenAverageSek: item.isAdjustment ? '—' : formatCurrency(item.swedenAverageSek, 'SEK'),
    }))
}

export function buildMetrics(selectedMonth, receipts, monthlyItems, receiptReviews = []) {
  const receiptReviewMap = new Map(
    receiptReviews.map((review) => [review.receiptId, review.decision]),
  )
  const parsedReceiptCount = receipts.filter((receipt) => receipt.items.length > 0).length
  const totals = receipts.reduce(
    (summary, receipt) => {
      const receiptSummary = summarizeReceiptBudget(
        receipt,
        receiptReviewMap.get(receipt.id),
      )

      summary.effectiveBudgetTotalMxn += receiptSummary.effectiveBudgetTotalMxn
      summary.reviewReceiptCount += receiptSummary.totalCheckStatus === 'needs_review' ? 1 : 0
      summary.autoAlignedReceiptCount += receiptSummary.totalCheckStatus === 'aligned' ? 1 : 0
      summary.confirmedReceiptCount +=
        receiptSummary.totalCheckStatus === 'confirmed_official' ||
        receiptSummary.totalCheckStatus === 'confirmed_items'
          ? 1
          : 0
      buildReceiptBudgetItems(receipt).forEach((item) => {
        if (item.category === 'Exclude from budget') {
          return
        }

        summary.totalMxn += item.totalMxn
        if (!item.isAdjustment) {
          summary.totalQuantity += item.unitType === 'weight' ? 1 : item.quantity
        }
        summary.categoryTotals.set(
          item.category,
          (summary.categoryTotals.get(item.category) ?? 0) + item.totalMxn,
        )
        if (!item.isAdjustment) {
          summary.itemTotals.set(
            item.name,
            (summary.itemTotals.get(item.name) ?? 0) + (item.unitType === 'weight' ? 1 : item.quantity),
          )
        }
      })

      return summary
    },
    {
      totalMxn: 0,
      effectiveBudgetTotalMxn: 0,
      totalQuantity: 0,
      categoryTotals: new Map(),
      itemTotals: new Map(),
      reviewReceiptCount: 0,
      autoAlignedReceiptCount: 0,
      confirmedReceiptCount: 0,
    },
  )

  return {
    monthLabel: selectedMonth
      ? new Intl.DateTimeFormat('en', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${selectedMonth}-01T00:00:00Z`))
      : 'No receipts yet',
    receiptCount: receipts.length,
    parsedReceiptCount,
    totalSpentMxn:
      totals.effectiveBudgetTotalMxn === 0
        ? 'Pending PDF parsing'
        : formatCurrency(totals.effectiveBudgetTotalMxn, 'MXN'),
    averageReceiptMxn:
      totals.effectiveBudgetTotalMxn === 0
        ? 'Awaiting totals'
        : formatCurrency(
            totals.effectiveBudgetTotalMxn / Math.max(receipts.length, 1),
            'MXN',
          ),
    totalQuantity:
      parsedReceiptCount === 0 ? 'Pending' : formatQuantity(totals.totalQuantity),
    distinctItems: monthlyItems.length,
    topCategory:
      parsedReceiptCount === 0 ? 'Waiting for parsing' : pickLargestEntry(totals.categoryTotals),
    topCategoryTotal:
      parsedReceiptCount === 0 ? 'Pending PDF parsing' : formatLargestEntryValue(totals.categoryTotals, 'MXN'),
    topItem:
      parsedReceiptCount === 0 ? 'Waiting for parsing' : pickLargestEntry(totals.itemTotals),
    topItemTotal:
      parsedReceiptCount === 0 ? 'Pending PDF parsing' : formatTopItemSpend(monthlyItems, totals.itemTotals),
    reviewReceiptCount: totals.reviewReceiptCount,
    autoAlignedReceiptCount: totals.autoAlignedReceiptCount,
    confirmedReceiptCount: totals.confirmedReceiptCount,
  }
}

export function buildMonthComparison(selectedMonth, availableMonths, receipts, receiptReviews = []) {
  const currentIndex = availableMonths.findIndex((month) => month.value === selectedMonth)
  const previousMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  if (!selectedMonth || !previousMonth) {
    return {
      hasComparison: false,
      title: 'Previous month comparison will appear once two months are available.',
    }
  }

  const receiptReviewMap = new Map(
    receiptReviews.map((review) => [review.receiptId, review.decision]),
  )
  const currentReceipts = receipts.filter((receipt) => receipt.purchasedAt.startsWith(selectedMonth))
  const previousReceipts = receipts.filter((receipt) =>
    receipt.purchasedAt.startsWith(previousMonth.value),
  )
  const currentSpend = sumEffectiveBudgetTotals(currentReceipts, receiptReviewMap)
  const previousSpend = sumEffectiveBudgetTotals(previousReceipts, receiptReviewMap)
  const currentItemsBought = sumOfficialOrParsedItemCounts(currentReceipts)
  const previousItemsBought = sumOfficialOrParsedItemCounts(previousReceipts)

  return {
    hasComparison: true,
    currentMonthLabel: formatMonthLabel(selectedMonth),
    previousMonthLabel: previousMonth.label,
    spendDeltaValue: currentSpend - previousSpend,
    itemsDeltaValue: currentItemsBought - previousItemsBought,
    receiptDeltaValue: currentReceipts.length - previousReceipts.length,
    spendDelta: formatSignedCurrencyValue(currentSpend - previousSpend, 'MXN'),
    itemsDelta: formatSignedNumber(currentItemsBought - previousItemsBought),
    receiptDelta: formatSignedNumber(currentReceipts.length - previousReceipts.length),
    spendDirection: describeDeltaDirection(currentSpend - previousSpend, 'spent'),
    itemsDirection: describeDeltaDirection(currentItemsBought - previousItemsBought, 'bought'),
    receiptDirection: describeDeltaDirection(currentReceipts.length - previousReceipts.length, 'logged'),
  }
}

export function buildCategoryTrends(selectedMonth, availableMonths, receipts) {
  const currentIndex = availableMonths.findIndex((month) => month.value === selectedMonth)
  const previousMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  if (!selectedMonth || !previousMonth) {
    return []
  }

  const currentItems = buildMonthlyItems(
    receipts.filter((receipt) => receipt.purchasedAt.startsWith(selectedMonth)),
  )
  const previousItems = buildMonthlyItems(
    receipts.filter((receipt) => receipt.purchasedAt.startsWith(previousMonth.value)),
  )
  const currentTotals = sumMonthlyItemsByCategory(currentItems)
  const previousTotals = sumMonthlyItemsByCategory(previousItems)
  const categories = [...new Set([...currentTotals.keys(), ...previousTotals.keys()])]

  return categories
    .map((category) => {
      const currentValue = currentTotals.get(category) ?? 0
      const previousValue = previousTotals.get(category) ?? 0

      return {
        category,
        currentValue,
        previousValue,
        currentTotalMxn: formatCurrency(currentValue, 'MXN'),
        previousTotalMxn: formatCurrency(previousValue, 'MXN'),
        deltaValue: currentValue - previousValue,
        delta: formatSignedCurrencyValue(currentValue - previousValue, 'MXN'),
      }
    })
    .sort((left, right) => Math.abs(right.deltaValue) - Math.abs(left.deltaValue))
}

export function buildProductMovers(selectedMonth, availableMonths, receipts) {
  const currentIndex = availableMonths.findIndex((month) => month.value === selectedMonth)
  const previousMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  if (!selectedMonth || !previousMonth) {
    return {
      increases: [],
      decreases: [],
    }
  }

  const currentItems = buildMonthlyItems(
    receipts.filter((receipt) => receipt.purchasedAt.startsWith(selectedMonth)),
  )
  const previousItems = buildMonthlyItems(
    receipts.filter((receipt) => receipt.purchasedAt.startsWith(previousMonth.value)),
  )
  const currentByName = new Map(currentItems.map((item) => [item.name, item]))
  const previousByName = new Map(previousItems.map((item) => [item.name, item]))
  const itemNames = [...new Set([...currentByName.keys(), ...previousByName.keys()])]
  const movers = itemNames
    .map((name) => {
      const currentItem = currentByName.get(name)
      const previousItem = previousByName.get(name)
      const currentValue = currentItem?.totalMxnValue ?? 0
      const previousValue = previousItem?.totalMxnValue ?? 0

      return {
        name,
        category: currentItem?.category ?? previousItem?.category ?? 'Other',
        currentValue,
        previousValue,
        currentTotalMxn: formatCurrency(currentValue, 'MXN'),
        previousTotalMxn: formatCurrency(previousValue, 'MXN'),
        deltaValue: currentValue - previousValue,
        delta: formatSignedCurrencyValue(currentValue - previousValue, 'MXN'),
      }
    })
    .filter((item) => {
      const currentItem = currentByName.get(item.name)
      const previousItem = previousByName.get(item.name)
      const isAdjustment = currentItem?.isAdjustment || previousItem?.isAdjustment

      return !isAdjustment && Math.abs(item.deltaValue) > 0.009
    })
    .sort((left, right) => right.deltaValue - left.deltaValue)

  return {
    increases: movers.filter((item) => item.deltaValue > 0).slice(0, 5),
    decreases: [...movers].reverse().filter((item) => item.deltaValue < 0).slice(0, 5),
  }
}

export function buildCategoryChart(monthlyItems) {
  const totalsByCategory = monthlyItems.reduce((summary, item) => {
    const currentCategory = summary.get(item.category) ?? {
      totalMxnValue: 0,
      items: [],
    }

    currentCategory.totalMxnValue += item.totalMxnValue
    currentCategory.items.push({
      name: item.name,
      totalMxnValue: item.totalMxnValue,
      totalMxn: item.totalMxn,
      itemCount: item.itemCount,
      itemCountLabel: item.itemCountLabel,
      isAdjustment: item.isAdjustment ?? false,
    })

    summary.set(item.category, currentCategory)
    return summary
  }, new Map())

  const entries = [...totalsByCategory.entries()].sort(
    (left, right) => right[1].totalMxnValue - left[1].totalMxnValue,
  )
  const maxValue = entries[0]?.[1].totalMxnValue ?? 0

  return entries.map(([category, details]) => ({
    category,
    totalMxnValue: details.totalMxnValue,
    totalMxn: formatCurrency(details.totalMxnValue, 'MXN'),
    share: maxValue === 0 ? 0 : (Math.abs(details.totalMxnValue) / maxValue) * 100,
    isNegative: details.totalMxnValue < 0,
    items: [...details.items].sort((left, right) => right.totalMxnValue - left.totalMxnValue),
  }))
}

export function buildCategoryChartForMonth(selectedMonth, receipts) {
  if (!selectedMonth) {
    return []
  }

  return buildCategoryChart(
    buildMonthlyItems(
      receipts.filter((receipt) => receipt.purchasedAt.startsWith(selectedMonth)),
    ),
  )
}

export function buildReceiptEntries(receipts, receiptReviews = []) {
  const receiptReviewMap = new Map(
    receiptReviews.map((review) => [review.receiptId, review.decision]),
  )
  return [...receipts]
    .sort((left, right) => right.purchasedAt.localeCompare(left.purchasedAt))
    .map((receipt) => {
      const summary = summarizeReceiptBudget(
        receipt,
        receiptReviewMap.get(receipt.id),
      )

      return {
        id: receipt.id,
        fileName: receipt.fileName,
        relativePath: receipt.relativePath,
        monthKey: receipt.purchasedAt.slice(0, 7),
        purchasedAt: formatDate(receipt.purchasedAt),
        url: receipt.url,
        parseStatus: receipt.parseStatus,
        parseNotes: receipt.parseNotes,
        totalMxn: receipt.totalMxn,
        officialTotalMxn: summary.officialTotalMxn,
        parsedItemsTotalMxn: summary.parsedItemsTotalMxn,
        budgetTotalMxn: summary.budgetTotalMxn,
        totalCheckStatus: summary.totalCheckStatus,
        totalCheckLabel: summary.totalCheckLabel,
        totalCheckDetail: summary.totalCheckDetail,
        parsedItemsCount: summary.parsedItemsCount,
        parsedItemsCountValue: summary.parsedItemsCountValue,
        differenceMxn: summary.differenceMxn,
        parsedItemDetails: receipt.items.map((item) => ({
          key: `${receipt.id}-${item.productCode ?? item.originalName}-${item.totalMxnValue}`,
          name: item.name,
          originalName: item.originalName,
          quantity: item.quantity,
          unitType: item.unitType ?? 'count',
          totalMxn: formatCurrency(item.totalMxn, 'MXN'),
          category: item.category,
        })),
        editableItems: receipt.items.map((item, index) => ({
          id: `${receipt.id}-item-${index}`,
          name: item.name,
          originalName: item.originalName,
          productCode: item.productCode ?? null,
          category: item.category,
          quantity: item.quantity,
          unitType: item.unitType ?? 'count',
          totalMxn: item.totalMxn,
          swedenUnitSek:
            item.quantity > 0 ? item.swedenAverageSek / item.quantity : 0,
          normalizationStatus: item.normalizationStatus,
        })),
      }
    })
}

export function buildReceiptCalendar(receiptEntries) {
  const months = new Map()

  receiptEntries.forEach((receipt) => {
    const currentMonth = months.get(receipt.monthKey) ?? {
      monthKey: receipt.monthKey,
      monthLabel: new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${receipt.monthKey}-01T00:00:00Z`)),
      receiptCount: 0,
      receipts: [],
    }

    currentMonth.receiptCount += 1
    currentMonth.receipts.push(receipt)
    months.set(receipt.monthKey, currentMonth)
  })

  return [...months.values()].sort((left, right) =>
    right.monthKey.localeCompare(left.monthKey),
  )
}

export function buildReceiptReviewItems(receiptEntries) {
  return receiptEntries.filter((receipt) => receipt.totalCheckStatus === 'needs_review')
}

export function buildReceiptAuditItems(receiptEntries) {
  return [...receiptEntries]
    .map((receipt) => {
      const hasParsedItems = receipt.parsedItemsCountValue > 0

      let auditStatus = 'ok'
      let auditLabel = 'Looks complete'
      let auditDetail = `Parser currently sees ${formatQuantity(receipt.parsedItemsCountValue)} items across ${receipt.parsedItemDetails.length} parsed ${receipt.parsedItemDetails.length === 1 ? 'line' : 'lines'}.`

      if (!hasParsedItems) {
        auditStatus = 'missing'
        auditLabel = 'No parsed items'
        auditDetail = receipt.parseNotes
      } else if (receipt.parseStatus === 'text_only' || receipt.parseStatus === 'date_only') {
        auditStatus = 'unknown'
        auditLabel = 'Needs parser support'
        auditDetail = receipt.parseNotes
      }

      return {
        ...receipt,
        auditStatus,
        auditLabel,
        auditDetail,
      }
    })
    .sort((left, right) => {
      const statusOrder = { warning: 0, missing: 1, unknown: 2, ok: 3 }
      const leftRank = statusOrder[left.auditStatus] ?? 99
      const rightRank = statusOrder[right.auditStatus] ?? 99

      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return right.purchasedAt.localeCompare(left.purchasedAt)
    })
}

function pickLargestEntry(map) {
  return [...map.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'No data'
}

function formatLargestEntryValue(map, currency) {
  const value = [...map.values()].sort((left, right) => right - left)[0]

  return typeof value === 'number' ? formatCurrency(value, currency) : 'No data'
}

function formatTopItemSpend(monthlyItems, itemTotals) {
  const topItemName = pickLargestEntry(itemTotals)
  const topItem = monthlyItems.find((item) => item.name === topItemName)

  return topItem?.totalMxn ?? 'No data'
}

function summarizeReceiptBudget(receipt, reviewDecision = null) {
  const parsedItemsTotalValue = receipt.items.reduce(
    (sum, item) => sum + item.totalMxn,
    0,
  )
  const parsedItemsCountValue = receipt.items.reduce(
    (sum, item) => sum + (item.unitType === 'weight' ? 1 : item.quantity),
    0,
  )
  const excludedItemsTotalValue = receipt.items.reduce(
    (sum, item) =>
      item.category === 'Exclude from budget' ? sum + item.totalMxn : sum,
    0,
  )
  const budgetItemsTotalValue = parsedItemsTotalValue - excludedItemsTotalValue
  const officialTotalValue = receipt.totalMxnValue
  const ignoredAdjustmentTotalValue = receipt.ignoredAdjustmentTotalMxn ?? 0
  const parsedNetTotalValue = parsedItemsTotalValue + ignoredAdjustmentTotalValue

  if (officialTotalValue == null && receipt.items.length === 0) {
    return {
      officialTotalMxn: 'No total yet',
      parsedItemsTotalMxn: 'No items yet',
      budgetTotalMxn: 'Pending PDF parsing',
      effectiveBudgetTotalMxn: 0,
      differenceMxn: null,
      parsedItemsCountValue,
      parsedItemsCount: formatQuantity(parsedItemsCountValue),
      totalCheckStatus: 'pending',
      totalCheckLabel: 'Waiting for parsing',
      totalCheckDetail: 'No readable total or line items have been extracted yet.',
    }
  }

  if (officialTotalValue != null && receipt.items.length === 0) {
    return {
      officialTotalMxn: formatCurrency(officialTotalValue, 'MXN'),
      parsedItemsTotalMxn: 'No items yet',
      budgetTotalMxn: formatCurrency(officialTotalValue, 'MXN'),
      effectiveBudgetTotalMxn: officialTotalValue,
      differenceMxn: null,
      parsedItemsCountValue,
      parsedItemsCount: formatQuantity(parsedItemsCountValue),
      totalCheckStatus: 'total_only',
      totalCheckLabel: 'Total only',
      totalCheckDetail: 'Using the printed receipt total until line items are parsed.',
    }
  }

  if (officialTotalValue == null) {
    return {
      officialTotalMxn: 'No total yet',
      parsedItemsTotalMxn: formatCurrency(parsedNetTotalValue, 'MXN'),
      budgetTotalMxn: formatCurrency(budgetItemsTotalValue + ignoredAdjustmentTotalValue, 'MXN'),
      effectiveBudgetTotalMxn: budgetItemsTotalValue + ignoredAdjustmentTotalValue,
      differenceMxn: null,
      parsedItemsCountValue,
      parsedItemsCount: formatQuantity(parsedItemsCountValue),
      totalCheckStatus: 'items_only',
      totalCheckLabel: 'Items only',
      totalCheckDetail: 'Using parsed line items because the printed total was not extracted.',
    }
  }

  const differenceValue = officialTotalValue - parsedNetTotalValue
  const isAligned = Math.abs(differenceValue) < AUTO_APPLY_TOTAL_DIFF_MXN
  const effectiveBudgetTotalMxn = isAligned || reviewDecision === 'use_official_total'
    ? Math.max(officialTotalValue - excludedItemsTotalValue, 0)
    : budgetItemsTotalValue + ignoredAdjustmentTotalValue
  const adjustmentDetail =
    Math.abs(ignoredAdjustmentTotalValue) > 0.009
      ? ` Ignoring ${formatSignedCurrencyValue(ignoredAdjustmentTotalValue, 'MXN')} from delivery/coupon adjustments.`
      : ''

  if (reviewDecision === 'use_official_total') {
    return {
      officialTotalMxn: formatCurrency(officialTotalValue, 'MXN'),
      parsedItemsTotalMxn: formatCurrency(parsedNetTotalValue, 'MXN'),
      budgetTotalMxn: formatCurrency(effectiveBudgetTotalMxn, 'MXN'),
      effectiveBudgetTotalMxn,
      differenceMxn: formatSignedCurrencyValue(differenceValue, 'MXN'),
      parsedItemsCountValue,
      parsedItemsCount: formatQuantity(parsedItemsCountValue),
      totalCheckStatus: 'confirmed_official',
      totalCheckLabel: 'Using printed total',
      totalCheckDetail:
        `You confirmed that the printed receipt total should be used for this receipt.${adjustmentDetail}`,
    }
  }

  if (reviewDecision === 'keep_parsed_items') {
    return {
      officialTotalMxn: formatCurrency(officialTotalValue, 'MXN'),
      parsedItemsTotalMxn: formatCurrency(parsedNetTotalValue, 'MXN'),
      budgetTotalMxn: formatCurrency(effectiveBudgetTotalMxn, 'MXN'),
      effectiveBudgetTotalMxn,
      differenceMxn: formatSignedCurrencyValue(differenceValue, 'MXN'),
      parsedItemsCountValue,
      parsedItemsCount: formatQuantity(parsedItemsCountValue),
      totalCheckStatus: 'confirmed_items',
      totalCheckLabel: 'Using parsed items',
      totalCheckDetail:
        `You confirmed that the parsed item total should stay in the budget for this receipt.${adjustmentDetail}`,
    }
  }

  return {
    officialTotalMxn: formatCurrency(officialTotalValue, 'MXN'),
    parsedItemsTotalMxn: formatCurrency(parsedNetTotalValue, 'MXN'),
    budgetTotalMxn: formatCurrency(effectiveBudgetTotalMxn, 'MXN'),
    effectiveBudgetTotalMxn,
    differenceMxn: formatSignedCurrencyValue(differenceValue, 'MXN'),
    parsedItemsCountValue,
    parsedItemsCount: formatQuantity(parsedItemsCountValue),
    totalCheckStatus: isAligned ? 'aligned' : 'needs_review',
    totalCheckLabel: isAligned ? 'Aligned to receipt total' : 'Needs review',
    totalCheckDetail: isAligned
      ? `Difference ${formatSignedCurrencyValue(differenceValue, 'MXN')} was below ${AUTO_APPLY_TOTAL_DIFF_MXN} MXN, so the printed total is used.${adjustmentDetail}`
      : `Printed total and parsed items differ by ${formatSignedCurrencyValue(differenceValue, 'MXN')}. The budget still uses parsed items until you review this receipt.${adjustmentDetail}`,
  }
}

function buildReceiptBudgetItems(receipt) {
  const items = [...receipt.items]
  const adjustmentTotal = receipt.ignoredAdjustmentTotalMxn ?? 0

  if (Math.abs(adjustmentTotal) < 0.009) {
    return items
  }

  items.push({
    name: 'Unallocated discount',
    originalName: 'Receipt-level discount',
    category: 'Discounts',
    quantity: 1,
    unitType: 'adjustment',
    totalMxn: adjustmentTotal,
    totalMxnValue: adjustmentTotal,
    swedenAverageSek: 0,
    normalizationStatus: 'matched',
    isAdjustment: true,
  })

  return items
}

function sumEffectiveBudgetTotals(receipts, receiptReviewMap) {
  return receipts.reduce((sum, receipt) => {
    const summary = summarizeReceiptBudget(receipt, receiptReviewMap.get(receipt.id))
    return sum + summary.effectiveBudgetTotalMxn
  }, 0)
}

function sumOfficialOrParsedItemCounts(receipts) {
  return receipts.reduce(
    (sum, receipt) =>
      sum +
      receipt.items.reduce(
        (itemSum, item) => itemSum + (item.unitType === 'weight' ? 1 : item.quantity),
        0,
      ),
    0,
  )
}

function sumMonthlyItemsByCategory(monthlyItems) {
  return monthlyItems.reduce((summary, item) => {
    summary.set(item.category, (summary.get(item.category) ?? 0) + item.totalMxnValue)
    return summary
  }, new Map())
}

function formatMonthLabel(monthValue) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthValue}-01T00:00:00Z`))
}

function formatSignedNumber(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}`
}

function describeDeltaDirection(value, verb) {
  if (value > 0) {
    return `${verb} more than last month`
  }

  if (value < 0) {
    return `${verb} less than last month`
  }

  return `matched last month`
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatSignedCurrencyValue(amount, currency) {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  const formattedAmount = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))

  return `${sign}${formattedAmount}`
}

function formatQuantity(value) {
  const roundedValue = Math.round(value * 1000) / 1000

  if (Number.isInteger(roundedValue)) {
    return String(roundedValue)
  }

  return roundedValue.toLocaleString('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

function formatItemCount(value) {
  return formatQuantity(value)
}
