import { Buffer } from 'node:buffer'

export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export function writeJson(response, status, body, headers = createCorsHeaders()) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  response.end(body === null ? '' : JSON.stringify(body))
}