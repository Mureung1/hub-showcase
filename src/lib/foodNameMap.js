// AI가 낸 식별명(변형·브랜드 포함)을 식약처 식품영양성분DB에 실제로 등록돼 있을 법한 표준 대표명으로
// 정규화한다. 식약처 DB는 "정확히 일치"해야만 검색되고 부분일치가 안 되므로("돌솥비빔밥"으로는 0건,
// "비빔밥"이어야 매칭), AI의 fallbackSearchName이 충분히 일반적이지 않을 때를 대비한 2차 안전망이다.
// findFoodMatch가 dbSearchName 검색 실패 시 이 정규화명으로 한 번 더 시도해 DB 매칭률을 끌어올린다.
//
// 규칙: 이름에 keywords 중 하나라도 "포함"되면 그 canonical(표준명)으로 바꾼다. 넓게 매칭될 수 있는
// 항목(예: '치킨')일수록 아래쪽에 두고, 더 구체적인 항목을 위에 둔다(먼저 걸리는 것을 쓴다).
const CANONICAL_MAP = [
  // 밥류 (구체적인 볶음밥/비빔밥 변형은 상위 표준명으로)
  { canonical: '김치볶음밥', keywords: ['김치볶음밥'] },
  { canonical: '볶음밥', keywords: ['볶음밥'] },
  { canonical: '비빔밥', keywords: ['비빔밥'] }, // 돌솥비빔밥/전주비빔밥 → 비빔밥
  { canonical: '국밥', keywords: ['국밥'] }, // 돼지국밥/순대국밥 → 국밥
  { canonical: '카레라이스', keywords: ['카레'] },
  // 면류
  { canonical: '짜장면', keywords: ['짜장면', '자장면'] },
  { canonical: '짬뽕', keywords: ['짬뽕'] },
  { canonical: '라면', keywords: ['라면'] }, // 신라면/진라면/안성탕면류 → 라면
  { canonical: '냉면', keywords: ['냉면'] }, // 물냉면/비빔냉면 → 냉면
  { canonical: '칼국수', keywords: ['칼국수'] },
  { canonical: '잔치국수', keywords: ['잔치국수'] },
  { canonical: '우동', keywords: ['우동'] },
  // 국/탕/찌개
  { canonical: '김치찌개', keywords: ['김치찌개'] }, // 참치김치찌개 → 김치찌개
  { canonical: '된장찌개', keywords: ['된장찌개'] },
  { canonical: '순두부찌개', keywords: ['순두부'] },
  { canonical: '부대찌개', keywords: ['부대찌개'] },
  { canonical: '감자탕', keywords: ['감자탕'] },
  { canonical: '갈비탕', keywords: ['갈비탕'] },
  { canonical: '설렁탕', keywords: ['설렁탕'] },
  { canonical: '미역국', keywords: ['미역국'] },
  // 고기/반찬/분식
  { canonical: '삼겹살', keywords: ['삼겹살'] },
  { canonical: '제육볶음', keywords: ['제육'] },
  { canonical: '불고기', keywords: ['불고기'] },
  { canonical: '돈까스', keywords: ['돈까스', '돈가스'] },
  { canonical: '탕수육', keywords: ['탕수육'] },
  { canonical: '떡볶이', keywords: ['떡볶이', '떡볶기'] },
  { canonical: '김밥', keywords: ['김밥'] }, // 참치김밥/누드김밥 → 김밥
  { canonical: '순대', keywords: ['순대'] },
  { canonical: '만두', keywords: ['만두'] },
  { canonical: '파전', keywords: ['파전'] },
  { canonical: '김치전', keywords: ['김치전'] },
  // 넓은 키워드는 마지막에 (더 구체적인 항목이 위에서 먼저 걸리도록)
  { canonical: '치킨', keywords: ['치킨', '통닭', '후라이드', '프라이드'] }, // 양념치킨/간장치킨 → 치킨
]

// name에 매칭되는 표준명이 있고 그게 원래 이름과 다르면 그 표준명을, 없거나 이미 표준명과 같으면 null을
// 반환한다(null이면 호출부가 이 시도를 건너뛴다 — 중복 검색 방지).
export function normalizeFoodSearchName(name) {
  if (typeof name !== 'string' || !name.trim()) return null
  const entry = CANONICAL_MAP.find(({ keywords }) => keywords.some((k) => name.includes(k)))
  if (!entry || entry.canonical === name.trim()) return null
  return entry.canonical
}
