import type { GovRegionApiClient, GovRegionRow } from '../types/govRegionApi'

// 공공데이터 API 키가 준비되지 않았거나 로컬 개발/테스트 중 실제 호출을 피하고 싶을 때 대체할 mock 클라이언트
const MOCK_ROWS: GovRegionRow[] = [
  {
    CTPV_NM: '부산광역시',
    SGG_NM: '해운대구',
    MNG_ZONE_NM: '생활폐기물수거(mock, 1권역)',
    MNG_ZONE_TRGT_RGN_NM: '우동+중동',
    LF_WST_EMSN_DOW: '월+수+금',
    LF_WST_EMSN_BGNG_TM: '19:00',
    LF_WST_EMSN_END_TM: '23:00',
    LF_WST_EMSN_MTHD: '종량제 봉투에 담아 배출',
    FOD_WST_EMSN_DOW: '해당없음',
    FOD_WST_EMSN_BGNG_TM: '',
    FOD_WST_EMSN_END_TM: '',
    FOD_WST_EMSN_MTHD: '해당없음',
    RCYCL_EMSN_DOW: '해당없음',
    RCYCL_EMSN_BGNG_TM: '',
    RCYCL_EMSN_END_TM: '',
    RCYCL_EMSN_MTHD: '해당없음',
    TMPRY_BULK_WASTE_EMSN_MTHD: '해당없음',
    TMPRY_BULK_WASTE_EMSN_PLC: '해당없음',
    TMPRY_BULK_WASTE_EMSN_BGNG_TM: '',
    TMPRY_BULK_WASTE_EMSN_END_TM: '',
    UNCLLT_DAY: '없음',
  },
  {
    CTPV_NM: '부산광역시',
    SGG_NM: '해운대구',
    MNG_ZONE_NM: '음식물 수거(mock, 1권역)',
    MNG_ZONE_TRGT_RGN_NM: '우동+중동+좌동',
    LF_WST_EMSN_DOW: '해당없음',
    LF_WST_EMSN_BGNG_TM: '',
    LF_WST_EMSN_END_TM: '',
    LF_WST_EMSN_MTHD: '해당없음',
    FOD_WST_EMSN_DOW: '매일',
    FOD_WST_EMSN_BGNG_TM: '19:00',
    FOD_WST_EMSN_END_TM: '23:00',
    FOD_WST_EMSN_MTHD: '전용 용기에 담아 배출',
    RCYCL_EMSN_DOW: '해당없음',
    RCYCL_EMSN_BGNG_TM: '',
    RCYCL_EMSN_END_TM: '',
    RCYCL_EMSN_MTHD: '해당없음',
    TMPRY_BULK_WASTE_EMSN_MTHD: '해당없음',
    TMPRY_BULK_WASTE_EMSN_PLC: '해당없음',
    TMPRY_BULK_WASTE_EMSN_BGNG_TM: '',
    TMPRY_BULK_WASTE_EMSN_END_TM: '',
    UNCLLT_DAY: '없음',
  },
]

async function fetchRowsBySgg(sggNm: string): Promise<GovRegionRow[]> {
  return MOCK_ROWS.filter((row) => row.SGG_NM.includes(sggNm))
}

export const mockGovRegionApiClient: GovRegionApiClient = { fetchRowsBySgg }
