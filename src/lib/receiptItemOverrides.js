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

    return {
      ...receipt,
      items: override.items.map((item) => {
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
      }),
    }
  })
}
