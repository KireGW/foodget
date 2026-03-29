export async function readJsonOrThrow(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') ?? ''
  const rawBody = await response.text()

  if (!contentType.includes('application/json')) {
    throw new Error(buildHelpfulApiError(response.status, fallbackMessage))
  }

  let payload

  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new Error(buildHelpfulApiError(response.status, fallbackMessage))
  }

  if (!response.ok) {
    throw new Error(payload.error ?? buildHelpfulApiError(response.status, fallbackMessage))
  }

  return payload
}

export function buildNetworkErrorMessage(action) {
  return `Could not ${action} because the local receipt server could not be reached. Start the app with "npm run dev" and try again.`
}

function buildHelpfulApiError(status, fallbackMessage) {
  if (status >= 500) {
    return `${fallbackMessage} The local receipt server hit an internal error. Try again, and if it keeps happening restart "npm run dev".`
  }

  if (status === 404 || status === 0) {
    return `${fallbackMessage} The app could not reach the local receipt server. Make sure you started the app with "npm run dev".`
  }

  return fallbackMessage
}

export function buildHelpfulUploadErrorMessage(status, fallbackMessage) {
  return buildHelpfulApiError(status, fallbackMessage)
}
