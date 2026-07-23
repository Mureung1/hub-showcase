import assert from 'node:assert/strict'
import type {
  ClientRequest,
  IncomingMessage,
} from 'node:http'
import test from 'node:test'

import {
  armArchiveConnectDeadline,
  archiveTransportRequestHeaders,
  ArchiveTransportNetworkError,
  createNodeArchiveTransport,
  normalizeArchiveTransportBody,
  routeArchiveRequestError,
} from './runtime-archive-transport.js'
import type {
  ArchiveHttpsRequester,
} from './runtime-archive-transport.js'

test('resume headers reject validators that cannot be journaled safely', () => {
  for (const ifRange of [
    `"${'x'.repeat(1025)}"`,
    '"runtime-v1"\r\nx-injected: true',
  ]) {
    assert.throws(
      () =>
        archiveTransportRequestHeaders({
          url: 'https://example.test/runtime.tar.gz',
          range: { start: 1, ifRange },
          signal: new AbortController().signal,
        }),
      TypeError,
    )
  }
})

test('a ClientRequest error after headers destroys the matching response', () => {
  const reset = Object.assign(new Error('socket reset'), {
    code: 'ECONNRESET',
  })
  let destroyedWith: Error | undefined
  let rejectedWith: Error | undefined
  const response = {
    destroy(error?: Error) {
      destroyedWith = error
      return this
    },
  }

  routeArchiveRequestError(
    reset,
    new AbortController().signal,
    response,
    (error) => {
      rejectedWith = error
    },
  )

  assert.equal(
    destroyedWith instanceof ArchiveTransportNetworkError,
    true,
  )
  assert.equal(
    (destroyedWith as ArchiveTransportNetworkError)
      .automaticRetryAllowed,
    true,
  )
  assert.equal(rejectedWith, undefined)
})

test('pre-response connect work has an absolute deadline', async () => {
  let destroyedWith: Error | undefined
  const clear = armArchiveConnectDeadline(
    {
      destroy(error?: Error) {
        destroyedWith = error
      },
    },
    1,
  )

  try {
    await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(
      destroyedWith instanceof ArchiveTransportNetworkError,
      true,
    )
    assert.equal(
      (destroyedWith as ArchiveTransportNetworkError)
        .automaticRetryAllowed,
      true,
    )
  } finally {
    clear()
  }
})

test('node adapter wires exact options, duplicate headers, body, and disposal', async () => {
  const bodyBytes = Buffer.from('adapter body')
  let capturedUrl: URL | undefined
  let capturedOptions:
    | Parameters<ArchiveHttpsRequester>[1]
    | undefined
  let requestDestroyed = false
  let responseDestroyed = false
  let responseListener:
    | ((response: IncomingMessage) => void)
    | undefined
  let errorListener: ((error: Error) => void) | undefined
  const response = {
    complete: true,
    destroy() {
      responseDestroyed = true
      return this
    },
    headersDistinct: {
      etag: ['"runtime-v1"', '"duplicate"'],
      'content-length': [String(bodyBytes.byteLength)],
      'x-secret': ['must not cross'],
    },
    statusCode: 206,
    async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
      yield bodyBytes
    },
  } as unknown as IncomingMessage
  const request = {
    destroy(error?: Error) {
      requestDestroyed = true
      if (error !== undefined) errorListener?.(error)
      return this
    },
    end() {
      queueMicrotask(() => responseListener?.(response))
      return this
    },
    once(event: string, listener: (error: Error) => void) {
      if (event === 'error') errorListener = listener
      return this
    },
    setTimeout() {
      return this
    },
  } as unknown as ClientRequest
  const requester: ArchiveHttpsRequester = (
    url,
    options,
    listener,
  ) => {
    capturedUrl = url
    capturedOptions = options
    responseListener = listener
    return request
  }
  const signal = new AbortController().signal
  const transport = createNodeArchiveTransport(requester)

  const result = await transport.exchange(
    {
      url: 'https://example.test/runtime.tar.gz',
      range: {
        start: 7,
        ifRange: '"runtime-v1"',
      },
      signal,
    },
    async (opened) => {
      assert.equal(opened.statusCode, 206)
      assert.deepEqual(opened.headers, {
        'content-length': [String(bodyBytes.byteLength)],
        etag: ['"runtime-v1"', '"duplicate"'],
      })
      const chunks: Uint8Array[] = []
      for await (const chunk of opened.body) chunks.push(chunk)
      return Buffer.concat(chunks).toString('utf8')
    },
  )

  assert.equal(result, bodyBytes.toString('utf8'))
  assert.equal(
    capturedUrl?.href,
    'https://example.test/runtime.tar.gz',
  )
  assert.deepEqual(capturedOptions, {
    agent: false,
    headers: {
      accept: 'application/octet-stream',
      'accept-encoding': 'identity',
      range: 'bytes=7-',
      'if-range': '"runtime-v1"',
    },
    maxHeaderSize: 16 * 1024,
    method: 'GET',
    rejectUnauthorized: true,
    signal,
  })
  assert.equal(responseDestroyed, true)
  assert.equal(requestDestroyed, true)
})

test('production response body normalizes allowlisted mid-stream faults', async () => {
  const signal = new AbortController().signal
  const reset = Object.assign(new Error('socket reset'), {
    code: 'ECONNRESET',
  })
  const body = normalizeArchiveTransportBody(
    (async function* () {
      yield Buffer.from('prefix')
      throw reset
    })(),
    signal,
  )
  const iterator = body[Symbol.asyncIterator]()

  assert.deepEqual(await iterator.next(), {
    done: false,
    value: Buffer.from('prefix'),
  })
  await assert.rejects(iterator.next(), (error: unknown) => {
    assert.equal(error instanceof ArchiveTransportNetworkError, true)
    assert.equal(
      (error as ArchiveTransportNetworkError).automaticRetryAllowed,
      true,
    )
    return true
  })
})

test('production response body does not auto-retry permanent or cancelled faults', async (context) => {
  await context.test('permanent fault', async () => {
    const denied = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    })
    const body = normalizeArchiveTransportBody(
      (async function* () {
        throw denied
      })(),
      new AbortController().signal,
    )

    await assert.rejects(
      body[Symbol.asyncIterator]().next(),
      (error: unknown) => {
        assert.equal(
          error instanceof ArchiveTransportNetworkError,
          true,
        )
        assert.equal(
          (error as ArchiveTransportNetworkError)
            .automaticRetryAllowed,
          false,
        )
        return true
      },
    )
  })

  await context.test('cancelled fault', async () => {
    const controller = new AbortController()
    controller.abort()
    const reset = Object.assign(new Error('socket reset'), {
      code: 'ECONNRESET',
    })
    const body = normalizeArchiveTransportBody(
      (async function* () {
        throw reset
      })(),
      controller.signal,
    )

    await assert.rejects(
      body[Symbol.asyncIterator]().next(),
      (error: unknown) => error === reset,
    )
  })

  await context.test('un-signalled AbortError', async () => {
    const peerAbort = new DOMException(
      'peer aborted',
      'AbortError',
    )
    const body = normalizeArchiveTransportBody(
      (async function* () {
        throw peerAbort
      })(),
      new AbortController().signal,
    )

    await assert.rejects(
      body[Symbol.asyncIterator]().next(),
      (error: unknown) => {
        assert.equal(
          error instanceof ArchiveTransportNetworkError,
          true,
        )
        assert.equal(
          (error as ArchiveTransportNetworkError)
            .automaticRetryAllowed,
          false,
        )
        return true
      },
    )
  })
})

test('production response body rejects a quiet incomplete message', async () => {
  const incomplete = {
    complete: false,
    async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
      yield Buffer.from('truncated prefix')
    },
  }
  const body = normalizeArchiveTransportBody(
    incomplete,
    new AbortController().signal,
  )
  const iterator = body[Symbol.asyncIterator]()

  assert.equal((await iterator.next()).done, false)
  await assert.rejects(iterator.next(), (error: unknown) => {
    assert.equal(error instanceof ArchiveTransportNetworkError, true)
    assert.equal(
      (error as ArchiveTransportNetworkError).automaticRetryAllowed,
      true,
    )
    return true
  })
})
