// 한 판(트레이) 통합 분석(5주차 §3)의 중량 배분 — 메뉴명만 보고 역할(role)을 추정해 표준 중량을
// 매긴다. Gemini에게 "이 메뉴는 몇 g으로 추정해"라고 맡기는 대신 규칙 기반으로 고정해, 같은 메뉴가
// 매번 다른 중량으로 추정되는 흔들림을 없앤다(재현 가능성).
//
// role 8종과 표준 중량 — 숫자는 여기 한 곳에서만 관리한다(코드 수정 없이 조정 가능하게).
export const PORTION_WEIGHTS = {
  rice: 210,
  noodle: 450,
  soup: 300,
  main: 120,
  side: 50,
  kimchi: 40,
  dessert: 80,
  drink: 200,
}

const DEFAULT_ROLE = 'side'

// rice+noodle 동시 케이스에서 noodle에 적용하는 감량 중량(PRD 규칙) — 밥과 면을 둘 다 정량으로
// 담으면 실제 섭취량을 크게 넘어선다(보통 한쪽은 맛보기 수준으로만 담는다).
const NOODLE_WEIGHT_WHEN_WITH_RICE = 150

// (패턴, role) 목록 — classifyMenuRole이 긴 패턴을 우선 매칭한다. 배열 안 순서는 "같은 길이의
// 패턴끼리 충돌할 때"의 우선순위로도 쓰인다(안정 정렬 기준 — 나중에 오는 kimchi의 짧은 '김치'가
// "참치김치찌개"의 '찌개'(soup, 같은 2글자)에 밀리는 식). "김치볶음밥"처럼 김치를 포함하지만
// 실제로는 다른 역할인 메뉴는 별도 예외 없이 길이 우선 매칭만으로 올바르게 rice가 된다
// ('볶음밥' 3글자 > '김치' 2글자).
const ROLE_PATTERNS = [
  // rice
  ...['국밥', '덮밥', '볶음밥', '비빔밥', '카레라이스', '오므라이스', '김밥', '주먹밥', '리조또', '초밥', '쌈밥', '솥밥', '진지', '흰쌀밥', '잡곡밥', '보리밥', '현미밥', '밥'].map(
    (pattern) => ({ pattern, role: 'rice' }),
  ),
  // noodle
  ...['짜장면', '짬뽕', '칼국수', '막국수', '잔치국수', '비빔국수', '콩국수', '스파게티', '파스타', '우동', '라면', '냉면', '쫄면', '수제비', '국수'].map(
    (pattern) => ({ pattern, role: 'noodle' }),
  ),
  // soup
  ...[
    '김치찌개',
    '된장찌개',
    '순두부찌개',
    '부대찌개',
    '갈비탕',
    '육개장',
    '설렁탕',
    '곰탕',
    '삼계탕',
    '미역국',
    '된장국',
    '북엇국',
    '콩나물국',
    '어묵탕',
    '찌개',
    '전골',
    '탕',
    '스프',
    '수프',
    '국',
  ].map((pattern) => ({ pattern, role: 'soup' })),
  // main — 단백질 중심 주요리
  ...[
    '제육볶음',
    '돈까스',
    '치킨까스',
    '함박스테이크',
    '탕수육',
    '깐풍기',
    '닭갈비',
    '떡갈비',
    '불고기',
    '삼겹살',
    '보쌈',
    '수육',
    '고등어구이',
    '갈치구이',
    '오징어볶음',
    '닭볶음탕',
    '스테이크',
    '까스',
    '치킨',
    '돈육',
  ].map((pattern) => ({ pattern, role: 'main' })),
  // side — 밑반찬류
  ...[
    '계란말이',
    '어묵볶음',
    '멸치볶음',
    '진미채',
    '시금치나물',
    '콩나물무침',
    '무생채',
    '오이무침',
    '감자조림',
    '두부조림',
    '연근조림',
    '계란찜',
    '잡채',
    '샐러드',
    '나물',
    '무침',
    '조림',
    '볶음',
    '전',
  ].map((pattern) => ({ pattern, role: 'side' })),
  // dessert
  ...['아이스크림', '초코파이', '요구르트', '요거트', '푸딩', '젤리', '케이크', '약과', '과일', '빵'].map((pattern) => ({
    pattern,
    role: 'dessert',
  })),
  // drink
  ...['이온음료', '보리차', '식혜', '수정과', '주스', '우유', '음료', '콜라', '사이다', '커피', '차'].map((pattern) => ({
    pattern,
    role: 'drink',
  })),
  // kimchi — 배추김치·깍두기 등 구체적 이름은 길이가 길어 다른 역할과 안 겹치고, 짧은 '김치'는
  // 배열 맨 뒤에 둬 다른 역할의 동길이 패턴(예: '찌개')에 우선순위를 내준다.
  ...['배추김치', '총각김치', '열무김치', '오이소박이', '깍두기', '김치'].map((pattern) => ({ pattern, role: 'kimchi' })),
].sort((a, b) => b.pattern.length - a.pattern.length)

export function classifyMenuRole(menuName) {
  const name = (menuName || '').trim()
  const matched = ROLE_PATTERNS.find(({ pattern }) => name.includes(pattern))
  const role = matched ? matched.role : DEFAULT_ROLE
  return { role, weight: PORTION_WEIGHTS[role] }
}

// menuNames: string[] — 한 트레이(끼니)의 메뉴명 목록. 각 메뉴에 역할·중량을 배분한다.
export function assignTrayWeights(menuNames) {
  const items = (menuNames || []).filter(Boolean).map((name) => {
    const { role, weight } = classifyMenuRole(name)
    return { name, role, weight }
  })

  const hasRice = items.some((item) => item.role === 'rice')
  const hasNoodle = items.some((item) => item.role === 'noodle')
  if (hasRice && hasNoodle) {
    for (const item of items) {
      if (item.role === 'noodle') item.weight = NOODLE_WEIGHT_WHEN_WITH_RICE
    }
  }

  return items
}
