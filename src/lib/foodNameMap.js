// AI가 낸 식별명(변형·브랜드 포함)을 식약처 식품영양성분DB에 실제로 등록돼 있을 법한 표준 대표명으로
// 정규화한다. 식약처 DB는 "정확히 일치"해야만 검색되고 부분일치가 안 되므로("돌솥비빔밥"으로는 0건,
// "비빔밥"이어야 매칭), AI의 fallbackSearchName이 충분히 일반적이지 않을 때를 대비한 2차 안전망이다.
// findFoodMatch가 dbSearchName 검색 실패 시 이 정규화명으로 한 번 더 시도해 DB 매칭률을 끌어올린다.
//
// 매핑 데이터는 foodData.js 통합 테이블(canonical 필드)이 단일 소스다 — 예전의 CANONICAL_MAP은
// 1인분 무게·현실 범위 테이블과 함께 그 파일로 통합됐다. 이 파일은 기존 import 경로를 유지하기 위한
// 얇은 위임만 남긴다.
import { getCanonicalName } from './foodData.js'

// name에 매칭되는 표준명이 있고 그게 원래 이름과 다르면 그 표준명을, 없거나 이미 표준명과 같으면 null을
// 반환한다(null이면 호출부가 이 시도를 건너뛴다 — 중복 검색 방지).
export function normalizeFoodSearchName(name) {
  return getCanonicalName(name)
}
