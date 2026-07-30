import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KstartupAnnouncement } from './kstartup-client.js'

const state = vi.hoisted(() => ({
  existingNames: [] as string[],
  existingIds: [] as string[],
  upsertSubsidies: vi.fn(),
  fetchKstartupAnnouncements: vi.fn(),
}))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      // getExistingNames: select('name')를 바로 await — Promise 반환
      // getExistingIds: select('id').in('id', ids) — .in()이 딸린 체이닝 객체 반환
      select: (columns: string) => {
        if (columns === 'name') {
          return Promise.resolve({ data: state.existingNames.map((name) => ({ name })), error: null })
        }
        return {
          in: (_col: string, ids: string[]) =>
            Promise.resolve({
              data: ids.filter((id) => state.existingIds.includes(id)).map((id) => ({ id })),
              error: null,
            }),
        }
      },
    }),
  },
}))
vi.mock('./upsert.js', () => ({ upsertSubsidies: state.upsertSubsidies }))
vi.mock('./kstartup-client.js', () => ({
  fetchKstartupAnnouncements: state.fetchKstartupAnnouncements,
}))

import { processKstartupAnnouncements, processKstartupDaily } from './kstartup-pipeline.js'

function makeItem(pbancSn: number, name: string, endDt = '20260101'): KstartupAnnouncement {
  return {
    pbanc_sn: pbancSn,
    biz_pbanc_nm: name,
    pbanc_ntrp_nm: '기관',
    pbanc_ctnt: '',
    pbanc_rcpt_bgng_dt: '20250101',
    pbanc_rcpt_end_dt: endDt,
    rcrt_prgs_yn: 'Y',
  }
}

describe('processKstartupAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.existingNames = []
    state.existingIds = []
    state.upsertSubsidies.mockResolvedValue({ count: 0 })
  })

  it('빈 배열이면 supabase/upsert 호출 없이 바로 반환한다', async () => {
    const result = await processKstartupAnnouncements([])
    expect(result).toEqual({ upserted: 0, expired: 0, duplicates: 0 })
    expect(state.upsertSubsidies).not.toHaveBeenCalled()
  })

  it('기존 공고와 제목이 충분히 유사하면 중복으로 스킵하고 upsert 대상에서 제외한다', async () => {
    state.existingNames = ['청년 창업 임대료 지원']
    const items = [makeItem(1, '청년 창업 임대료 지원', '20261231')]

    const result = await processKstartupAnnouncements(items)

    expect(result.duplicates).toBe(1)
    expect(state.upsertSubsidies).toHaveBeenCalledWith([])
  })

  it('중복이 아닌 항목은 upsert 대상에 포함된다', async () => {
    state.existingNames = ['전혀 다른 공고']
    const items = [makeItem(1, '새로운 K-Startup 공고', '20261231')]
    state.upsertSubsidies.mockResolvedValue({ count: 1 })

    const result = await processKstartupAnnouncements(items)

    expect(result.upserted).toBe(1)
    expect(result.duplicates).toBe(0)
    expect(state.upsertSubsidies).toHaveBeenCalledTimes(1)
    const upsertedArg = state.upsertSubsidies.mock.calls[0][0]
    expect(upsertedArg).toHaveLength(1)
    expect(upsertedArg[0].id).toBe('KS_1')
  })

  it('마감이 지난 항목은 upsert 대상에서 제외하고 expired로 집계한다', async () => {
    const items = [makeItem(1, '마감 지난 공고', '20200101')]

    const result = await processKstartupAnnouncements(items)

    expect(result.expired).toBe(1)
    expect(state.upsertSubsidies).toHaveBeenCalledWith([])
  })
})

describe('processKstartupDaily (이슈 #126)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.existingNames = []
    state.existingIds = []
    state.upsertSubsidies.mockImplementation((rows: unknown[]) => Promise.resolve({ count: rows.length }))
  })

  it('신규 항목을 처리한 뒤 다음 페이지가 비어있으면 거기서 멈춘다', async () => {
    // 기존 id를 안 만났어도 다음 페이지가 실제로 비어있으면(더 이상 데이터 없음) 멈춰야 한다 —
    // "신규였다"는 사실만으로는 다음 페이지 존재 여부를 알 수 없어 항상 한 페이지 더 확인한다.
    state.fetchKstartupAnnouncements.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve(page === 1 ? [makeItem(1, '신규 공고 1', '20261231')] : []),
    )

    const result = await processKstartupDaily(100)

    expect(result.pagesFetched).toBe(2)
    expect(result.upserted).toBe(1)
    expect(state.fetchKstartupAnnouncements).toHaveBeenCalledTimes(2)
    expect(state.fetchKstartupAnnouncements).toHaveBeenNthCalledWith(1, { page: 1, perPage: 100 })
    expect(state.fetchKstartupAnnouncements).toHaveBeenNthCalledWith(2, { page: 2, perPage: 100 })
  })

  it('이미 DB에 있는 id를 만난 페이지까지 처리하고 중단한다', async () => {
    state.existingIds = ['KS_2'] // page 2의 항목 하나가 이미 DB에 있음
    state.fetchKstartupAnnouncements.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) return Promise.resolve([makeItem(1, '신규 공고 1', '20261231')])
      if (page === 2) return Promise.resolve([makeItem(2, '기존 공고', '20261231')])
      // page 3 이상은 절대 호출되면 안 됨 — 호출되면 아래 assertion에서 실패
      return Promise.resolve([makeItem(3, '더 과거 공고', '20261231')])
    })

    const result = await processKstartupDaily(100)

    expect(result.pagesFetched).toBe(2)
    expect(state.fetchKstartupAnnouncements).toHaveBeenCalledTimes(2)
    expect(state.fetchKstartupAnnouncements).not.toHaveBeenCalledWith({ page: 3, perPage: 100 })
  })

  it('빈 페이지를 만나면 즉시 중단한다', async () => {
    state.fetchKstartupAnnouncements.mockResolvedValue([])

    const result = await processKstartupDaily(100)

    expect(result.pagesFetched).toBe(1)
    expect(result.upserted).toBe(0)
    expect(state.fetchKstartupAnnouncements).toHaveBeenCalledTimes(1)
  })

  it('계속 신규만 나오면 안전 상한(20페이지)에서 중단한다', async () => {
    let call = 0
    state.fetchKstartupAnnouncements.mockImplementation(() => {
      call += 1
      return Promise.resolve([makeItem(call, `공고 ${call}`, '20261231')])
    })

    const result = await processKstartupDaily(100)

    expect(result.pagesFetched).toBe(20)
    expect(state.fetchKstartupAnnouncements).toHaveBeenCalledTimes(20)
  })
})
