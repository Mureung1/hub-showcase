import type { OnboardingProfile } from '@hub/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubsidyRow } from './mappers.js'

const state = vi.hoisted(() => ({ rows: [] as SubsidyRow[], single: null as SubsidyRow | null }))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: state.rows, error: null }),
        }),
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: state.single, error: null }),
        }),
      }),
    }),
  },
}))

import { findById, match } from './subsidies-repo.js'

function makeRow(overrides: Partial<SubsidyRow>): SubsidyRow {
  return {
    id: '1',
    name: '테스트 지원금',
    org: '테스트기관',
    amount: '최대 100만원',
    dday: 10,
    match_score: 50,
    deadline: '2026. 8. 1',
    method: '온라인',
    qualifications: [],
    documents: [],
    how: '온라인 접수',
    apply_where: '테스트기관',
    where_url: null,
    contact: '000-0000',
    region: [],
    industry: [],
    ...overrides,
  }
}

const profile: OnboardingProfile = {
  industry: '음식점',
  region: '서울',
  district: '마포구',
  employees: '1~4명',
  revenue: '5천만원 미만',
}

describe('match', () => {
  beforeEach(() => {
    state.rows = []
  })

  it('subsidy.region에 profile.region이 포함되면 가점을 받는다', async () => {
    state.rows = [makeRow({ id: '1', region: ['서울', '경기'] })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(70) // 50 + 20
  })

  it('subsidy.region이 있지만 profile.region과 다르면 결과에서 제외된다 (이슈 #62)', async () => {
    state.rows = [makeRow({ id: '1', region: ['부산'] })]
    const { items, total } = await match(profile)
    expect(items).toHaveLength(0)
    expect(total).toBe(0)
  })

  it('subsidy.region이 비어있으면(지역 정보 없음) 점수를 그대로 유지한다', async () => {
    state.rows = [makeRow({ id: '1', region: [], match_score: 50 })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(50)
  })

  it('가점은 100을 넘지 않는다', async () => {
    state.rows = [makeRow({ id: '1', region: ['서울'], match_score: 95 })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(100)
  })

  it('region이 다른 여러 건을 넣으면 불일치 항목은 제외되고 나머지만 정렬된다 (이슈 #62)', async () => {
    state.rows = [
      makeRow({ id: 'busan', region: ['부산'], match_score: 50 }),
      makeRow({ id: 'seoul', region: ['서울'], match_score: 50 }),
      makeRow({ id: 'nationwide', region: ['서울', '부산', '경기'], match_score: 50 }),
    ]
    const result = await match(profile, 'match')
    // busan은 region 불일치로 제외, seoul/nationwide는 둘 다 70으로 동점 — id 오름차순 2차 정렬(#48)
    expect(result.items.map((r) => r.id)).toEqual(['nationwide', 'seoul'])
    expect(result.total).toBe(2)
  })
})

describe('match — industry 가점 (이슈 #52)', () => {
  beforeEach(() => {
    state.rows = []
  })

  it('subsidy.industry에 profile.industry가 포함되면 가점을 받는다', async () => {
    state.rows = [makeRow({ id: '1', industry: ['음식점', '카페·베이커리'] })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(60) // 50 + 10 (region은 비어있어 변화 없음)
  })

  it('subsidy.industry가 있지만 profile.industry와 다르면 페널티 없이 그대로 유지한다', async () => {
    state.rows = [makeRow({ id: '1', industry: ['제조업'] })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(50)
  })

  it('subsidy.industry가 비어있으면(업종 정보 없음) 점수를 그대로 유지한다', async () => {
    state.rows = [makeRow({ id: '1', industry: [] })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(50)
  })

  it('region 가점과 industry 가점이 함께 적용된다', async () => {
    state.rows = [makeRow({ id: '1', region: ['서울'], industry: ['음식점'] })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(80) // 50 + 20(region) + 10(industry)
  })

  it('industry 가점도 100을 넘지 않는다', async () => {
    state.rows = [makeRow({ id: '1', industry: ['음식점'], match_score: 95 })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(100)
  })
})

describe('match 페이지네이션 (이슈 #48)', () => {
  beforeEach(() => {
    state.rows = Array.from({ length: 25 }, (_, i) =>
      makeRow({ id: String(i + 1).padStart(2, '0'), match_score: 50 }),
    )
  })

  it('page/limit 없이 호출하면 기본값(1페이지, 20건)이 적용된다', async () => {
    const result = await match(profile)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.items).toHaveLength(20)
    expect(result.total).toBe(25)
    expect(result.hasMore).toBe(true)
  })

  it('마지막 페이지는 hasMore가 false다', async () => {
    const result = await match(profile, 'match', 2, 20)
    expect(result.items).toHaveLength(5)
    expect(result.hasMore).toBe(false)
  })

  it('limit을 지정하면 그만큼만 반환한다', async () => {
    const result = await match(profile, 'match', 1, 10)
    expect(result.items).toHaveLength(10)
    expect(result.hasMore).toBe(true)
  })
})

describe('findById — 프로필 기반 재계산 (이슈 #61)', () => {
  beforeEach(() => {
    state.single = null
  })

  it('profile 없이 호출하면 저장된 match_score를 그대로 반환한다', async () => {
    state.single = makeRow({ id: '1', region: ['서울'], match_score: 50 })
    const result = await findById('1')
    expect(result?.match).toBe(50)
  })

  it('profile을 넘기면 리스트(match())와 동일한 공식으로 매칭도를 재계산한다', async () => {
    state.single = makeRow({ id: '1', region: ['서울'], industry: ['음식점'], match_score: 50 })
    const result = await findById('1', { region: '서울', industry: '음식점' })
    expect(result?.match).toBe(80) // 50 + 20(region) + 10(industry) — match() 테스트와 동일 공식
  })

  it('존재하지 않는 id는 null을 반환한다', async () => {
    state.single = null
    const result = await findById('no-such-id', { region: '서울', industry: '음식점' })
    expect(result).toBeNull()
  })
})
