import { buildNetworkErrorMessage, readJsonOrThrow } from './apiClient.js'

export async function uploadReceiptFiles(files) {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('receipts', file)
  })

  try {
    const response = await fetch('/api/receipts/import', {
      method: 'POST',
      body: formData,
    })
    return await readJsonOrThrow(response, 'Receipt upload failed.')
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildNetworkErrorMessage('import receipts'))
    }

    throw error
  }
}
