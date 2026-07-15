// AbortController 기반 fetch 타임아웃 래퍼. 응답이 지연되면 무한 로딩 대신 타임아웃 에러로 전환한다.
const DEFAULT_TIMEOUT_MS = 28000

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('요청이 지연되고 있습니다. 잠시 후 다시 시도해주세요.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
