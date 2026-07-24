import path from 'node:path'
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http'

import {
  ServerStartupCleanupError,
  bindServerApplicationListener,
  type AttachedServerApplicationListener,
  type BoundServerApplicationListener,
  type ServerApplication,
  type ServerStartupCleanupInput,
  type ServerStartupCleanupResult,
} from '@ay-ple/server'

import type { PreparedApplicationStartup } from './application-startup.js'
import type { DynamicLocalOrigin } from './host-contract.js'

const loopbackHost = '127.0.0.1'
const startingBody = 'AY-PLE is starting.\n'
const unavailableBody = 'AY-PLE is unavailable.\n'
const notFoundBody = 'Not found.\n'
const methodNotAllowedBody = 'Method not allowed.\n'
const invalidRequestBody = 'Invalid request.\n'

type StaticSite = PreparedApplicationStartup['staticSite']

export type StartDynamicLocalApplicationHostInput = {
  readonly prepared: PreparedApplicationStartup
  readonly signal: AbortSignal
}

export type DynamicLocalApplicationHost = {
  readonly origin: DynamicLocalOrigin
  readonly port: number
  close(
    input: ServerStartupCleanupInput,
  ): Promise<ServerStartupCleanupResult>
}

type DynamicLocalApplicationHostDependencies = {
  readonly bindServerApplicationListener:
    typeof bindServerApplicationListener
}

const productionDependencies:
  DynamicLocalApplicationHostDependencies = Object.freeze({
    bindServerApplicationListener,
  })

export function startDynamicLocalApplicationHost(
  input: StartDynamicLocalApplicationHostInput,
): Promise<DynamicLocalApplicationHost> {
  return startDynamicLocalApplicationHostForTesting(
    input,
    productionDependencies,
  )
}

/**
 * Source-internal bind seam for deterministic listener refusal and cleanup
 * tests. The package root exposes only the production host.
 */
export async function startDynamicLocalApplicationHostForTesting(
  input: StartDynamicLocalApplicationHostInput,
  dependencies: DynamicLocalApplicationHostDependencies,
): Promise<DynamicLocalApplicationHost> {
  requireActiveSignal(input.signal)
  const index = requireStaticEntry(
    input.prepared.staticSite,
    'index.html',
  )

  let expectedAuthority: string | undefined
  let requestHandler: RequestListener = (request, response) => {
    if (
      expectedAuthority !== undefined &&
      !hasExactAuthority(request, expectedAuthority)
    ) {
      respondText(response, 421, invalidRequestBody)
      return
    }
    respondText(response, 503, startingBody, {
      'cache-control': 'no-store',
      'retry-after': '1',
    })
  }
  const bound =
    await dependencies.bindServerApplicationListener({
      host: loopbackHost,
      port: 0,
      requestHandler: (request, response) => {
        try {
          requestHandler(request, response)
        } catch {
          respondUnavailable(response)
        }
      },
    })
  const origin =
    dynamicLocalOrigin(bound.port)
  expectedAuthority = `${loopbackHost}:${bound.port}`

  let application: ServerApplication
  try {
    requireActiveSignal(input.signal)
    application =
      await input.prepared.createServerAtOrigin(origin)
  } catch (error) {
    return closeUnattachedAfterFailure(
      bound,
      input.signal,
      error,
    )
  }

  // A PreparedApplicationStartup can return only the fresh, genuine C-owned
  // application it just constructed. Claim its listener lifecycle
  // immediately; the request delegate remains the bounded 503 handler.
  const attached = bound.attach(application)
  let finalHandler: RequestListener
  try {
    requireActiveSignal(input.signal)
    finalHandler = createSameOriginRequestHandler({
      application,
      authority: expectedAuthority,
      index,
      staticSite: input.prepared.staticSite,
    })
  } catch (error) {
    return closeAttachedAfterFailure({
      attached,
      error,
      signal: input.signal,
    })
  }

  // There is deliberately no await between the final readiness check and
  // delegate swap.
  requestHandler = finalHandler

  return Object.freeze({
    origin,
    port: attached.port,
    close: (closeInput: ServerStartupCleanupInput) =>
      attached.close(closeInput),
  })
}

function createSameOriginRequestHandler(input: {
  readonly application: ServerApplication
  readonly authority: string
  readonly index: Uint8Array
  readonly staticSite: StaticSite
}): RequestListener {
  return (request, response) => {
    if (!hasExactAuthority(request, input.authority)) {
      respondText(response, 421, invalidRequestBody)
      return
    }
    const requestPath = parseRequestPath(request)
    if (requestPath === null) {
      respondText(response, 400, invalidRequestBody)
      return
    }
    if (requestPath.api) {
      input.application.app(request, response)
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      respondText(response, 405, methodNotAllowedBody, {
        allow: 'GET, HEAD',
      })
      return
    }

    const relativePath = requestPath.relativePath
    const exact = relativePath === ''
      ? input.index
      : input.staticSite.read(relativePath)
    if (exact !== null) {
      respondStatic(
        response,
        request.method,
        relativePath === '' ? 'index.html' : relativePath,
        exact,
      )
      return
    }
    if (!allowsSpaFallback(relativePath)) {
      respondText(response, 404, notFoundBody)
      return
    }
    respondStatic(
      response,
      request.method,
      'index.html',
      input.index,
    )
  }
}

function parseRequestPath(
  request: IncomingMessage,
): {
  readonly api: boolean
  readonly relativePath: string
} | null {
  const requestTarget = request.url
  if (
    typeof requestTarget !== 'string' ||
    !requestTarget.startsWith('/') ||
    requestTarget.startsWith('//') ||
    requestTarget.includes('\\') ||
    requestTarget.includes('#')
  ) {
    return null
  }

  const queryIndex = requestTarget.indexOf('?')
  const encodedPathname = queryIndex === -1
    ? requestTarget
    : requestTarget.slice(0, queryIndex)
  let decodedPathname: string
  try {
    decodedPathname = decodeURIComponent(encodedPathname)
  } catch {
    return null
  }
  if (
    !decodedPathname.startsWith('/') ||
    decodedPathname.startsWith('//') ||
    decodedPathname.includes('\0') ||
    decodedPathname.includes('\\') ||
    decodedPathname.includes('#') ||
    decodedPathname.includes('?') ||
    hasUnsafePathSegment(decodedPathname)
  ) {
    return null
  }
  const api = isApiPath(decodedPathname)
  const relativePath = decodedPathname.slice(1)
  return { api, relativePath }
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

function hasUnsafePathSegment(pathname: string): boolean {
  const segments = pathname.slice(1).split('/')
  return segments.some(
    (segment, index) =>
      segment === '.' ||
      segment === '..' ||
      (segment === '' && index < segments.length - 1),
  )
}

function allowsSpaFallback(relativePath: string): boolean {
  if (relativePath === '') return true
  if (relativePath === 'assets' || relativePath.startsWith('assets/')) {
    return false
  }
  if (
    relativePath
      .split('/')
      .some((segment) => segment.startsWith('.'))
  ) {
    return false
  }
  return path.posix.extname(relativePath) === ''
}

function hasExactAuthority(
  request: IncomingMessage,
  expectedAuthority: string,
): boolean {
  let hostHeaderCount = 0
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === 'host') {
      hostHeaderCount += 1
    }
  }
  return (
    hostHeaderCount === 1 &&
    request.headers.host === expectedAuthority
  )
}

function requireStaticEntry(
  staticSite: StaticSite,
  relativePath: string,
): Uint8Array {
  const bytes = staticSite.read(relativePath)
  if (bytes === null) {
    throw new TypeError('The verified static site is incomplete')
  }
  return bytes
}

function respondStatic(
  response: ServerResponse,
  method: string | undefined,
  relativePath: string,
  bytes: Uint8Array,
): void {
  response.statusCode = 200
  response.setHeader('content-type', contentType(relativePath))
  response.setHeader('content-length', String(bytes.byteLength))
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader(
    'cache-control',
    relativePath === 'index.html'
      ? 'no-store'
      : isHashedAsset(relativePath)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
  )
  if (method === 'HEAD') {
    response.end()
    return
  }
  response.end(bytes)
}

function respondText(
  response: ServerResponse,
  statusCode: number,
  body: string,
  headers: Readonly<Record<string, string>> = {},
): void {
  if (response.headersSent || response.writableEnded) {
    if (!response.writableEnded) response.end()
    return
  }
  const bytes = Buffer.from(body)
  response.statusCode = statusCode
  response.setHeader('content-type', 'text/plain; charset=utf-8')
  response.setHeader('content-length', String(bytes.byteLength))
  response.setHeader('x-content-type-options', 'nosniff')
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value)
  }
  response.end(bytes)
}

function respondUnavailable(response: ServerResponse): void {
  respondText(response, 500, unavailableBody, {
    'cache-control': 'no-store',
  })
}

function contentType(relativePath: string): string {
  switch (path.posix.extname(relativePath).toLowerCase()) {
    case '.css':
      return 'text/css; charset=utf-8'
    case '.html':
      return 'text/html; charset=utf-8'
    case '.ico':
      return 'image/x-icon'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8'
    case '.json':
    case '.map':
      return 'application/json; charset=utf-8'
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    default:
      return 'application/octet-stream'
  }
}

function isHashedAsset(relativePath: string): boolean {
  return (
    relativePath.startsWith('assets/') &&
    /(?:^|\/)[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+$/u.test(
      relativePath,
    )
  )
}

function dynamicLocalOrigin(port: number): DynamicLocalOrigin {
  if (
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new TypeError('The bound Server port is invalid')
  }
  return `http://${loopbackHost}:${port}`
}

function requireActiveSignal(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('The operation was aborted', 'AbortError')
  }
}

async function closeUnattachedAfterFailure(
  bound: BoundServerApplicationListener,
  signal: AbortSignal,
  error: unknown,
): Promise<never> {
  const listenerResult = await closeSafely(bound, signal)
  if (
    listenerResult.status === 'closed' &&
    listenerResult.processTreeGone
  ) {
    throw error
  }
  throw new ServerStartupCleanupError((input) =>
    combineCleanupAttempts([
      () => bound.close(input),
      ...(error instanceof ServerStartupCleanupError
        ? [() => error.close(input)]
        : []),
    ]),
  )
}

async function closeAttachedAfterFailure(input: {
  readonly attached: AttachedServerApplicationListener
  readonly error: unknown
  readonly signal: AbortSignal
}): Promise<never> {
  const result = await closeSafely(
    input.attached,
    input.signal,
  )
  if (
    result.status === 'closed' &&
    result.processTreeGone
  ) {
    throw input.error
  }
  throw new ServerStartupCleanupError(
    (closeInput) => input.attached.close(closeInput),
  )
}

async function closeSafely(
  listener:
    | BoundServerApplicationListener
    | AttachedServerApplicationListener,
  signal: AbortSignal,
): Promise<ServerStartupCleanupResult> {
  try {
    return await listener.close({ signal })
  } catch {
    return { status: 'ambiguous', processTreeGone: false }
  }
}

async function combineCleanupAttempts(
  attempts: readonly (() => Promise<ServerStartupCleanupResult>)[],
): Promise<ServerStartupCleanupResult> {
  const results = await Promise.allSettled(
    attempts.map((attempt) => attempt()),
  )
  return results.every(
    (result) =>
      result.status === 'fulfilled' &&
      result.value.status === 'closed' &&
      result.value.processTreeGone,
  )
    ? { status: 'closed', processTreeGone: true }
    : { status: 'ambiguous', processTreeGone: false }
}
