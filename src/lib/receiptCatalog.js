import { buildNetworkErrorMessage, readJsonOrThrow } from './apiClient.js'

export async function fetchReceiptCatalog() {
  try {
    const response = await fetch('/api/receipts/catalog', {
      cache: 'no-store',
    })
    const payload = await readJsonOrThrow(
      response,
      'Could not load receipts.',
    )
    return payload.receipts ?? []
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('load receipts'))
    }

    throw error
  }
}
