// 밀라이즈 알레르기 코드(M1~M19)의 단일 소스 — 급식(NEIS)·학식·(향후) 결과 카드 어디서든
// 이 코드 하나로 통일해 알레르기 정보를 표시한다 (PRD 4주차 1.4절, FR-1.4a~c).
//
// 왜 필요한가: 초중고 급식은 NEIS가 알레르기 번호(1~19)를 직접 주지만, 대학 학식·일반 메뉴명에는
// 그런 정보가 아예 없다. 두 출처를 화면에서 같은 방식으로 다루려면 앱 전체가 하나의 번호 체계를 쓰고,
// NEIS 번호는 이 체계로 변환하고(공식 정보), 정보가 없는 메뉴는 키워드로 추정해 같은 체계에
// 태깅해야(추정 정보) 한다 — 단, 공식/추정은 반드시 시각적으로 구분돼야 사용자가 추정을 공식으로
// 오인하지 않는다(안전 요구사항, FR-1.4c).
//
// DOM/localStorage 의존이 없는 순수 모듈이라 server/proxy.js(Node)와 클라이언트 양쪽에서
// 그대로 import한다.
//
// 코드 순서·번호는 식품위생법 알레르기 유발 식품 표시 대상 19종 + NEIS 알레르기정보 번호 체계를
// 그대로 따른다 — 그래서 neisNumber는 우연이 아니라 M{neisNumber}로 항상 일치한다.
export const MILAIZE_ALLERGENS = [
  { code: 'M1', name: '난류(계란)', neisNumber: 1, keywords: ['계란', '달걀', '에그', '오믈렛', '마요네즈', '카스테라', '푸딩'] },
  { code: 'M2', name: '우유', neisNumber: 2, keywords: ['우유', '치즈', '크림', '버터', '라떼', '요거트', '요구르트', '연유'] },
  { code: 'M3', name: '메밀', neisNumber: 3, keywords: ['메밀', '막국수'] },
  { code: 'M4', name: '땅콩', neisNumber: 4, keywords: ['땅콩', '피넛'] },
  { code: 'M5', name: '대두', neisNumber: 5, keywords: ['두부', '된장', '간장', '콩나물', '순두부', '연두부', '콩국수', '낫또', '청국장'] },
  {
    code: 'M6',
    name: '밀',
    neisNumber: 6,
    keywords: ['라면', '국수', '우동', '칼국수', '짜장', '짬뽕', '빵', '파스타', '수제비', '돈까스', '까스', '튀김', '핫도그', '만두', '스파게티'],
  },
  { code: 'M7', name: '고등어', neisNumber: 7, keywords: ['고등어'] },
  { code: 'M8', name: '게', neisNumber: 8, keywords: ['꽃게', '대게', '게살'] },
  { code: 'M9', name: '새우', neisNumber: 9, keywords: ['새우'] },
  {
    code: 'M10',
    name: '돼지고기',
    neisNumber: 10,
    keywords: ['돈까스', '까스', '제육', '삼겹', '보쌈', '돼지', '목살', '스팸', '부대찌개', '부대', 'pork'],
  },
  { code: 'M11', name: '복숭아', neisNumber: 11, keywords: ['복숭아'] },
  { code: 'M12', name: '토마토', neisNumber: 12, keywords: ['토마토', '케첩'] },
  { code: 'M13', name: '아황산류', neisNumber: 13, keywords: ['건포도', '건조과일', '와인'] },
  { code: 'M14', name: '호두', neisNumber: 14, keywords: ['호두'] },
  {
    code: 'M15',
    name: '닭고기',
    neisNumber: 15,
    keywords: ['치킨', '닭', '닭갈비', '닭강정', '가라아게', '삼계탕', '후라이드', 'chicken'],
  },
  {
    code: 'M16',
    name: '쇠고기',
    neisNumber: 16,
    keywords: ['소고기', '쇠고기', '불고기', '갈비탕', '육개장', '장조림', '곰탕', '설렁탕', '우삼겹', 'beef'],
  },
  { code: 'M17', name: '오징어', neisNumber: 17, keywords: ['오징어'] },
  { code: 'M18', name: '조개류', neisNumber: 18, keywords: ['조개', '홍합', '굴', '전복', '바지락'] },
  { code: 'M19', name: '잣', neisNumber: 19, keywords: ['잣'] },
]

const BY_CODE = new Map(MILAIZE_ALLERGENS.map((a) => [a.code, a]))
const BY_NEIS_NUMBER = new Map(MILAIZE_ALLERGENS.map((a) => [a.neisNumber, a]))

// 저장된/전달된 코드가 잘못돼도 화면이 깨지지 않도록 안전한 조회만 제공한다.
export function getAllergenByCode(code) {
  return BY_CODE.get(code) || null
}

// NEIS가 주는 알레르기 번호(1~19)를 밀라이즈 코드로 변환한다(FR-1.4b). 정의되지 않은 번호는 무시한다.
export function mapNeisAllergy(neisNumbers) {
  return (neisNumbers || [])
    .map((n) => BY_NEIS_NUMBER.get(Number(n)))
    .filter(Boolean)
    .map((a) => a.code)
}

// 알레르기 정보가 없는 메뉴명(학식·일반 메뉴)에 키워드 매칭으로 코드를 추정 태깅한다(FR-1.4c).
// estimated: true는 화면에서 NEIS 공식 정보와 구분해 '추정' 배지를 붙이라는 신호다 — 이 값을 지우거나
// false로 덮어써 공식 정보처럼 보이게 하면 안 된다.
export function tagAllergensFromMenuName(menuName) {
  const text = (menuName || '').toLowerCase()
  const codes = text
    ? MILAIZE_ALLERGENS.filter((a) => a.keywords.some((kw) => text.includes(kw.toLowerCase()))).map((a) => a.code)
    : []
  return { codes, estimated: true }
}

// 추정 태깅 옆에 상시 노출해야 하는 고지 문구(FR-1.4c) — 여러 화면에서 문구가 갈라지지 않게 여기서만 관리한다.
export const ALLERGY_ESTIMATE_NOTICE =
  '메뉴명 기반 자동 분류로, 실제 재료와 다를 수 있습니다. 알레르기가 있다면 반드시 직접 확인하세요.'
