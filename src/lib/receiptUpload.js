import { buildHelpfulUploadErrorMessage, buildNetworkErrorMessage } from './apiClient.js'

export class DuplicateReceiptError extends Error {
  constructor(message, duplicate) {
    super(message)
    this.name = 'DuplicateReceiptError'
    this.duplicate = duplicate
  }
}

export async function uploadReceiptFiles(files, options = {}) {
  const formData = new FormData()
  const allowDuplicates = options.allowDuplicates === true

  files.forEach((file) => {
    formData.append('receipts', file)
  })
  formData.append('allowDuplicates', String(allowDuplicates))

  try {
    const response = await fetch('/api/receipts/import', {
      method: 'POST',
      body: formData,
    })
    const contentType = response.headers.get('content-type') ?? ''
    const rawBody = await response.text()
    const payload = contentType.includes('application/json') ? JSON.parse(rawBody) : null

    if (!response.ok) {
      if (response.status === 409 && payload?.duplicate) {
        throw new DuplicateReceiptError(
          payload.error ?? 'This receipt looks identical to an existing one.',
          payload.duplicate,
        )
      }

      throw new Error(
        payload?.error ?? buildHelpfulUploadErrorMessage(response.status, 'Receipt upload failed.'),
      )
    }

    return payload
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('import receipts'))
    }

    throw error
  }
}
