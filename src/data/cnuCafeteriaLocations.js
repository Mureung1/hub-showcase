// 충남대 학식 건물(식당) 5곳의 좌표 — 5주차 §2(식비 위치 지도). 건물 위치는 변하지 않으므로
// API로 매번 검색하지 않고 정적 데이터로 하드코딩한다. key는 src/lib/cnuBuildings.js의
// CNU_BUILDINGS와 정확히 일치해야 한다(그쪽이 표시 순서·라벨의 단일 소스).
//
// 좌표 출처(카카오/네이버 장소 검색으로 실측, 2026-07-28):
// - cnu1(제1학생회관): 카카오 "충남대학교 제1학생회관" 공식 POI
// - cnu2(제2학생회관): 건물 자체가 지도 서비스에 POI로 없어, 건물 내 "충남대학교2학생회관커피점"
//   (네이버 지역 검색) 위치로 대신한다 — 건물 근처의 근사치.
// - cnu3(제3학생회관): 카카오 "충남대학교 대덕캠퍼스 제3학생회관" 공식 POI
// - cnu4(제4학생회관): 건물 자체가 POI로 없어, 같은 건물인 "충남대학교 상록회관"(카카오 공식 POI)
//   위치로 대신한다.
// - cnuLife(생활과학대학): 카카오 "충남대학교 생활과학대학" 공식 POI
export const CNU_CAFETERIA_LOCATIONS = {
  cnu1: { lat: 36.3678606202113, lng: 127.343034153189 },
  cnu2: { lat: 36.3658677, lng: 127.3457237 },
  cnu3: { lat: 36.3714781578502, lng: 127.344832974656 },
  cnu4: { lat: 36.3687222793921, lng: 127.350439103662 },
  cnuLife: { lat: 36.3765909376629, lng: 127.343119290543 },
}

// 5개 좌표의 중심(단순 평균) — 지도 초기 진입 시 중심점으로 쓴다.
export function getCnuCampusCenter() {
  const points = Object.values(CNU_CAFETERIA_LOCATIONS)
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length
  return { lat, lng }
}
