// AbortController 기반 fetch 타임아웃 래퍼. 응답이 지연되면 무한 로딩 대신 타임아웃 에러로 전환한다.
import { API_BASE } from './apiBase.js'

const DEFAULT_TIMEOUT_MS = 28000

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  // options.signal은 호출자가 직접 취소(예: 디바운스 검색에서 이전 요청 취소)하려는 용도 —
  // 내부 타임아웃용 controller와 별개라, 외부 신호가 abort되면 내부 controller도 함께 abort시켜
  // 실제 fetch를 중단시키되, 에러 메시지는 "지연"이 아니라 원래의 AbortError 그대로 던져
  // 호출자가 "내가 취소한 것"과 "서버가 늦은 것"을 구분할 수 있게 한다.
  const { signal: externalSignal, ...restOptions } = options
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  // 웹에서는 API_BASE가 ''이라 상대경로 그대로. 앱 빌드에서는 배포 백엔드 절대주소가 앞에 붙는다.
  const finalUrl = typeof url === 'string' && url.startsWith('/api') ? `${API_BASE}${url}` : url

  try {
    return await fetch(finalUrl, { ...restOptions, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      if (externalSignal?.aborted) throw err
      throw new Error('요청이 지연되고 있습니다. 잠시 후 다시 시도해주세요.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
