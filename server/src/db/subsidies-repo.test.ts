import type { OnboardingProfile } from '@hub/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubsidyRow } from './mappers.js'

const state = vi.hoisted(() => ({ rows: [] as SubsidyRow[] }))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: state.rows, error: null }),
        }),
      }),
    }),
  },
}))

import { match } from './subsidies-repo.js'

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

  it('subsidy.region이 있지만 profile.region이 없으면 감점된다', async () => {
    state.rows = [makeRow({ id: '1', region: ['부산'] })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(30) // 50 - 20
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

  it('감점은 0 밑으로 내려가지 않는다', async () => {
    state.rows = [makeRow({ id: '1', region: ['부산'], match_score: 10 })]
    const {
      items: [result],
    } = await match(profile)
    expect(result.match).toBe(0)
  })

  it('region이 다른 여러 건을 넣으면 조건에 맞는 지원금이 match 정렬에서 위로 온다', async () => {
    state.rows = [
      makeRow({ id: 'busan', region: ['부산'], match_score: 50 }),
      makeRow({ id: 'seoul', region: ['서울'], match_score: 50 }),
      makeRow({ id: 'nationwide', region: ['서울', '부산', '경기'], match_score: 50 }),
    ]
    const result = await match(profile, 'match')
    // busan(30)은 감점, seoul/nationwide는 둘 다 70으로 동점 — id 오름차순 2차 정렬(#48)로 결정됨
    expect(result.items.map((r) => r.id)).toEqual(['nationwide', 'seoul', 'busan'])
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
