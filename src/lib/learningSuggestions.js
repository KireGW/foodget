export function buildLearningSuggestions(originalReceipt, editedItems) {
  if (!originalReceipt) {
    return []
  }

  const originalItemsByKey = new Map(
    originalReceipt.editableItems.map((item) => [buildItemKey(item), item]),
  )

  return editedItems.reduce((suggestions, item) => {
    const originalItem = originalItemsByKey.get(buildItemKey(item))

    if (!originalItem) {
      return suggestions
    }

    const normalizedName = item.name.trim()
    const normalizedCategory = item.category
    const nameChanged = normalizedName && normalizedName !== originalItem.name
    const categoryChanged = normalizedCategory !== originalItem.category

    if (!nameChanged && !categoryChanged) {
      return suggestions
    }

    const hasReusableKey = item.productCode || item.originalName
    if (!hasReusableKey) {
      return suggestions
    }

    suggestions.push({
      id: buildItemKey(item),
      productCode: item.productCode ?? null,
      originalName: item.originalName || originalItem.originalName || normalizedName,
      canonicalName: normalizedName || originalItem.name,
      category: normalizedCategory || originalItem.category,
      reason: item.productCode
        ? 'You corrected an item with a Walmart article code, so this can help future receipts too.'
        : 'You corrected a repeated receipt text, so this can be reused as a future mapping.',
    })

    return suggestions
  }, [])
}

function buildItemKey(item) {
  return `${item.productCode ?? item.originalName ?? item.name}|${item.originalName ?? item.name}`
}
