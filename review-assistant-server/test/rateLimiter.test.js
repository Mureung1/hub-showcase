import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimiter } from '../src/middleware/rateLimiter.js'

function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

// 실제 Express의 req.get(headerName)을 흉내낸다 — sessionId 미들웨어를 거치지 않고
// rateLimiter가 원본 X-Session-Id 헤더를 직접 읽는 방식을 그대로 재현하기 위함.
function mockReq({ sessionIdHeader, ip = '127.0.0.1' } = {}) {
  return {
    get: (name) => (name === 'X-Session-Id' ? sessionIdHeader : undefined),
    ip,
  }
}

function callLimiter(options) {
  const req = mockReq(options)
  const res = mockRes()
  const next = vi.fn()
  rateLimiter(req, res, next)
  return { res, next }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('rateLimiter', () => {
  it('제한 횟수(20회) 이내면 계속 통과시킨다', () => {
    const sessionIdHeader = `session-${Math.random()}`
    for (let i = 0; i < 20; i += 1) {
      const { next, res } = callLimiter({ sessionIdHeader })
      expect(next).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
    }
  })

  it('21번째 요청부터는 429 RATE_LIMITED를 반환한다', () => {
    const sessionIdHeader = `session-${Math.random()}`
    for (let i = 0; i < 20; i += 1) {
      callLimiter({ sessionIdHeader })
    }
    const { res, next } = callLimiter({ sessionIdHeader })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'RATE_LIMITED', message: expect.any(String) },
    })
  })

  it('세션이 다르면 카운트가 독립적으로 유지된다', () => {
    const sessionA = `session-a-${Math.random()}`
    const sessionB = `session-b-${Math.random()}`
    for (let i = 0; i < 20; i += 1) {
      callLimiter({ sessionIdHeader: sessionA })
    }
    const { next, res } = callLimiter({ sessionIdHeader: sessionB })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('시간 창(1분)이 지나면 다시 요청을 허용한다', () => {
    vi.useFakeTimers()
    const sessionIdHeader = `session-${Math.random()}`
    for (let i = 0; i < 20; i += 1) {
      callLimiter({ sessionIdHeader })
    }
    vi.advanceTimersByTime(60_001)
    const { next, res } = callLimiter({ sessionIdHeader })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  // 회귀 테스트: X-Session-Id 헤더가 없는 요청은 IP로 집계되어야 한다.
  // sessionId 미들웨어가 헤더 없을 때 매번 새 UUID를 만들어 채우기 때문에,
  // rateLimiter가 req.sessionId를 봤다면 이 케이스에서 항상 통과되어 레이트리밋이 무력화된다.
  it('X-Session-Id 헤더가 없으면 IP 기준으로 집계된다', () => {
    const ip = `10.0.0.${Math.floor(Math.random() * 255)}`
    for (let i = 0; i < 20; i += 1) {
      const { next, res } = callLimiter({ sessionIdHeader: undefined, ip })
      expect(next).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
    }
    const { res, next } = callLimiter({ sessionIdHeader: undefined, ip })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('X-Session-Id 헤더가 없어도 IP가 다르면 독립적으로 집계된다', () => {
    for (let i = 0; i < 20; i += 1) {
      callLimiter({ sessionIdHeader: undefined, ip: '10.0.0.1' })
    }
    const { next, res } = callLimiter({ sessionIdHeader: undefined, ip: '10.0.0.2' })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })
})
