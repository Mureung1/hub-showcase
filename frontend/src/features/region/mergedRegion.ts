import type { Lang } from '../../i18n/LanguageContext'

// 행정안전부_생활쓰레기배출정보 API가 전라남도+광주광역시를 "전남광주통합특별시" 하나로 묶어 내려보내
// RegionDistrict/RegionRule도 실 API 매칭을 위해 이 값을 그대로 저장한다(regionRuleService.ts 참고,
// getRegionRule의 CTPV_NM 비교가 라이브 응답과 정확히 일치해야 해서 표준 명칭으로 바꿀 수 없음).
// 저장/조회 값은 그대로 두고 화면에 보여줄 이름만 이 파일에서 바꾼다.
export const MERGED_JEONNAM_GWANGJU_CTPV_NM = '전남광주통합특별시'
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구'])

export function isMergedJeonnamGwangju(ctpvNm: string): boolean {
  return ctpvNm === MERGED_JEONNAM_GWANGJU_CTPV_NM
}

// 구/군을 아직 모르는 1단계 드롭다운에서는 전남/광주 중 하나로 특정할 수 없어 두 이름을 병기한다.
export function mergedProvinceOptionLabel(lang: Lang): string {
  return lang === 'en' ? 'Jeollanam-do · Gwangju' : '전라남도 · 광주광역시'
}

// 구/군까지 정해지면 광주 5개 구(동구/서구/남구/북구/광산구) 여부로 실제 시/도를 판별해 정확한 이름을 보여준다.
export function resolveMergedProvinceDisplayName(sggNm: string, lang: Lang): string {
  const isGwangju = GWANGJU_GU.has(sggNm)
  if (lang === 'en') return isGwangju ? 'Gwangju' : 'Jeollanam-do'
  return isGwangju ? '광주광역시' : '전라남도'
}
