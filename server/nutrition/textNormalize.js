// 식품명 매칭 전 정규화 — 공백/장식 기호 제거 + 흔한 오탈자 치환.
// scripts/buildFoodDB.js(DB 구축 시 name을 인덱싱)와 server/nutrition/foodLookup.js(조회 시 메뉴명을
// 비교)가 반드시 같은 규칙을 써야 매칭이 어긋나지 않으므로, 두 곳이 이 파일 하나를 공유한다.
//
// "찌개/찌게"류 순수 오탈자만 치환 대상이다 — "돈까스/돈가스"처럼 둘 다 맞는 표기인 동의어는 여기서
// 뭉개지 않고 src/lib/foodData.js의 keywords 별칭 메커니즘(foodLookup.js의 "별칭" 매칭 단계)에 맡긴다.
const TYPO_SUBSTITUTIONS = [
  [/찌게/g, '찌개'],
  [/떡볶기/g, '떡볶이'],
]

// NEIS/학식 원문 메뉴명에는 식약처 DB 표준명에 없는 표기 잡음이 섞여 들어온다(matchRate.js로 실측
// 확인) — 급식표 특유의 각주형 부가 표시(순살/따로배식/조각 등 괄호 설명, 할랄·저염 등 "H" 접두,
// 알레르기 안내용 장식 기호, 말미의 각주 숫자)가 전부 그 예다. 이걸 제거해야 "백김치*"가 "백김치"로,
// "H참외"가 "참외"로 매칭된다. 식약처 표준명 자체엔 이런 잡음이 없으므로 DB 쪽 정규화에는 영향이
// 없다(안전하게 양쪽에 적용 가능).
const DECORATIVE_SYMBOL_PATTERN = /[*♧♤○♡]/g
const PARENTHETICAL_NOTE_PATTERN = /\([^)]*\)/g
const HALAL_PREFIX_PATTERN = /^[Hh][-\s]?(?=[가-힣])/
const TRAILING_FOOTNOTE_DIGIT_PATTERN = /(?<=[가-힣])\d+$/

export function normalizeFoodName(name) {
  if (typeof name !== 'string') return ''
  let normalized = name
    .trim()
    .replace(PARENTHETICAL_NOTE_PATTERN, '')
    .replace(DECORATIVE_SYMBOL_PATTERN, '')
    .replace(HALAL_PREFIX_PATTERN, '')
    .replace(TRAILING_FOOTNOTE_DIGIT_PATTERN, '')
    .trim()
    .replace(/\s+/g, '')
  for (const [pattern, replacement] of TYPO_SUBSTITUTIONS) {
    normalized = normalized.replace(pattern, replacement)
  }
  return normalized
}
