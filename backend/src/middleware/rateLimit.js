import rateLimit from 'express-rate-limit'

function createPublicRateLimiter() {
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  })
}

// 라우트마다 별도 인스턴스를 써야 한다 — 같은 인스턴스를 여러 라우트에 붙이면
// 카운터(IP 기준)를 공유해서, 예를 들어 미리보기를 여러 번 조회한 사용자가
// 로그인 라우트에서도 함께 막히는 문제가 생긴다.
export const googleAuthRateLimiter = createPublicRateLimiter()
export const googleCallbackRateLimiter = createPublicRateLimiter()
export const previewRateLimiter = createPublicRateLimiter()
