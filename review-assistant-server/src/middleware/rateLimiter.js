const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20

// 세션(X-Session-Id) 또는 IP 기준, 1분에 20회로 제한하는 간단한 인메모리 슬라이딩 윈도우.
// 서버가 여러 인스턴스로 스케일아웃되면 인스턴스별로 따로 카운트되므로 정확한 전역 제한은 아니다 —
// 지금 규모(단일 인스턴스)에선 별도 저장소(Redis 등) 없이 이 정도로 충분하다고 판단.
const requestLog = new Map()

export function rateLimiter(req, res, next) {
  // req.sessionId는 sessionId 미들웨어가 헤더 없을 때 매번 새 UUID를 생성해 채우므로
  // 항상 truthy하다 — req.ip로 떨어뜨리려면 원본 요청 헤더를 직접 봐야 한다.
  // (안 그러면 X-Session-Id를 안 보내는 클라이언트마다 매 요청이 새 키로 잡혀 레이트리밋이 무력화된다.)
  const key = req.get('X-Session-Id') || req.ip
  const now = Date.now()
  const recentTimestamps = (requestLog.get(key) || []).filter((t) => now - t < WINDOW_MS)

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recentTimestamps)
    return res.status(429).json({
      error: { code: 'RATE_LIMITED', message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
    })
  }

  recentTimestamps.push(now)
  requestLog.set(key, recentTimestamps)
  next()
}
