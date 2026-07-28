import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KstartupAnnouncement } from './kstartup-client.js'

const state = vi.hoisted(() => ({
  existingNames: [] as string[],
  upsertSubsidies: vi.fn(),
}))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: state.existingNames.map((name) => ({ name })), error: null }),
    }),
  },
}))
vi.mock('./upsert.js', () => ({ upsertSubsidies: state.upsertSubsidies }))

import { processKstartupAnnouncements } from './kstartup-pipeline.js'

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
