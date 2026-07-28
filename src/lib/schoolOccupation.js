// 학교 종류(NEIS SCHUL_KND_SC_NM) -> occupation 기본값(트랙 3 §4). Profile.jsx에서 학교를 먼저
// 고르면 지도 탭 직업 맞춤 추천(occupationKeywords.js)이 쓰는 occupation도 자연스럽게 맞춰준다 —
// 학교를 충남대로 골라놓고 직업은 기본값 '기타'로 남아 있으면 그 추천이 학교와 안 맞게 나간다.
//
// CafeteriaPanel.jsx의 mapSchoolKindToType과는 목적이 다르다(그쪽은 정밀 영양 산출 엔진의 급식량
// 보정 계수용 3단계 — 초/중/고를 구분해야 한다. 이건 occupationKeywords.js의 OCCUPATION_OPTIONS가
// 애초에 2단계(elementary/middle_high)만 가져 그 폭에 맞췄다) — 그래서 함수를 합치지 않았다.
export function occupationForSchoolKind(kind) {
  if (typeof kind !== 'string') return null
  if (kind.includes('초등')) return 'elementary'
  if (kind.includes('중학교') || kind.includes('고등') || kind.includes('고교')) return 'middle_high'
  return null
}

export const OCCUPATION_FOR_UNIVERSITY = 'university'
