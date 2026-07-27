// 지원 대학 학식 목록의 단일 소스. 초기엔 충남대 1개뿐이지만(PRD 4주차 1.2절 — 어댑터 구조는 확장을
// 염두에 두되 이번 구현은 충남대만), 다음 대학이 추가돼도 이 배열만 늘리면 된다.
// server/proxy.js(Node)에서도 그대로 import해 /api/univ-meal의 univ 파라미터 검증에 쓴다.
export const SUPPORTED_UNIVERSITIES = [{ code: 'cnu', name: '충남대학교' }]

export function isSupportedUniversity(code) {
  return SUPPORTED_UNIVERSITIES.some((u) => u.code === code)
}
