import type { Subsidy } from '@hub/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ upsertedRows: [] as unknown[] }))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      upsert: (rows: unknown[]) => {
        state.upsertedRows = rows
        return Promise.resolve({ error: null })
      },
    }),
  },
}))

import { upsertSubsidies } from './upsert.js'

const sample: Subsidy = {
  id: 'PBLN_1',
  name: '테스트 지원금',
  org: '테스트기관',
  amount: '최대 100만원',
  dday: 10,
  match: 50,
  deadline: '2026. 8. 1',
  method: '온라인',
  qualifications: ['소상공인'],
  documents: ['첨부: 공고문.pdf'],
  how: '온라인 접수',
  where: '테스트기관',
  whereUrl: 'https://example.com',
  contact: '000-0000',
  region: ['서울'],
  industry: ['음식점'],
  supportRealm: '경영',
  supportRealmDetail: '사업화지원',
}

describe('upsertSubsidies', () => {
  beforeEach(() => {
    state.upsertedRows = []
  })

  it('빈 배열이면 upsert를 호출하지 않는다', async () => {
    const result = await upsertSubsidies([])
    expect(result).toEqual({ count: 0 })
    expect(state.upsertedRows).toEqual([])
  })

  it('Subsidy의 모든 필드(특히 supportRealm/supportRealmDetail)가 row에 빠짐없이 매핑된다', async () => {
    await upsertSubsidies([sample])
    expect(state.upsertedRows).toEqual([
      {
        id: 'PBLN_1',
        name: '테스트 지원금',
        org: '테스트기관',
        amount: '최대 100만원',
        dday: 10,
        match_score: 50,
        deadline: '2026. 8. 1',
        method: '온라인',
        qualifications: ['소상공인'],
        documents: ['첨부: 공고문.pdf'],
        how: '온라인 접수',
        apply_where: '테스트기관',
        where_url: 'https://example.com',
        contact: '000-0000',
        region: ['서울'],
        industry: ['음식점'],
        support_realm: '경영',
        support_realm_detail: '사업화지원',
        employees: null,
        employees_max_count: null,
        revenue: null,
        revenue_max_krw: null,
        business_years: null,
        business_years_max: null,
        atch_file_id: null,
      },
    ])
  })
})
