import { prisma } from '../config/prisma'

// 행정안전부_생활쓰레기배출정보(household_waste_info) API는 전라남도+광주광역시를 "전남광주통합특별시"
// 하나로 묶어 내려보낸다(실측 확인) — RegionDistrict/RegionRule은 이 값을 실 API 응답과 그대로 맞춰야
// getRegionRule의 CTPV_NM 매칭이 깨지지 않으므로 의도적으로 그대로 둔 값이다(regionRuleService.ts 참고).
// 반면 오늘 채택한 수거함 표준데이터 3종은 전라남도/광주광역시를 표준 명칭으로 분리해서 내려보내
// 그대로 저장했다 — 그 결과 사용자가 지역 선택기에서 "전남광주통합특별시"를 고르면(전남/광주 사용자에게는
// 유일한 선택지) CollectionPoint 조회 시 실제로 존재하는 데이터인데도 0건이 나온다. RegionDistrict 쪽
// 라벨을 바꾸는 대신, 이 서비스에서만 그 특수 라벨을 표준 명칭으로 변환해 조회한다.
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구'])
const MERGED_JEONNAM_GWANGJU_CTPV_NM = '전남광주통합특별시'

function resolveCollectionPointCtpvNm(ctpvNm: string, sggNm: string): string {
  if (ctpvNm !== MERGED_JEONNAM_GWANGJU_CTPV_NM) return ctpvNm
  return GWANGJU_GU.has(sggNm) ? '광주광역시' : '전라남도'
}

export function getCollectionPoints(category: string, ctpvNm: string, sggNm: string) {
  return prisma.collectionPoint.findMany({
    where: { category, ctpvNm: resolveCollectionPointCtpvNm(ctpvNm, sggNm), sggNm },
    orderBy: { name: 'asc' },
  })
}
