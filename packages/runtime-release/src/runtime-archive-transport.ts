/// <reference types="node" />

import { request as requestHttps } from 'node:https'
import type {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
} from 'node:http'

const ARCHIVE_REQUEST_INACTIVITY_TIMEOUT_MS = 30_000
const RESPONSE_HEADER_NAMES = [
  'content-encoding',
  'content-length',
  'content-range',
  'etag',
  'location',
  'retry-after',
] as const

export type ArchiveTransportRange = {
  readonly start: number
  readonly ifRange: string
}

export type ArchiveTransportRequest = {
  readonly url: string
  readonly range?: ArchiveTransportRange
  readonly signal: AbortSignal
}

export type ArchiveTransportResponseHeader =
  (typeof RESPONSE_HEADER_NAMES)[number]

export type ArchiveTransportResponse = {
  readonly statusCode: number
  readonly headers: Readonly<
    Partial<
      Record<ArchiveTransportResponseHeader, readonly string[]>
    >
  >
  readonly body: AsyncIterable<Uint8Array>
}

/**
 * Package-private one-hop HTTPS boundary. Redirect, retry, resume, and
 * representation policy remain owned by the archive download Module.
 * The callback scope guarantees request/response disposal on every exit.
 */
export interface ArchiveTransport {
  exchange<T>(
    request: ArchiveTransportRequest,
    consume: (response: ArchiveTransportResponse) => Promise<T>,
  ): Promise<T>
}

export class ArchiveTransportNetworkError extends Error {
  constructor() {
    super('The Runtime archive transport was interrupted.')
    this.name = 'ArchiveTransportNetworkError'
  }
}

export function createNodeArchiveTransport(): ArchiveTransport {
  return {
    async exchange<T>(
      request: ArchiveTransportRequest,
      consume: (response: ArchiveTransportResponse) => Promise<T>,
    ): Promise<T> {
      const url = decodeHttpsRequestUrl(request.url)
      const opened = await openHttpsResponse({
        headers: archiveTransportRequestHeaders(request),
        signal: request.signal,
        url,
      })
      try {
        return await consume({
          statusCode: opened.response.statusCode ?? 0,
          headers: readAllowedResponseHeaders(opened.response),
          body: opened.response,
        })
      } finally {
        opened.response.destroy()
        opened.request.destroy()
      }
    },
  }
}

export function archiveTransportRequestHeaders(
  request: ArchiveTransportRequest,
): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {
    accept: 'application/octet-stream',
    'accept-encoding': 'identity',
  }
  if (request.range !== undefined) {
    if (
      !Number.isSafeInteger(request.range.start) ||
      request.range.start < 0 ||
      !isStrongEtag(request.range.ifRange)
    ) {
      throw new TypeError('The Runtime archive range is invalid.')
    }
    headers.range = `bytes=${request.range.start}-`
    headers['if-range'] = request.range.ifRange
  }
  return headers
}

function decodeHttpsRequestUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new TypeError('The Runtime archive URL is invalid.')
  }
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== ''
  ) {
    throw new TypeError('The Runtime archive URL is invalid.')
  }
  return url
}

async function openHttpsResponse(input: {
  readonly headers: Readonly<Record<string, string>>
  readonly signal: AbortSignal
  readonly url: URL
}): Promise<{
  readonly request: ClientRequest
  readonly response: IncomingMessage
}> {
  return new Promise((resolve, reject) => {
    let request: ClientRequest
    const failBeforeResponse = (error: unknown) => {
      reject(normalizeTransportError(error, input.signal))
    }
    const options: RequestOptions = {
      headers: input.headers,
      method: 'GET',
      signal: input.signal,
    }
    try {
      request = requestHttps(input.url, options, (response) => {
        request.off('error', failBeforeResponse)
        resolve({ request, response })
      })
    } catch (error) {
      reject(normalizeTransportError(error, input.signal))
      return
    }
    request.once('error', failBeforeResponse)
    request.setTimeout(
      ARCHIVE_REQUEST_INACTIVITY_TIMEOUT_MS,
      () => request.destroy(new ArchiveTransportNetworkError()),
    )
    request.end()
  })
}

function readAllowedResponseHeaders(
  response: IncomingMessage,
): ArchiveTransportResponse['headers'] {
  const headers: Partial<
    Record<ArchiveTransportResponseHeader, readonly string[]>
  > = {}
  for (const name of RESPONSE_HEADER_NAMES) {
    const values = response.headersDistinct[name]
    if (values !== undefined) headers[name] = [...values]
  }
  return headers
}

function normalizeTransportError(
  error: unknown,
  signal: AbortSignal,
): Error {
  if (signal.aborted || isAbortError(error)) {
    return error instanceof Error
      ? error
      : new DOMException('The operation was aborted.', 'AbortError')
  }
  if (error instanceof ArchiveTransportNetworkError) return error
  return new ArchiveTransportNetworkError()
}

function isStrongEtag(value: string): boolean {
  return /^"[\u0021\u0023-\u007e\u0080-\u00ff]*"$/u.test(value)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
