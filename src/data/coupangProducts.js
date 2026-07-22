// 쿠팡 파트너스 영양제 상품 데이터(PRD v2.0 §3 / FR-3.2).
//
// ⚠️ 지금 값은 **전부 자리표시자**다. 파트너스 승인 후 이 파일의 값만 바꾸면 되고, 추천 로직
// (src/utils/adRecommendation.js)과 화면(src/components/DeficientNutrientAds.jsx)은 손댈 필요가 없다.
//
// [파트너스 승인 후 교체 절차]
//  1. https://partners.coupang.com 로그인 → 영양소별로 상품 검색
//  2. 상품 상세에서 "파트너스 링크 생성" → 단축 URL(https://link.coupang.com/a/XXXXXX) 복사
//     → 같은 화면에서 상품 이미지 URL(https://.../thumbnails/remote/...jpg)도 함께 복사
//  3. 아래 배열의 productName / price / imageUrl / partnersUrl 4개 값만 교체
//     (id·nutrient는 추천 로직이 참조하는 키라 바꾸지 말 것)
//  4. 상품을 더 넣고 싶으면 같은 모양의 객체를 배열에 추가하기만 하면 된다 — 코드 수정 불필요.
//
// [지금 partnersUrl에 들어있는 값] 실제 제휴 링크가 아니라 쿠팡 검색 결과 URL이다. 제휴 수수료는
// 당연히 발생하지 않지만, 카드를 눌렀을 때 "실제 쿠팡 페이지로 이동"하는 동작 자체는 지금도 그대로
// 검증할 수 있게(빈 '#'로 두면 확인이 불가능하다) 진짜 주소를 넣어뒀다.
//
// [표시 규칙 — FR-3.3] productName은 판매처에 표기된 상품명 그대로만 쓴다. "치료"·"예방"·"개선 보장"
// 같은 의약품 오인 표현은 상품명·설명·태그 어디에도 넣지 않는다(식품표시광고법). 그래서 이 스키마에는
// 애초에 효능을 적는 필드가 없다.

// 상품 스키마: { id, nutrient, productName, price, imageUrl, partnersUrl }
//   id         : 트래킹 키(로컬 노출/클릭 집계). 한 번 정하면 바꾸지 않는 게 좋다.
//   nutrient   : 아래 AD_NUTRIENTS의 키. 추천 로직이 이 값으로 매칭한다.
//   price      : 숫자(원). 화면에서 천 단위 구분 기호를 붙여 표시한다.
//   imageUrl   : 정사각형 썸네일. 빈 값이면 카드가 영양소 이니셜 배지로 대체한다.
//   partnersUrl: 파트너스 링크(승인 전에는 쿠팡 검색 URL).

const search = (keyword) => `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`

// 광고에서 다루는 영양소 목록. 앞의 5개는 **앱이 실제로 추적하는 영양소**라 키가 nutrition.js의
// NUTRIENT_LABELS와 정확히 일치한다(protein/fiber/calories/carbs/fat) — 실측 부족 영양소 매칭이
// 이 키로 이뤄지기 때문에 반드시 같아야 한다. 뒤의 6개는 앱이 아직 추적하지 않는 미량영양소로,
// PRD 3.2의 폴백 목록 전용이다(그래서 실측 매칭에는 절대 걸리지 않는다).
// 나트륨(sodium)은 "넘기면 안 되는 한도"라 보충 대상이 아니므로 의도적으로 빠져 있다.
export const AD_NUTRIENTS = {
  // ── 앱이 추적하는 영양소(실측 부족 매칭용) ──
  protein: { label: '단백질', tracked: true },
  fiber: { label: '식이섬유', tracked: true },
  calories: { label: '열량', tracked: true },
  carbs: { label: '탄수화물', tracked: true },
  fat: { label: '지방', tracked: true },
  // ── 앱이 추적하지 않는 미량영양소(폴백 전용) ──
  vitaminD: { label: '비타민D', tracked: false },
  calcium: { label: '칼슘', tracked: false },
  vitaminA: { label: '비타민A', tracked: false },
  magnesium: { label: '마그네슘', tracked: false },
  omega3: { label: '오메가-3', tracked: false },
  vitaminC: { label: '비타민C', tracked: false },
}

// PRD 3.2 2순위 폴백 순서 — 한국인 평균 섭취 실태 기준 대표 부족 영양소. 비타민D가 최우선.
export const FALLBACK_NUTRIENT_ORDER = ['vitaminD', 'calcium', 'vitaminA', 'magnesium', 'omega3', 'vitaminC']

export const COUPANG_PRODUCTS = [
  // ── 폴백 목록(미량영양소) ── 영양소당 최소 1개는 반드시 유지할 것.
  {
    id: 'cp-vitamin-d-1',
    nutrient: 'vitaminD',
    productName: '뉴트리원 비타민D 2000IU 12개월분',
    price: 12900,
    imageUrl: '',
    partnersUrl: search('비타민D 영양제'),
  },
  {
    id: 'cp-calcium-1',
    nutrient: 'calcium',
    productName: '고려은단 칼슘 마그네슘 비타민D 90정',
    price: 15900,
    imageUrl: '',
    partnersUrl: search('칼슘 영양제'),
  },
  {
    id: 'cp-vitamin-a-1',
    nutrient: 'vitaminA',
    productName: '종근당 비타민A 베타카로틴 90캡슐',
    price: 13900,
    imageUrl: '',
    partnersUrl: search('비타민A 영양제'),
  },
  {
    id: 'cp-magnesium-1',
    nutrient: 'magnesium',
    productName: '뉴트리코어 마그네슘 400mg 90정',
    price: 14900,
    imageUrl: '',
    partnersUrl: search('마그네슘 영양제'),
  },
  {
    id: 'cp-omega3-1',
    nutrient: 'omega3',
    productName: '앤씨아 알티지 오메가3 60캡슐',
    price: 19900,
    imageUrl: '',
    partnersUrl: search('rTG 오메가3'),
  },
  {
    id: 'cp-vitamin-c-1',
    nutrient: 'vitaminC',
    productName: '고려은단 비타민C 1000 180정',
    price: 17900,
    imageUrl: '',
    partnersUrl: search('비타민C 1000'),
  },

  // ── 앱이 실측하는 영양소(오늘 식단에서 부족으로 잡히면 이쪽이 먼저 노출된다) ──
  {
    id: 'cp-protein-1',
    nutrient: 'protein',
    productName: '뉴트리코스트 웨이 프로틴 아이솔레이트 1kg',
    price: 32900,
    imageUrl: '',
    partnersUrl: search('웨이 프로틴 보충제'),
  },
  {
    id: 'cp-fiber-1',
    nutrient: 'fiber',
    productName: '차전자피 식이섬유 분말 500g',
    price: 13500,
    imageUrl: '',
    partnersUrl: search('차전자피 식이섬유'),
  },
  {
    id: 'cp-calories-1',
    nutrient: 'calories',
    productName: '뉴케어 균형영양식 200ml 30팩',
    price: 38900,
    imageUrl: '',
    partnersUrl: search('균형영양식 뉴케어'),
  },
  {
    id: 'cp-carbs-1',
    nutrient: 'carbs',
    productName: '에너지 곡물 시리얼바 20개입',
    price: 11900,
    imageUrl: '',
    partnersUrl: search('시리얼바'),
  },
  {
    id: 'cp-fat-1',
    nutrient: 'fat',
    productName: '캘리포니아 아몬드 구운 아몬드 1kg',
    price: 16900,
    imageUrl: '',
    partnersUrl: search('구운 아몬드 1kg'),
  },
]

// 쿠팡 파트너스가 요구하는 필수 고지 문구. **문구 변경 금지**(PRD FR-3.1) — 어떤 상태에서도 렌더링을
// 생략하면 안 되므로, 화면 컴포넌트는 조건 없이 이 상수를 그대로 출력한다.
export const COUPANG_DISCLOSURE =
  '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'

export function productsForNutrient(nutrient) {
  return COUPANG_PRODUCTS.filter((p) => p.nutrient === nutrient)
}

export function nutrientLabel(nutrient) {
  return AD_NUTRIENTS[nutrient]?.label ?? nutrient
}
