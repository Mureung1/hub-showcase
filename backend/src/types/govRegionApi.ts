// 행정안전부_생활쓰레기배출정보 조회서비스(household_waste_info/info) 관련 타입.
// 한 행(row)은 "시/도+구/군의 한 관리구역"을 나타내며, 카테고리(생활쓰레기/음식물쓰레기/재활용품/대형폐기물)별로
// 대상 동 범위(MNG_ZONE_TRGT_RGN_NM)가 서로 다를 수 있다 — 하나의 구/군에 카테고리별로 여러 행이 존재할 수 있음.

export interface GovRegionRow {
  CTPV_NM: string // 시/도명
  SGG_NM: string // 시군구명
  MNG_ZONE_NM: string // 관리구역명
  MNG_ZONE_TRGT_RGN_NM: string // 관리구역 대상 지역(동) — "+"로 구분, "~" 범위 표기 포함 가능
  LF_WST_EMSN_DOW: string
  LF_WST_EMSN_BGNG_TM: string
  LF_WST_EMSN_END_TM: string
  LF_WST_EMSN_MTHD: string
  FOD_WST_EMSN_DOW: string
  FOD_WST_EMSN_BGNG_TM: string
  FOD_WST_EMSN_END_TM: string
  FOD_WST_EMSN_MTHD: string
  RCYCL_EMSN_DOW: string
  RCYCL_EMSN_BGNG_TM: string
  RCYCL_EMSN_END_TM: string
  RCYCL_EMSN_MTHD: string
  TMPRY_BULK_WASTE_EMSN_MTHD: string
  TMPRY_BULK_WASTE_EMSN_PLC: string
  TMPRY_BULK_WASTE_EMSN_BGNG_TM: string
  TMPRY_BULK_WASTE_EMSN_END_TM: string
  UNCLLT_DAY: string // 미수거일
}

export interface GovRegionApiClient {
  // sggNm만으로 검색 — 시/도 필터가 API에 없어 동명 구/군이 여러 시/도에 걸쳐 섞여 반환될 수 있으므로
  // 호출자가 반드시 응답의 CTPV_NM으로 다시 걸러야 한다.
  fetchRowsBySgg(sggNm: string): Promise<GovRegionRow[]>
}
