// 전국폐형광등폐건전지수거함표준데이터(tn_pubr_public_waste_lamp_battery_collection_box_api) 원본 응답 타입.
// cltItemNm은 실측 결과 "폐건전지"/"형광등+건전지"/"형광램프+LED조명+알카라인전지+..." 등 자유 텍스트라
// 건전지/형광등 단일 값으로 나뉘어 있지 않음 — 부분 문자열 매칭으로 어느 카테고리에 속하는지 판단해야 한다.
export interface GovLampBatteryRow {
  instlPlcNm: string
  dtlPstnCn: string
  ctpvNm: string
  sggNm: string
  lctnRoadNmAddr: string
  lctnLotnoAddr: string
  lat: string
  lot: string // 경도 — 정부 API 필드명이 lot(longitude 약자)이라 lng와 혼동 주의
  cltItemNm: string
  mngInstNm: string
  dataCrtrYmd: string
}

// 전국폐의약품수거함표준데이터(tn_pubr_public_lung_medicine_api) 원본 응답 타입.
// sggNm은 세종특별자치시처럼 구/군이 없는 지역에서 "없음"으로 내려온다(실측 확인).
export interface GovMedicineRow {
  instlPlcNm: string
  ctpvNm: string
  sggNm: string
  lctnRoadNm: string
  lctnLotnoAddr: string
  lat: string
  lot: string
  actlPstn: string
  mngInstNm: string
  crtrYmd: string
}

// 전국의류수거함표준데이터(tn_pubr_public_clothing_collect_bins_api) 원본 응답 타입.
export interface GovClothingRow {
  mngNo: string
  instlPlcNm: string
  ctpvNm: string
  sggNm: string
  lctnRoadNmAddr: string
  lctnLotnoAddr: string
  lat: string
  lot: string
  dtlPstn: string
  mngInstNm: string
  dataCrtrYmd: string
}

// 전국재활용센터표준데이터(tn_pubr_public_ruse_cnter_api) 원본 응답 타입.
// 다른 3개 데이터셋과 달리 CTPV_NM/SGG_NM 필드가 없고 주소 문자열(rdnmadr/lnmadr)만 제공 — 시/도·시군구는
// 주소를 파싱해서 뽑아야 한다(scripts/syncCollectionPoints.ts의 parseAddressRegion 참고).
// trtmntPrdlst(주요취급품목정보)는 "가구+냉장고+TV 등"/"종이+고철+철캔+페트 등"처럼 일반 재활용센터가
// 취급하는 품목을 자유 텍스트로 나열한 것이라 소형가전/종이팩 전용 수거함과는 다른 시설이다 — 그래서
// 기존 카테고리에 억지로 끼워 맞추지 않고 "재활용센터"라는 별도 카테고리로 둔다.
export interface GovRecyclingCenterRow {
  cnterNm: string
  rdnmadr: string
  lnmadr: string
  latitude: string
  longitude: string
  trtmntPrdlst: string
  weekdayOperOpenHhmm: string
  weekdayOperColseHhmm: string
  holidayOperOpenHhmm: string
  holidayCloseOpenHhmm: string
  rstdeInfo: string
  referenceDate: string
}
