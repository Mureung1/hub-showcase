// ── 음식 데이터 단일 소스 ─────────────────────────────────────────────────────
// 예전에 세 곳(nutrition.js의 PORTION_REFERENCE_G/NUTRIENT_PLAUSIBILITY, foodNameMap.js의
// CANONICAL_MAP)에 흩어져 있던 음식별 기준 데이터를 한 테이블로 통합했다. 음식 하나를 추가/수정할 때
// 이 파일 한 곳만 손대면 된다.
//
// ── 음식 추가 방법 ──
// 1) FOOD_DATA에 항목 하나를 추가한다. 필드는 전부 선택적이다:
//    {
//      canonical: '비빔밥',            // 식약처 DB 검색용 표준명(변형명 → 이 이름으로 정규화).
//                                      //   없으면 이름 정규화 대상이 아니다.
//      keywords: ['비빔밥'],           // 음식 이름에 "포함"되면 이 항목으로 매칭(부분일치).
//      portion: { min: 350, max: 700 },// 표준 1인분 무게 범위(g). AI의 섭취량 추정 보정에 쓴다.
//      referenceGrams: 500,            // plausible 범위가 기준으로 삼는 표준 1인분 무게(g).
//      plausible: {                    // 표준 1인분 기준 현실 영양 범위. DB/AI 수치가 이 범위의
//        protein: [12, 16], ...        //   하한 50% 미만/상한 150% 초과일 때만 경계값으로 보정.
//      },                              //   plausible이 있으면 referenceGrams도 반드시 있어야 한다.
//    }
// 2) 순서 규칙: **먼저 걸리는 항목을 쓴다.** 한 키워드가 다른 키워드의 부분 문자열이면
//    (예: '국수'⊂'칼국수', '탕'⊂'탕수육') 더 구체적인(긴) 쪽을 반드시 위에 둔다.
// 3) 필드가 없는 항목은 그 필드에 대해선 "없는 것"으로 취급되어 아래쪽의 더 일반적인 항목으로
//    폴스루한다(예: '칼국수' 항목엔 canonical만 있고, 1인분 무게는 아래 '국수' 항목 값을 쓴다).
//    → 변형 음식은 canonical만 가진 얇은 항목으로 두고, 수치는 상위 카테고리 항목에 모은다.
// 4) 값을 바꾸거나 추가했으면 foodData.test.js를 함께 갱신한다.
//
// 값의 출처: 기존 세 테이블의 수치를 그대로 옮겼다(값 변경 없음). "[추정 기준]" 주석이 달린
// plausible 범위만 이번 통합에서 새로 채운 보수적 추정치다(기존엔 해당 음식에 범위가 없었다).

export const FOOD_DATA = [
  // ── 밥류 (구체적인 변형을 일반 항목보다 위에) ──
  { canonical: '김치볶음밥', keywords: ['김치볶음밥'] }, // 수치는 아래 '볶음밥'으로 폴스루
  {
    canonical: '볶음밥',
    keywords: ['볶음밥'],
    portion: { min: 280, max: 560 },
    referenceGrams: 400,
    plausible: { protein: [10, 22], carbs: [68, 105], fat: [10, 28], calories: [500, 800], sodium: [800, 1800] },
  },
  {
    canonical: '비빔밥', // 돌솥비빔밥/전주비빔밥 → 비빔밥 (부분일치)
    keywords: ['비빔밥'],
    portion: { min: 350, max: 700 },
    referenceGrams: 500,
    plausible: { protein: [12, 16], fat: [8, 14], carbs: [90, 110], calories: [550, 700] },
  },
  {
    canonical: '국밥', // 돼지국밥/순대국밥 → 국밥
    keywords: ['국밥'],
    portion: { min: 400, max: 850 },
    referenceGrams: 500,
    plausible: { protein: [16, 34], carbs: [55, 90], calories: [360, 620], sodium: [1500, 2900] },
  },
  { keywords: ['덮밥'], portion: { min: 350, max: 700 } },
  {
    canonical: '카레라이스',
    keywords: ['카레'],
    portion: { min: 350, max: 700 },
    referenceGrams: 450,
    plausible: { protein: [10, 22], carbs: [78, 120], calories: [500, 800] },
  },
  { keywords: ['공기밥', '쌀밥', '흰밥'], portion: { min: 150, max: 300 } },

  // ── 면류 (짜장면·라면은 목표 출력 범위를 좁게 유지 — DB 레코드가 표준 1인분으로 환산 시
  //    과대해지는 값을 1.5배 허용치로 잡아 눌러야 하므로, 폭을 넓히면 그 보정이 풀린다.
  //    검증된 값이라 손대지 않는다.) ──
  {
    canonical: '짜장면',
    keywords: ['짜장면', '자장면'],
    portion: { min: 450, max: 900 },
    referenceGrams: 650,
    plausible: { protein: [12, 16], carbs: [110, 130], fat: [12, 18], calories: [650, 800], sodium: [1200, 1800] },
  },
  {
    canonical: '짬뽕',
    keywords: ['짬뽕'],
    portion: { min: 500, max: 950 },
    referenceGrams: 700,
    plausible: { protein: [18, 30], carbs: [80, 115], calories: [500, 780], sodium: [1800, 3200] },
  },
  {
    canonical: '라면', // 신라면/진라면/안성탕면류 → 라면
    keywords: ['라면'],
    portion: { min: 350, max: 700 },
    referenceGrams: 500,
    plausible: { protein: [10, 14], carbs: [65, 90], fat: [12, 20], calories: [450, 600], sodium: [1500, 1900] },
  },
  {
    canonical: '냉면', // 물냉면/비빔냉면 → 냉면
    keywords: ['냉면'],
    portion: { min: 400, max: 850 },
    referenceGrams: 600,
    plausible: { protein: [12, 24], carbs: [85, 125], calories: [480, 700], sodium: [1300, 2600] },
  },
  { canonical: '칼국수', keywords: ['칼국수'] }, // 수치는 아래 '국수'로 폴스루
  { canonical: '잔치국수', keywords: ['잔치국수'] }, // 수치는 아래 '국수'로 폴스루
  {
    canonical: '우동',
    keywords: ['우동'],
    portion: { min: 400, max: 850 },
    referenceGrams: 600,
    plausible: { protein: [10, 18], carbs: [70, 100], calories: [380, 620], sodium: [1500, 2800] },
  },
  {
    // 칼국수/잔치국수/쌀국수 포함(부분일치) — 구체 항목(칼국수 등)은 위에서 canonical만 갖고 내려온다
    keywords: ['국수'],
    portion: { min: 380, max: 850 },
    referenceGrams: 550,
    plausible: { protein: [10, 24], carbs: [60, 100], calories: [380, 660], sodium: [1000, 2400] },
  },
  { keywords: ['파스타', '스파게티'], portion: { min: 300, max: 600 } },

  // ── 국/탕/찌개 (넓은 '탕'/'국' 키워드보다 구체적인 탕수육/감자탕 등을 반드시 위에) ──
  { canonical: '김치찌개', keywords: ['김치찌개'] }, // 참치김치찌개 → 김치찌개, 수치는 '찌개'로 폴스루
  { canonical: '된장찌개', keywords: ['된장찌개'] },
  { canonical: '순두부찌개', keywords: ['순두부'] },
  { canonical: '부대찌개', keywords: ['부대찌개'] },
  {
    // 김치/된장/순두부/부대찌개 포함(부분일치). 부대찌개처럼 열량 편차가 큰 변형을 함께 잡으므로
    // 열량은 넣지 않고 검증된 단백질·나트륨만 둔다.
    keywords: ['찌개'],
    portion: { min: 250, max: 600 },
    referenceGrams: 400,
    plausible: { protein: [12, 18], sodium: [1500, 2000] },
  },
  {
    canonical: '탕수육', // '탕' 일반 항목보다 반드시 위 ('탕'⊂'탕수육')
    keywords: ['탕수육'],
    portion: { min: 150, max: 500 },
    referenceGrams: 250,
    plausible: { protein: [14, 30], fat: [18, 42], carbs: [42, 82], calories: [420, 780] },
  },
  {
    canonical: '감자탕',
    keywords: ['감자탕'],
    portion: { min: 400, max: 950 },
    referenceGrams: 600,
    plausible: { protein: [24, 46], calories: [420, 760], sodium: [1500, 2900] },
  },
  {
    canonical: '갈비탕',
    keywords: ['갈비탕'],
    referenceGrams: 600, // 1인분 무게는 아래 '탕/국' 폴스루와 일관된 값
    // [추정 기준] 통합 전에는 범위가 없던 음식 — 보수적 추정치(식약처 표준값 실측 검증 전).
    plausible: { protein: [16, 36], calories: [240, 560], sodium: [1100, 2600] },
  },
  {
    canonical: '설렁탕',
    keywords: ['설렁탕'],
    referenceGrams: 600,
    // [추정 기준] 통합 전에는 범위가 없던 음식 — 보수적 추정치.
    plausible: { protein: [16, 34], calories: [220, 500], sodium: [900, 2200] },
  },
  {
    canonical: '미역국',
    keywords: ['미역국'],
    referenceGrams: 400,
    // [추정 기준] 통합 전에는 범위가 없던 음식 — 보수적 추정치.
    plausible: { protein: [5, 14], calories: [80, 220], sodium: [700, 1600] },
  },
  { keywords: ['탕', '국'], portion: { min: 300, max: 800 } }, // 미역국/설렁탕 등 국물 요리 일반

  // ── 고기/반찬/분식 ──
  {
    canonical: '삼겹살',
    keywords: ['삼겹살'],
    portion: { min: 100, max: 450 },
    referenceGrams: 150,
    plausible: { protein: [20, 34], fat: [28, 56], calories: [360, 620] },
  },
  {
    canonical: '제육볶음',
    keywords: ['제육'],
    portion: { min: 150, max: 500 },
    referenceGrams: 250,
    plausible: { protein: [20, 40], fat: [14, 34], calories: [340, 620], sodium: [900, 2000] },
  },
  {
    canonical: '불고기',
    keywords: ['불고기'],
    portion: { min: 150, max: 500 },
    referenceGrams: 200,
    plausible: { protein: [20, 40], fat: [8, 26], calories: [260, 520], sodium: [800, 1900] },
  },
  { keywords: ['찜닭'], portion: { min: 300, max: 800 } },
  {
    canonical: '돈까스',
    keywords: ['돈까스', '돈가스'],
    portion: { min: 150, max: 450 },
    referenceGrams: 200,
    plausible: { protein: [18, 36], fat: [18, 42], carbs: [35, 70], calories: [430, 780] },
  },
  {
    canonical: '떡볶이',
    keywords: ['떡볶이', '떡볶기'],
    portion: { min: 180, max: 500 },
    referenceGrams: 250,
    plausible: { protein: [5, 13], carbs: [58, 102], calories: [290, 540], sodium: [700, 1700] },
  },
  {
    canonical: '김밥', // 참치김밥/누드김밥 → 김밥
    keywords: ['김밥'],
    portion: { min: 150, max: 500 },
    referenceGrams: 230,
    plausible: { protein: [7, 15], carbs: [52, 82], calories: [320, 520], sodium: [550, 1400] },
  },
  {
    canonical: '순대',
    keywords: ['순대'],
    portion: { min: 120, max: 450 },
    referenceGrams: 200,
    plausible: { protein: [8, 18], carbs: [28, 56], calories: [240, 460], sodium: [550, 1400] },
  },
  {
    canonical: '만두',
    keywords: ['만두'],
    portion: { min: 100, max: 400 },
    referenceGrams: 200,
    plausible: { protein: [9, 21], carbs: [28, 56], fat: [7, 22], calories: [240, 500], sodium: [450, 1300] },
  },
  { canonical: '파전', keywords: ['파전'] }, // 수치는 아래 '부침개' 항목으로 폴스루
  { canonical: '김치전', keywords: ['김치전'] },
  { keywords: ['부침개', '파전', '김치전', '해물전', '빈대떡'], portion: { min: 120, max: 500 } },

  // ── 넓은 키워드는 마지막에 (더 구체적인 항목이 위에서 먼저 걸리도록) ──
  {
    canonical: '치킨', // 양념치킨/간장치킨 → 치킨
    keywords: ['치킨', '통닭', '후라이드', '프라이드'],
    portion: { min: 100, max: 900 },
    referenceGrams: 300,
    plausible: { protein: [40, 78], fat: [24, 58], calories: [540, 980] },
  },
]

// field를 가진 항목 중 foodName에 키워드가 포함되는 항목을 고른다.
//
// 선택 규칙 — "머리명사 우선": 한국어 복합 음식명은 마지막 명사가 그 음식의 정체다
// ("카레우동"은 우동, "치킨김밥"은 김밥, "만두국"은 국). 그래서 이름에서 **가장 오른쪽에서 끝나는**
// 키워드의 항목을 고르고, 끝 위치가 같으면 더 긴(구체적인) 키워드를 우선한다
// (예: "김치볶음밥"에서 '김치볶음밥' > '볶음밥', "탕수육"에서 '탕수육' > '탕').
// 그래도 같으면 테이블 순서(먼저 정의된 항목)를 따른다.
//
// 왜 단순 '첫 항목' 순회가 아닌가: 통합 전 세 테이블은 그룹 배치 순서가 서로 달라, 교차 그룹
// 복합명(카레우동 등)에서 셋이 서로 다른 답을 내는 모순이 이미 있었다 — 단일 순서로는 셋을 동시에
// 재현할 수 없어, 언어적으로 올바른 머리명사 규칙으로 통일했다(foodData.test.js가 케이스를 고정).
function findEntry(foodName, field) {
  if (typeof foodName !== 'string' || !foodName) return null

  let best = null
  let bestEnd = -1
  let bestLen = -1
  for (const entry of FOOD_DATA) {
    if (field && entry[field] === undefined) continue
    for (const keyword of entry.keywords) {
      const idx = foodName.lastIndexOf(keyword)
      if (idx === -1) continue
      const end = idx + keyword.length
      if (end > bestEnd || (end === bestEnd && keyword.length > bestLen)) {
        best = entry
        bestEnd = end
        bestLen = keyword.length
      }
    }
  }
  return best
}

// 표준 1인분 무게 범위(g). 없으면 null(호출부가 범용 범위로 폴백).
export function getPortionRange(foodName) {
  return findEntry(foodName, 'portion')?.portion ?? null
}

// 표준 1인분 기준 현실 영양 범위 + 그 기준 무게. 없으면 null(보정 생략).
export function getPlausibility(foodName) {
  const entry = findEntry(foodName, 'plausible')
  return entry ? { referenceGrams: entry.referenceGrams, ranges: entry.plausible } : null
}

// 변형·브랜드 이름 → 식약처 DB 표준 검색명. 매칭이 없거나 이미 표준명과 같으면 null을 반환한다
// (null이면 호출부가 이 시도를 건너뛴다 — 중복 검색 방지. 기존 foodNameMap.js와 동일한 계약).
export function getCanonicalName(foodName) {
  if (typeof foodName !== 'string' || !foodName.trim()) return null
  const entry = findEntry(foodName, 'canonical')
  if (!entry || entry.canonical === foodName.trim()) return null
  return entry.canonical
}
