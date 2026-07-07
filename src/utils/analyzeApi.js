const analyzeEndpoint = '/api/analyze'

function createAnalyzeApiError(type, message, options = {}) {
  const error = new Error(message)
  error.type = type
  error.status = options.status || null
  error.serverMessage = options.serverMessage || ''
  return error
}

async function parseJsonResponse(response) {
  const responseText = await response.text()
  const fallbackErrorType =
    !response.ok && response.status >= 500 ? 'network_error' : 'invalid_response'

  if (!responseText.trim()) {
    throw createAnalyzeApiError(
      response.ok ? 'empty_response' : fallbackErrorType,
      'Analyze API returned no body.',
      {
        status: response.status,
      },
    )
  }

  try {
    return JSON.parse(responseText)
  } catch {
    throw createAnalyzeApiError(
      response.ok ? 'invalid_response' : fallbackErrorType,
      'Analyze API returned invalid JSON.',
      { status: response.status },
    )
  }
}

function assertObjectResponse(payload, status) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createAnalyzeApiError(
      'invalid_response',
      'Analyze API returned an invalid response.',
      { status },
    )
  }
}

function getServerErrorMessage(payload) {
  return typeof payload?.error?.message === 'string' ? payload.error.message : ''
}

function getServerErrorType(payload) {
  return typeof payload?.error?.type === 'string' ? payload.error.type : ''
}

export async function analyzeNoticeWithServerMock({
  language,
  noticeTitle,
  extractedText,
  userSelectedNoticeType,
  noticePublicationDate,
  uploadedFileName,
}) {
  let response

  try {
    response = await fetch(analyzeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'mock',
        language,
        noticeTitle,
        noticeText: extractedText,
        extractedText,
        userSelectedNoticeType: userSelectedNoticeType || 'unknown',
        noticePublicationDate,
        uploadedFileName,
      }),
    })
  } catch {
    throw createAnalyzeApiError(
      'network_error',
      'Analyze API could not be reached.',
    )
  }

  const payload = await parseJsonResponse(response)
  assertObjectResponse(payload, response.status)

  if (!response.ok) {
    const serverType = getServerErrorType(payload)
    const serverMessage = getServerErrorMessage(payload)

    throw createAnalyzeApiError(
      serverType || 'server_error',
      serverMessage || 'Analyze API request failed.',
      {
        status: response.status,
        serverMessage,
      },
    )
  }

  return payload
}
