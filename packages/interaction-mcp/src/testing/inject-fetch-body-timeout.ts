// Regression oracle for the former Undici-based Adapter transport. The
// production Adapter must keep its lifecycle alive even when global fetch
// would expire a held response body. Reverting the Adapter to fetch makes the
// real built-process test fail at this injected deadline.
const timeoutMs = Number(process.env.AY_PLE_TEST_FETCH_BODY_TIMEOUT_MS)

if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
  throw new TypeError('A positive test body timeout is required')
}

const nativeFetch = globalThis.fetch

globalThis.fetch = async (...input: Parameters<typeof fetch>) => {
  const response = await nativeFetch(...input)
  if (!response.body) return response

  const reader = response.body.getReader()
  const body = new ReadableStream({
    async pull(controller) {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const next = await Promise.race<ReadableStreamReadResult<Uint8Array>>([
          reader.read(),
          new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
            timer = setTimeout(() => {
              const error = new Error('Test response body timeout') as Error & {
                code: string
              }
              error.code = 'UND_ERR_BODY_TIMEOUT'
              reject(error)
            }, timeoutMs)
          }),
        ])
        if (next.done) {
          controller.close()
          return
        }
        controller.enqueue(next.value)
      } catch (error) {
        controller.error(error)
        await reader.cancel(error).catch(() => undefined)
      } finally {
        clearTimeout(timer)
      }
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
