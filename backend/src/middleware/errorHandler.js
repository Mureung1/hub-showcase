// 중앙 에러 핸들러. 라우터들의 catch(next(err))가 전부 여기로 모인다.
// zod 검증 실패는 400, 그 외는 서버 에러로 500 처리한다.
import { ZodError } from 'zod'

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message || '요청 값이 올바르지 않아요.'
    return res.status(400).json({ error: message })
  }

  console.error(err)
  res.status(500).json({ error: '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.' })
}
