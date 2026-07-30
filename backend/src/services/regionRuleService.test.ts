import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetSggRowsCacheForTests, getRegionRule, getZoneOptions } from './regionRuleService'
import type { GovRegionRow } from '../types/govRegionApi'

const mocks = vi.hoisted(() => ({
  regionDistrictFindUnique: vi.fn(),
  regionDistrictFindMany: vi.fn(),
  regionRuleFindUnique: vi.fn(),
  regionRuleUpsert: vi.fn(),
  regionZoneNameFindMany: vi.fn(),
  regionZoneNameUpsert: vi.fn(),
  fetchRowsBySgg: vi.fn(),
  translateNames: vi.fn(),
}))

vi.mock('../config/prisma', () => ({
  prisma: {
    regionDistrict: {
      findUnique: mocks.regionDistrictFindUnique,
      findMany: mocks.regionDistrictFindMany,
    },
    regionRule: {
      findUnique: mocks.regionRuleFindUnique,
      upsert: mocks.regionRuleUpsert,
    },
    regionZoneName: {
      findMany: mocks.regionZoneNameFindMany,
      upsert: mocks.regionZoneNameUpsert,
    },
  },
}))

vi.mock('./regionApiClient', () => ({
  getRegionApiClient: () => ({ fetchRowsBySgg: mocks.fetchRowsBySgg }),
}))

vi.mock('./regionNameClient', () => ({
  getRegionNameClient: () => ({ translateNames: mocks.translateNames }),
}))

const NOT_APPLICABLE = '해당없음'

function buildRow(overrides: Partial<GovRegionRow>): GovRegionRow {
  return {
    CTPV_NM: '',
    SGG_NM: '',
    MNG_ZONE_NM: '',
    MNG_ZONE_TRGT_RGN_NM: '',
    LF_WST_EMSN_DOW: NOT_APPLICABLE,
    LF_WST_EMSN_BGNG_TM: '',
    LF_WST_EMSN_END_TM: '',
    LF_WST_EMSN_MTHD: NOT_APPLICABLE,
    FOD_WST_EMSN_DOW: NOT_APPLICABLE,
    FOD_WST_EMSN_BGNG_TM: '',
    FOD_WST_EMSN_END_TM: '',
    FOD_WST_EMSN_MTHD: NOT_APPLICABLE,
    RCYCL_EMSN_DOW: NOT_APPLICABLE,
    RCYCL_EMSN_BGNG_TM: '',
    RCYCL_EMSN_END_TM: '',
    RCYCL_EMSN_MTHD: NOT_APPLICABLE,
    TMPRY_BULK_WASTE_EMSN_MTHD: NOT_APPLICABLE,
    TMPRY_BULK_WASTE_EMSN_PLC: NOT_APPLICABLE,
    TMPRY_BULK_WASTE_EMSN_BGNG_TM: '',
    TMPRY_BULK_WASTE_EMSN_END_TM: '',
    UNCLLT_DAY: '없음',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // sggNm='북구'를 여러 테스트가 공유하므로, 모듈 레벨 sggRowsCache에 이전 테스트의 rows가 남아있으면
  // 새로 설정한 fetchRowsBySgg mock을 무시하고 그대로 반환된다 — 매 테스트 전 반드시 비운다.
  __resetSggRowsCacheForTests()
  // 기본값: RegionZoneName 캐시에 아무것도 없고, 번역은 "EN:이름" 형태로 스텁 — 이 파일의 테스트는
  // 동 목록 파싱/확장 로직을 검증하는 게 목적이라 실제 로마자 표기 정확도는 geminiRegionNameClient
  // 쪽에서 별도로 다룬다.
  mocks.regionZoneNameFindMany.mockResolvedValue([])
  mocks.translateNames.mockImplementation((names: string[]) => names.map((name) => ({ name, nameEn: `EN:${name}` })))
})

describe('getZoneOptions', () => {
  it('커버리지가 없는 구/군이면 covered:false와 같은 시/도의 대안 구/군 목록을 반환한다', async () => {
    mocks.regionDistrictFindUnique.mockResolvedValue(null)
    mocks.regionDistrictFindMany.mockResolvedValue([
      { sggNm: '해운대구', sggNmEn: 'Haeundae-gu' },
      { sggNm: '수영구', sggNmEn: 'Suyeong-gu' },
    ])

    const result = await getZoneOptions('부산광역시', '없는구')

    expect(result).toEqual({
      covered: false,
      dongOptions: [],
      districtWide: false,
      alternativeDistricts: [
        { name: '해운대구', nameEn: 'Haeundae-gu' },
        { name: '수영구', nameEn: 'Suyeong-gu' },
      ],
    })
    expect(mocks.fetchRowsBySgg).not.toHaveBeenCalled()
  })

  it('"1~4동" 범위 표기를 펼치고, 시/도가 다른 동명 구/군의 행은 제외한다', async () => {
    mocks.regionDistrictFindUnique.mockResolvedValue({ ctpvNm: '대구광역시', sggNm: '북구' })
    mocks.fetchRowsBySgg.mockResolvedValue([
      buildRow({ CTPV_NM: '대구광역시', SGG_NM: '북구', MNG_ZONE_TRGT_RGN_NM: '산격1동~4동' }),
      buildRow({ CTPV_NM: '서울특별시', SGG_NM: '북구', MNG_ZONE_TRGT_RGN_NM: '번동' }),
    ])

    const result = await getZoneOptions('대구광역시', '북구')

    expect(result.covered).toBe(true)
    expect(result.districtWide).toBe(false)
    expect(result.dongOptions).toEqual([
      { name: '산격1동', nameEn: 'EN:산격1동' },
      { name: '산격2동', nameEn: 'EN:산격2동' },
      { name: '산격3동', nameEn: 'EN:산격3동' },
      { name: '산격4동', nameEn: 'EN:산격4동' },
    ])
  })

  it('구역이 단 하나뿐이면(대상지역이 구 이름 그대로인 경우 포함) districtWide로 표시하고 그 값을 유일한 dongOptions로 담는다', async () => {
    mocks.regionDistrictFindUnique.mockResolvedValue({ ctpvNm: '부산광역시', sggNm: '해운대구' })
    mocks.fetchRowsBySgg.mockResolvedValue([
      buildRow({ CTPV_NM: '부산광역시', SGG_NM: '해운대구', MNG_ZONE_TRGT_RGN_NM: '해운대구' }),
    ])

    const result = await getZoneOptions('부산광역시', '해운대구')

    expect(result).toEqual({
      covered: true,
      dongOptions: [{ name: '해운대구', nameEn: 'EN:해운대구' }],
      districtWide: true,
      alternativeDistricts: [],
    })
  })

  it('대상지역 필드가 과도하게 긴 안내문(정상적인 지역명이 아님)만 있으면 방어적으로 커버리지 없음 처리한다', async () => {
    mocks.regionDistrictFindUnique.mockResolvedValue({ ctpvNm: '대구광역시', sggNm: '북구' })
    mocks.regionDistrictFindMany.mockResolvedValue([{ sggNm: '북구', sggNmEn: 'Buk-gu' }])
    const guidanceTextLeakedIntoZoneField = '북구 전역(배출방법) 1. 스티커 구입하여 배출 '.repeat(3)
    mocks.fetchRowsBySgg.mockResolvedValue([
      buildRow({ CTPV_NM: '대구광역시', SGG_NM: '북구', MNG_ZONE_TRGT_RGN_NM: guidanceTextLeakedIntoZoneField }),
    ])

    const result = await getZoneOptions('대구광역시', '북구')

    expect(result.covered).toBe(false)
    expect(result.alternativeDistricts).toEqual([{ name: '북구', nameEn: 'Buk-gu' }])
  })
})

describe('resolveZoneNamesEn (getZoneOptions 내부 캐시 동작)', () => {
  it('RegionZoneName에 이미 캐시된 이름은 translateNames를 다시 호출하지 않는다', async () => {
    mocks.regionDistrictFindUnique.mockResolvedValue({ ctpvNm: '대구광역시', sggNm: '북구' })
    mocks.fetchRowsBySgg.mockResolvedValue([
      buildRow({ CTPV_NM: '대구광역시', SGG_NM: '북구', MNG_ZONE_TRGT_RGN_NM: '번동' }),
    ])
    mocks.regionZoneNameFindMany.mockResolvedValue([{ name: '번동', nameEn: 'Beon-dong' }])

    const result = await getZoneOptions('대구광역시', '북구')

    expect(result.dongOptions).toEqual([{ name: '번동', nameEn: 'Beon-dong' }])
    expect(mocks.translateNames).not.toHaveBeenCalled()
  })
})

describe('getRegionRule', () => {
  it('캐시가 있으면 외부 API를 호출하지 않고 캐시된 규정을 그대로 반환한다', async () => {
    const cached = { id: 'cached-1', ctpvNm: '서울특별시', sggNm: '관악구', dongNm: '신림동' }
    mocks.regionRuleFindUnique.mockResolvedValue(cached)

    const result = await getRegionRule('서울특별시', '관악구', '신림동')

    expect(result).toBe(cached)
    expect(mocks.fetchRowsBySgg).not.toHaveBeenCalled()
    expect(mocks.regionRuleUpsert).not.toHaveBeenCalled()
  })

  it('캐시가 없으면 카테고리별로 매칭해 저장하고 결과를 반환한다', async () => {
    mocks.regionRuleFindUnique.mockResolvedValue(null)
    mocks.fetchRowsBySgg.mockResolvedValue([
      buildRow({
        CTPV_NM: '대구광역시',
        SGG_NM: '북구',
        MNG_ZONE_TRGT_RGN_NM: '산격1동~4동',
        LF_WST_EMSN_DOW: '월+수+금',
        LF_WST_EMSN_BGNG_TM: '19:00',
        LF_WST_EMSN_END_TM: '23:00',
        LF_WST_EMSN_MTHD: '종량제 봉투에 담아 배출',
        UNCLLT_DAY: '일요일',
      }),
    ])
    const upserted = { id: 'new-1' }
    mocks.regionRuleUpsert.mockResolvedValue(upserted)

    const result = await getRegionRule('대구광역시', '북구', '산격2동')

    expect(result).toBe(upserted)
    expect(mocks.regionRuleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ctpvNm_sggNm_dongNm: { ctpvNm: '대구광역시', sggNm: '북구', dongNm: '산격2동' } },
        create: expect.objectContaining({
          ctpvNm: '대구광역시',
          sggNm: '북구',
          dongNm: '산격2동',
          unclltDay: '일요일',
          categories: expect.objectContaining({
            생활쓰레기: { dow: '월+수+금', method: '종량제 봉투에 담아 배출', beginTime: '19:00', endTime: '23:00' },
            음식물쓰레기: null,
            재활용품: null,
            대형폐기물: null,
          }),
        }),
      }),
    )
  })

  it('일치하는 동이 없으면 404 AppError를 던진다', async () => {
    mocks.regionRuleFindUnique.mockResolvedValue(null)
    mocks.fetchRowsBySgg.mockResolvedValue([
      buildRow({ CTPV_NM: '대구광역시', SGG_NM: '북구', MNG_ZONE_TRGT_RGN_NM: '산격1동~4동' }),
    ])

    await expect(getRegionRule('대구광역시', '북구', '태전동')).rejects.toThrow(
      '해당 지역의 배출 정보를 찾을 수 없습니다',
    )
    expect(mocks.regionRuleUpsert).not.toHaveBeenCalled()
  })
})
