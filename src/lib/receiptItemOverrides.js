import { buildNetworkErrorMessage, readJsonOrThrow } from './apiClient.js'

export async function fetchReceiptItemOverrides() {
  try {
    const response = await fetch('/api/receipt-item-overrides')
    const payload = await readJsonOrThrow(
      response,
      'Could not load receipt item overrides.',
    )
    return payload.overrides
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('load receipt item overrides'))
    }

    throw error
  }
}

export async function saveReceiptItemOverride(override) {
  try {
    const response = await fetch('/api/receipt-item-overrides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(override),
    })
    const payload = await readJsonOrThrow(
      response,
      'Could not save receipt item override.',
    )
    return payload.override
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('save receipt item overrides'))
    }

    throw error
  }
}

export function applyReceiptItemOverrides(receipts, itemOverrides) {
  const overridesByReceiptId = new Map(
    itemOverrides.map((override) => [override.receiptId, override]),
  )

  return receipts.map((receipt) => {
    const override = overridesByReceiptId.get(receipt.id)

    if (!override) {
      return receipt
    }

    const overrideItems = override.items.map(normalizeOverrideItem)
    const removedItems = (override.removedItems?.length ?? 0) > 0
      ? override.removedItems.map(normalizeRemovedOverrideItem)
      : inferRemovedReceiptItems(receipt.items, overrideItems)

    return {
      ...receipt,
      items: overrideItems,
      removedItems,
      hasReceiptItemOverride: true,
    }
  })
}

function normalizeOverrideItem(item) {
  const quantity = Number(item.quantity) || 0
  const totalMxnValue = Number(item.totalMxn) || 0
  const swedenUnitSek = Number(item.swedenUnitSek) || 0

  return {
    name: item.name,
    originalName: item.originalName || item.name,
    productCode: item.productCode ?? null,
    category: item.category,
    quantity,
    unitType: item.unitType ?? 'count',
    totalMxnValue,
    totalMxn: totalMxnValue,
    swedenAverageSek: Math.round(swedenUnitSek * quantity),
    normalizationStatus: item.normalizationStatus || 'user_override',
  }
}

function normalizeRemovedOverrideItem(item) {
  const quantity = Number(item.quantity) || 0
  const totalMxnValue = Number(item.totalMxn) || 0

  return {
    name: item.name,
    originalName: item.originalName || item.name,
    productCode: item.productCode ?? null,
    category: item.category,
    quantity,
    unitType: item.unitType ?? 'count',
    totalMxnValue,
    totalMxn: totalMxnValue,
  }
}

function inferRemovedReceiptItems(originalItems, overrideItems) {
  if (overrideItems.length >= originalItems.length) {
    return []
  }

  const remainingCounts = new Map()

  overrideItems.forEach((item) => {
    const key = buildReceiptItemKey(item)
    remainingCounts.set(key, (remainingCounts.get(key) ?? 0) + 1)
  })

  return originalItems
    .filter((item) => {
      const key = buildReceiptItemKey(item)
      const remainingCount = remainingCounts.get(key) ?? 0

      if (remainingCount > 0) {
        remainingCounts.set(key, remainingCount - 1)
        return false
      }

      return true
    })
    .map((item) => ({
      name: item.name,
      originalName: item.originalName || item.name,
      productCode: item.productCode ?? null,
      category: item.category,
      quantity: item.quantity,
      unitType: item.unitType ?? 'count',
      totalMxnValue: item.totalMxnValue,
      totalMxn: item.totalMxn,
    }))
}

function buildReceiptItemKey(item) {
  return [
    item.productCode ?? '',
    item.originalName || item.name,
    Number(item.totalMxn ?? item.totalMxnValue ?? 0).toFixed(2),
  ].join('::')
}
