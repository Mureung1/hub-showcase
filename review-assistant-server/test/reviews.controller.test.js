import { describe, it, expect } from 'vitest'

// reviews.controller.js가 history.service.js를 거쳐 supabaseClient.js를 import하는데,
// 그 모듈이 import 시점에 바로 createClient()를 호출한다 — 실제 .env 키 없이도
// (그리고 실제 키에 의존하지 않고도) 이 순수 함수 테스트가 돌아가도록 더미 값을 먼저 채운다.
// 정적 import는 파일 맨 위로 호이스팅되므로, 동적 import로 순서를 강제한다.
process.env.SUPABASE_URL ??= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'

const { validateReviews } = await import('../src/controllers/reviews.controller.js')
const { ApiError } = await import('../src/middleware/errorHandler.js')

function assertApiError(fn, code) {
  let thrown
  try {
    fn()
  } catch (err) {
    thrown = err
  }
  expect(thrown).toBeInstanceOf(ApiError)
  expect(thrown.status).toBe(400)
  expect(thrown.code).toBe(code)
}

describe('validateReviews', () => {
  // 1. 정상: 유효한 리뷰 여러 개는 trim된 그대로 반환된다
  it('유효한 리뷰 배열은 그대로 반환된다', () => {
    const result = validateReviews(['맛있어요', '친절해요'])
    expect(result).toEqual(['맛있어요', '친절해요'])
  })

  // 2. 정상: 앞뒤 공백은 trim된다
  it('앞뒤 공백이 있는 리뷰는 trim되어 반환된다', () => {
    const result = validateReviews(['  맛있어요  '])
    expect(result).toEqual(['맛있어요'])
  })

  // 3. 정상: 유효한 값과 빈 값이 섞이면 빈 값만 걸러낸다
  it('빈 문자열이 섞여 있으면 걸러내고 유효한 것만 반환한다', () => {
    const result = validateReviews(['좋아요', '', '  '])
    expect(result).toEqual(['좋아요'])
  })

  // 4. 경계값: 정확히 MAX_REVIEWS(15)개는 통과한다
  it('정확히 15개면 통과한다', () => {
    const reviews = Array.from({ length: 15 }, (_, i) => `리뷰 ${i}`)
    const result = validateReviews(reviews)
    expect(result).toHaveLength(15)
  })

  // 5. 경계값: 16개(MAX_REVIEWS + 1)는 TOO_MANY_REVIEWS
  it('16개면 TOO_MANY_REVIEWS 에러가 발생한다', () => {
    const reviews = Array.from({ length: 16 }, (_, i) => `리뷰 ${i}`)
    assertApiError(() => validateReviews(reviews), 'TOO_MANY_REVIEWS')
  })

  // 6. 빈 값: 빈 배열
  it('빈 배열이면 EMPTY_INPUT 에러가 발생한다', () => {
    assertApiError(() => validateReviews([]), 'EMPTY_INPUT')
  })

  // 7. 빈 값: undefined / null
  it('undefined면 EMPTY_INPUT 에러가 발생한다', () => {
    assertApiError(() => validateReviews(undefined), 'EMPTY_INPUT')
  })

  it('null이면 EMPTY_INPUT 에러가 발생한다', () => {
    assertApiError(() => validateReviews(null), 'EMPTY_INPUT')
  })

  // 8. 빈 값: 배열이 아닌 타입
  it('배열이 아닌 문자열이면 EMPTY_INPUT 에러가 발생한다', () => {
    assertApiError(() => validateReviews('리뷰'), 'EMPTY_INPUT')
  })

  it('배열이 아닌 객체면 EMPTY_INPUT 에러가 발생한다', () => {
    assertApiError(() => validateReviews({}), 'EMPTY_INPUT')
  })

  // 9. 실패: 전부 공백/빈 문자열
  it('전부 공백뿐이면 NO_VALID_REVIEW 에러가 발생한다', () => {
    assertApiError(() => validateReviews(['', '   ', '\n']), 'NO_VALID_REVIEW')
  })

  // 10. 버그 수정 대상(TDD RED): 문자열이 아닌 값(null/undefined/숫자/객체)은
  // String()으로 강제 변환하지 않고 무시해야 한다. 아직 구현 전이라 실패해야 정상.
  it('배열 안에 문자열이 아닌 값이 섞여 있으면 그 항목은 무시하고 유효한 문자열만 반환한다', () => {
    const result = validateReviews([null, undefined, 123, {}, '진짜 리뷰'])
    expect(result).toEqual(['진짜 리뷰'])
  })

  it('문자열이 아닌 값만 있으면 NO_VALID_REVIEW 에러가 발생한다', () => {
    assertApiError(() => validateReviews([null, undefined, 123, {}]), 'NO_VALID_REVIEW')
  })

  // 11. 순서 보존: 필터링 후에도 원래 순서를 유지한다
  it('필터링 후에도 원래 순서를 유지한다', () => {
    const result = validateReviews(['A', '', 'B'])
    expect(result).toEqual(['A', 'B'])
  })
})
