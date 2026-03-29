import { buildNetworkErrorMessage, readJsonOrThrow } from './apiClient.js'

export async function fetchReceiptReviews() {
  try {
    const response = await fetch('/api/receipt-reviews')
    const payload = await readJsonOrThrow(
      response,
      'Could not load receipt reviews.',
    )
    return payload.reviews
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('load receipt reviews'))
    }

    throw error
  }
}

export async function saveReceiptReview(review) {
  try {
    const response = await fetch('/api/receipt-reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(review),
    })
    const payload = await readJsonOrThrow(
      response,
      'Could not save receipt review.',
    )
    return payload.review
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('save receipt reviews'))
    }

    throw error
  }
}
