import { buildNetworkErrorMessage, readJsonOrThrow } from './apiClient.js'

export async function fetchProductOverrides() {
  try {
    const response = await fetch('/api/product-overrides')
    const payload = await readJsonOrThrow(
      response,
      'Could not load product mappings.',
    )
    return payload.overrides
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('load product mappings'))
    }

    throw error
  }
}

export async function saveProductOverride(override) {
  try {
    const response = await fetch('/api/product-overrides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(override),
    })
    const payload = await readJsonOrThrow(
      response,
      'Could not save product mapping.',
    )
    return payload.override
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('save product mappings'))
    }

    throw error
  }
}

export function applyProductOverrides(receipts, overrides) {
  const overrideIndexes = buildOverrideIndexes(overrides)

  return receipts.map((receipt) => ({
    ...receipt,
    items: receipt.items.map((item) => {
      const override = findOverrideForItem(item, overrideIndexes)

      if (!override) {
        return item
      }

      return {
        ...item,
        name: override.canonicalName,
        category: override.category,
        normalizationStatus: 'user_override',
      }
    }),
  }))
}

export function buildProductMappings(receipts, overrides) {
  const overrideIndexes = buildOverrideIndexes(overrides)
  const productMappings = new Map()

  receipts.forEach((receipt) => {
    receipt.items.forEach((item) => {
      const lookupKey = getItemLookupKey(item)
      const override = findOverrideForItem(item, overrideIndexes)
      const currentProduct = productMappings.get(lookupKey) ?? {
        overrideKey: lookupKey,
        productCode: item.productCode ?? null,
        originalName: item.originalName,
        suggestedName: override?.canonicalName ?? item.name,
        currentName: override?.canonicalName ?? item.name,
        currentCategory: override?.category ?? item.category,
        timesSeen: 0,
        latestSeenAt: receipt.purchasedAt,
        latestReceiptUrl: receipt.url,
        latestReceiptFileName: receipt.fileName,
        latestStore: receipt.store ?? 'Unknown',
        latestSourceType: receipt.sourceType ?? 'parsed',
        normalizationStatus: override ? 'user_override' : item.normalizationStatus,
      }

      currentProduct.timesSeen += 1
      currentProduct.originalName = item.originalName

      if (receipt.purchasedAt > currentProduct.latestSeenAt) {
        currentProduct.latestSeenAt = receipt.purchasedAt
        currentProduct.latestReceiptUrl = receipt.url
        currentProduct.latestReceiptFileName = receipt.fileName
        currentProduct.latestStore = receipt.store ?? 'Unknown'
        currentProduct.latestSourceType = receipt.sourceType ?? 'parsed'
      }

      productMappings.set(lookupKey, currentProduct)
    })
  })

  return [...productMappings.values()].sort((left, right) => {
    const leftPriority = isNeedsMappingStatus(left.normalizationStatus) ? 0 : 1
    const rightPriority = isNeedsMappingStatus(right.normalizationStatus) ? 0 : 1

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return getProductLabel(left).localeCompare(getProductLabel(right))
  })
}

function isNeedsMappingStatus(status) {
  return status === 'unmatched' || status === 'needs_mapping'
}

function getItemLookupKey(item) {
  return item.productCode || item.originalName
}

function getProductLabel(product) {
  return product.productCode || product.originalName
}

function buildOverrideIndexes(overrides) {
  return {
    byProductCode: new Map(
      overrides
        .filter((override) => override.productCode)
        .map((override) => [override.productCode, override]),
    ),
    byOriginalName: new Map(
      overrides
        .filter((override) => override.originalName)
        .map((override) => [override.originalName, override]),
    ),
  }
}

function findOverrideForItem(item, overrideIndexes) {
  if (item.productCode && overrideIndexes.byProductCode.has(item.productCode)) {
    return overrideIndexes.byProductCode.get(item.productCode)
  }

  return overrideIndexes.byOriginalName.get(item.originalName)
}
