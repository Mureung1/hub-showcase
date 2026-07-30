// 식품명 매칭 전 정규화 — 공백/장식 기호 제거 + 흔한 오탈자 치환.
// scripts/buildFoodDB.js(DB 구축 시 name을 인덱싱)와 server/nutrition/foodLookup.js(조회 시 메뉴명을
// 비교)가 반드시 같은 규칙을 써야 매칭이 어긋나지 않으므로, 두 곳이 이 파일 하나를 공유한다.
//
// "찌개/찌게"류 순수 오탈자 치환.
const TYPO_SUBSTITUTIONS = [
  [/찌게/g, '찌개'],
  [/떡볶기/g, '떡볶이'],
]

// ── 형태소 단위 동의어 ────────────────────────────────────────────────────────
// 둘 다 맞는 표기라 오탈자가 아니고, 그렇다고 유사도에 맡길 것도 아니다. `달걀`↔`계란`은 자모로도
// 전혀 안 닮아서(ㄷㅏㄹㄱㅑㄹ vs ㄱㅖㄹㅏㄴ) 어떤 임계값을 잡아도 못 잡는다 — **확정 동의어는 판정이
// 아니라 정규화로 처리해야 한다.**
//
// 왜 foodData.js의 keywords 별칭이 아니라 여기인가: 별칭은 음식 하나당 한 줄이라 달걀말이·달걀국·
// 달걀찜·달걀장조림…을 전부 등록해야 한다. 형태소 치환은 한 줄로 그 전부를 덮는다. 반대로 음식
// **한 종류**에만 해당하는 별칭(돈까스↔돈가스처럼 다른 말과 결합하지 않는 것)은 계속 foodData.js에
// 둔다 — 여기에 넣으면 엉뚱한 합성어까지 건드릴 위험이 있다.
//
// ⚠️ 치환은 **검색어와 DB 이름 양쪽에 똑같이** 걸린다(nameMatcher가 색인·조회 모두 이 함수를 통과).
// 한쪽에만 걸면 매칭이 오히려 어긋나므로, 새 항목을 넣을 땐 양방향으로 말이 되는지 확인할 것.
// 오른쪽(대표형)은 식약처 DB에 실제로 더 많이 등장하는 표기로 고른다.
const MORPHEME_SYNONYMS = [
  [/계란/g, '달걀'], // 식약처 표준명이 '달걀'
  [/닭도리탕/g, '닭볶음탕'],
  [/쭈꾸미/g, '주꾸미'],
  [/오무라이스/g, '오므라이스'],
  [/짜장/g, '자장'], // 짜장면_자장면 둘 다 표준어지만 DB는 '자장'
  [/미싯가루/g, '미숫가루'],
  [/부치개/g, '부침개'],
  [/저육/g, '제육'],
  [/생선까스/g, '생선가스'],
  [/돈까스/g, '돈가스'],
  [/까스/g, '가스'], // 치킨까스·생선까스 등 나머지 '까스' 결합형
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
  for (const [pattern, replacement] of [...TYPO_SUBSTITUTIONS, ...MORPHEME_SYNONYMS]) {
    normalized = normalized.replace(pattern, replacement)
  }
  return normalized
}
