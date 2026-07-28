import { Buffer } from 'node:buffer'
import process from 'node:process'

export function createCorsHeaders(allowedOrigin = process.env.ICU_ALLOWED_ORIGIN || '*') {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  }
}

export async function readRequestBody(request, maxBytes = 1_000_000) {
  const chunks = []
  let totalBytes = 0

  for await (const chunk of request) {
    totalBytes += chunk.length
    if (totalBytes > maxBytes) {
      throw new Error('Request body exceeded the size limit')
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

export function parseJsonBody(bodyText) {
  try {
    return { ok: true, value: JSON.parse(bodyText || '{}') }
  } catch {
    return { ok: false, value: null }
  }
}

export function writeJson(response, status, body, headers = createCorsHeaders()) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  response.end(body === null ? '' : JSON.stringify(body))
}

export function createRouteNotFoundResponse() {
  return {
    status: 404,
    body: { error: 'not_found', message: '지원하지 않는 API 경로입니다.' },
    headers: createCorsHeaders(),
  }
}