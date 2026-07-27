import { describe, it, expect } from 'vitest'

// supabaseClient.js가 모듈 로드 시점에 즉시 createClient()를 호출하는 eager 초기화라(#50 백로그),
// countKeywords 같은 순수 함수 하나만 테스트하려 해도 이 체인을 거치면 실제 env가 필요하다.
process.env.SUPABASE_URL ??= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'

const { countKeywords } = await import('../src/services/stats.service.js')

describe('countKeywords', () => {
  it('스키마 안 키워드는 그대로 카운트한다', () => {
    const rows = [{ keywords: ['맛', '친절도'] }, { keywords: ['맛'] }]
    expect(countKeywords(rows)).toEqual({ 맛: 2, 친절도: 1 })
  })

  it('레거시 row에 스키마 밖 키워드가 있어도 "일반"으로 대체해 카운트한다', () => {
    // #39(keywords enum 가드) 도입 이전에 저장된 row를 흉내낸 것 — #41 재검증 중 발견된 문제
    const rows = [{ keywords: ['불편'] }, { keywords: ['불편함'] }]
    expect(countKeywords(rows)).toEqual({ 일반: 2 })
  })

  it('같은 row 안에서 대체 후 중복되는 키워드는 한 번만 센다', () => {
    const rows = [{ keywords: ['불편', '불편함'] }]
    expect(countKeywords(rows)).toEqual({ 일반: 1 })
  })
})
