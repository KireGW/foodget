import { readJsonOrThrow } from './apiClient.js'

export async function fetchManualReceipts() {
  const response = await fetch('/api/manual-receipts')
  const payload = await readJsonOrThrow(
    response,
    'Could not load manual receipts.',
  )

  return payload.receipts ?? []
}

export async function saveManualReceipt(manualReceipt) {
  const response = await fetch('/api/manual-receipts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(manualReceipt),
  })

  const payload = await readJsonOrThrow(
    response,
    'Could not save manual receipt.',
  )

  return payload.receipt
}

export async function deleteManualReceipt(receiptId) {
  const response = await fetch('/api/manual-receipts', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiptId }),
  })

  await readJsonOrThrow(response, 'Could not delete manual receipt.')
}
