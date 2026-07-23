/// <reference types="node" />

import { request as requestHttps } from 'node:https'
import type { RequestOptions } from 'node:https'
import type {
  ClientRequest,
  IncomingMessage,
} from 'node:http'

const ARCHIVE_REQUEST_INACTIVITY_TIMEOUT_MS = 30_000
const ARCHIVE_REQUEST_CONNECT_DEADLINE_MS = 30_000
const MAX_STRONG_ETAG_BYTES = 1024
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

export type ArchiveHttpsRequester = (
  url: URL,
  options: RequestOptions,
  listener: (response: IncomingMessage) => void,
) => ClientRequest

export class ArchiveTransportNetworkError extends Error {
  readonly automaticRetryAllowed: boolean

  constructor(automaticRetryAllowed: boolean) {
    super('The Runtime archive transport was interrupted.')
    this.name = 'ArchiveTransportNetworkError'
    this.automaticRetryAllowed = automaticRetryAllowed
  }
}

export function createNodeArchiveTransport(
  requester: ArchiveHttpsRequester = requestHttps,
): ArchiveTransport {
  return {
    async exchange<T>(
      request: ArchiveTransportRequest,
      consume: (response: ArchiveTransportResponse) => Promise<T>,
    ): Promise<T> {
      const url = decodeHttpsRequestUrl(request.url)
      const opened = await openHttpsResponse({
        headers: archiveTransportRequestHeaders(request),
        requester,
        signal: request.signal,
        url,
      })
      try {
        return await consume({
          statusCode: opened.response.statusCode ?? 0,
          headers: readAllowedResponseHeaders(opened.response),
          body: normalizeArchiveTransportBody(
            opened.response,
            request.signal,
          ),
        })
      } finally {
        opened.response.destroy()
        opened.request.destroy()
      }
    },
  }
}

export async function* normalizeArchiveTransportBody(
  body: AsyncIterable<Uint8Array> & {
    readonly complete?: boolean
  },
  signal: AbortSignal,
): AsyncIterable<Uint8Array> {
  try {
    for await (const chunk of body) yield chunk
    if (body.complete === false) {
      throw new ArchiveTransportNetworkError(true)
    }
  } catch (error) {
    throw normalizeTransportError(error, signal)
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
      !isStrongArchiveEtag(request.range.ifRange)
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
  readonly requester: ArchiveHttpsRequester
  readonly signal: AbortSignal
  readonly url: URL
}): Promise<{
  readonly request: ClientRequest
  readonly response: IncomingMessage
}> {
  return new Promise((resolve, reject) => {
    let request: ClientRequest
    let response: IncomingMessage | undefined
    let clearConnectDeadline: () => void = () => undefined
    const failBeforeResponse = (error: unknown) => {
      if (response === undefined) clearConnectDeadline()
      routeArchiveRequestError(
        error,
        input.signal,
        response,
        reject,
      )
    }
    const options: RequestOptions = {
      agent: false,
      headers: input.headers,
      maxHeaderSize: 16 * 1024,
      method: 'GET',
      rejectUnauthorized: true,
      signal: input.signal,
    }
    try {
      request = input.requester(input.url, options, (openedResponse) => {
        clearConnectDeadline()
        response = openedResponse
        resolve({ request, response: openedResponse })
      })
    } catch (error) {
      reject(normalizeTransportError(error, input.signal))
      return
    }
    clearConnectDeadline = armArchiveConnectDeadline(
      request,
      ARCHIVE_REQUEST_CONNECT_DEADLINE_MS,
    )
    request.once('error', failBeforeResponse)
    request.setTimeout(
      ARCHIVE_REQUEST_INACTIVITY_TIMEOUT_MS,
      () => request.destroy(new ArchiveTransportNetworkError(true)),
    )
    request.end()
  })
}

export function armArchiveConnectDeadline(
  request: { destroy(error?: Error): unknown },
  timeoutMs: number,
): () => void {
  const timer = setTimeout(() => {
    request.destroy(new ArchiveTransportNetworkError(true))
  }, timeoutMs)
  timer.unref()
  return () => clearTimeout(timer)
}

export function routeArchiveRequestError(
  error: unknown,
  signal: AbortSignal,
  response: { destroy(error?: Error): unknown } | undefined,
  reject: (error: Error) => void,
): void {
  const normalized = normalizeTransportError(error, signal)
  if (response === undefined) {
    reject(normalized)
    return
  }
  response.destroy(normalized)
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
  if (signal.aborted) {
    return error instanceof Error
      ? error
      : new DOMException('The operation was aborted.', 'AbortError')
  }
  if (error instanceof ArchiveTransportNetworkError) return error
  return new ArchiveTransportNetworkError(
    isAllowlistedTransientNodeError(error),
  )
}

function isAllowlistedTransientNodeError(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) return false
  return new Set([
    'EAI_AGAIN',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETDOWN',
    'ENETUNREACH',
    'ENOTFOUND',
    'EPIPE',
    'ETIMEDOUT',
  ]).has(String(error.code))
}

export function isStrongArchiveEtag(value: string): boolean {
  return (
    Buffer.byteLength(value, 'utf8') <= MAX_STRONG_ETAG_BYTES &&
    /^"[\u0021\u0023-\u007e\u0080-\u00ff]*"$/u.test(value)
  )
}
