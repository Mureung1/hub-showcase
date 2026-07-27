import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BizinfoAnnouncement } from './bizinfo-client.js'

const state = vi.hoisted(() => ({
  existingIds: [] as string[],
  enrichAnnouncements: vi.fn(),
  upsertSubsidies: vi.fn(),
}))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      select: () => ({
        in: (_column: string, ids: string[]) =>
          Promise.resolve({
            data: ids.filter((id) => state.existingIds.includes(id)).map((id) => ({ id })),
            error: null,
          }),
      }),
    }),
  },
}))
vi.mock('./ai-enrichment.js', () => ({ enrichAnnouncements: state.enrichAnnouncements }))
vi.mock('./upsert.js', () => ({ upsertSubsidies: state.upsertSubsidies }))

import { processAnnouncements } from './pipeline.js'

function makeItem(id: string, attachment?: { fileName: string; atchFileId: string }): BizinfoAnnouncement {
  return {
    pblancId: id,
    pblancNm: `공고 ${id}`,
    jrsdInsttNm: '기관',
    reqstBeginEndDe: '2026-07-01 ~ 2026-12-31',
    bsnsSumryCn: '',
    pblancUrl: 'https://example.com',
    pldirSportRealmLclasCodeNm: '경영',
    totCnt: 1,
    creatPnttm: '2026-07-01 00:00:00',
    updtPnttm: '2026-07-01 00:00:00',
    inqireCo: 0,
    ...(attachment
      ? {
          printFileNm: attachment.fileName,
          printFlpthNm: `https://www.bizinfo.go.kr/cmm/fms/getImageFile.do?atchFileId=${attachment.atchFileId}&fileSn=1`,
        }
      : {}),
  }
}

describe('processAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.existingIds = []
    state.upsertSubsidies.mockResolvedValue({ count: 0 })
  })

  it('이미 DB에 있는 id는 신규로 취급하지 않고 enrichAnnouncements에 넘기지 않는다', async () => {
    state.existingIds = ['PBLN_1']
    const items = [makeItem('PBLN_1'), makeItem('PBLN_2')]

    await processAnnouncements(items)

    const enrichedItems = state.enrichAnnouncements.mock.calls[0][0] as BizinfoAnnouncement[]
    expect(enrichedItems.map((i) => i.pblancId)).toEqual(['PBLN_2'])
  })

  it('모두 신규면 전부 enrichAnnouncements에 넘긴다', async () => {
    const items = [makeItem('PBLN_1'), makeItem('PBLN_2')]

    await processAnnouncements(items)

    const enrichedItems = state.enrichAnnouncements.mock.calls[0][0] as BizinfoAnnouncement[]
    expect(enrichedItems.map((i) => i.pblancId)).toEqual(['PBLN_1', 'PBLN_2'])
  })

  it('빈 배열이면 Supabase 조회 없이 바로 종료한다', async () => {
    await processAnnouncements([])
    expect(state.enrichAnnouncements).toHaveBeenCalledWith([])
  })
})

describe('processAnnouncements — atchFileId 반영 (이슈 #77)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.existingIds = []
    state.upsertSubsidies.mockResolvedValue({ count: 0 })
  })

  it('첨부파일이 있는 공고는 upsert할 subsidy에 atchFileId를 채운다', async () => {
    const items = [makeItem('PBLN_1', { fileName: '공고문.pdf', atchFileId: 'FILE_123' })]

    await processAnnouncements(items)

    const upserted = state.upsertSubsidies.mock.calls[0][0] as { atchFileId?: string }[]
    expect(upserted[0].atchFileId).toBe('FILE_123')
  })

  it('첨부파일이 없는 공고는 atchFileId가 undefined다', async () => {
    const items = [makeItem('PBLN_1')]

    await processAnnouncements(items)

    const upserted = state.upsertSubsidies.mock.calls[0][0] as { atchFileId?: string }[]
    expect(upserted[0].atchFileId).toBeUndefined()
  })
})
