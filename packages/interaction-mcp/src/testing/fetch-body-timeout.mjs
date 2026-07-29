const timeoutMs = Number(process.env.AY_PLE_TEST_FETCH_BODY_TIMEOUT_MS)

if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
  throw new TypeError('A positive test body timeout is required')
}

const nativeFetch = globalThis.fetch

globalThis.fetch = async (...input) => {
  const response = await nativeFetch(...input)
  if (!response.body) return response

  const reader = response.body.getReader()
  const body = new ReadableStream({
    async pull(controller) {
      let timer
      try {
        const next = await Promise.race([
          reader.read(),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              const error = new Error('Test response body timeout')
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
