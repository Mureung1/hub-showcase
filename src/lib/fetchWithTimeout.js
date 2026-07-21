// AbortController 기반 fetch 타임아웃 래퍼. 응답이 지연되면 무한 로딩 대신 타임아웃 에러로 전환한다.
import { API_BASE } from './apiBase.js'

const DEFAULT_TIMEOUT_MS = 28000

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  // 웹에서는 API_BASE가 ''이라 상대경로 그대로. 앱 빌드에서는 배포 백엔드 절대주소가 앞에 붙는다.
  const finalUrl = typeof url === 'string' && url.startsWith('/api') ? `${API_BASE}${url}` : url

  try {
    return await fetch(finalUrl, { ...options, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('요청이 지연되고 있습니다. 잠시 후 다시 시도해주세요.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
