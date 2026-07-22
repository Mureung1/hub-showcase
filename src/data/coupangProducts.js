// 쿠팡 파트너스 영양제 상품 데이터(PRD v2.0 §3 / FR-3.2).
//
// [현재 상태]
//  · 식이섬유 / 지방 / 단백질 3개 영양소 → **실제 쿠팡 파트너스 제휴 링크**(영양소당 3개). 클릭 시
//    실제 상품 페이지로 이동하고 수수료가 집계된다.
//  · 나머지(비타민D·칼슘·비타민A·마그네슘·오메가-3·비타민C, 열량, 탄수화물) → 아직 파트너스 링크가
//    없어 쿠팡 **검색 결과 URL**을 쓴다. 이동은 정상 동작하지만 제휴 수수료는 발생하지 않는다.
//    링크를 받으면 아래 `partnersUrl`만 교체하면 된다.
//
// [productName / price가 비어 있는 이유 — 중요]
// 파트너스 단축 링크(link.coupang.com/a/XXXX)만으로는 상품명과 가격을 알 수 없다(쿠팡이 서버 접근을
// 차단해 자동으로 읽어올 수도 없다). **없는 상품명을 지어내면 사용자를 속이는 것**이고 FR-3.3의
// "상품명 그대로만 표기" 원칙에도 어긋나므로, 빈 값으로 두고 화면이 알아서 대체 표기하도록 했다.
//   · productName 비어 있음 → 카드가 "<영양소> 보충제" + "쿠팡에서 보기"로 대체 표기
//   · price 비어 있음(null)  → 가격 칩을 숨김
//   · imageUrl 비어 있음     → 영양소 이니셜 배지로 대체
// 즉 **지금 이대로도 광고는 정상 동작한다.** 이름/가격을 채우면 그만큼 카드가 풍부해질 뿐이다.
//
// [상품명·가격 채우는 법]
//  1. 각 항목의 `sourceUrl` 주석에 적힌 쿠팡 상품 페이지를 브라우저로 연다(파트너스 링크가 가리키는 곳).
//  2. 페이지의 상품명과 가격을 그대로 복사해 `productName` / `price`에 넣는다.
//  3. 상품 이미지 위에서 우클릭 → "이미지 주소 복사" → `imageUrl`에 넣는다.
//  4. `npm run check:ads`로 데이터 무결성 확인.
// `id`와 `nutrient`는 추천 로직/트래킹이 참조하는 키다 — **절대 바꾸지 말 것.**
//
// [표시 규칙 — FR-3.3] "치료"·"예방"·"개선 보장" 같은 의약품 오인 표현은 상품명 어디에도 넣지 않는다
// (식품표시광고법). check:ads가 이 표현을 자동으로 걸러낸다.

// 상품 스키마: { id, nutrient, productName, price, imageUrl, partnersUrl }
//   id          : 트래킹 키(로컬 노출/클릭 집계). 한 번 정하면 바꾸지 않는다.
//   nutrient    : 아래 AD_NUTRIENTS의 키. 추천 로직이 이 값으로 매칭한다.
//   productName : 판매처 표기 그대로. **빈 문자열이면 화면이 영양소 기반으로 대체 표기한다.**
//   price       : 숫자(원). **null이면 가격을 표시하지 않는다.**
//   imageUrl    : 정사각형 썸네일. 빈 값이면 영양소 이니셜 배지로 대체.
//   partnersUrl : 파트너스 제휴 링크(또는 아직 없으면 쿠팡 검색 URL).

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
  // ══ 실제 파트너스 제휴 링크 ═══════════════════════════════════════════════
  // 식이섬유
  {
    id: 'cp-fiber-1',
    nutrient: 'fiber',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAu1Zwgk44',
    // sourceUrl: https://www.coupang.com/vp/products/9604664250
  },
  {
    id: 'cp-fiber-2',
    nutrient: 'fiber',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAu6EEpUzs',
    // sourceUrl: https://www.coupang.com/vp/products/8213923538
  },
  {
    id: 'cp-fiber-3',
    nutrient: 'fiber',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAu7zb1y0a',
    // sourceUrl: https://www.coupang.com/vp/products/6990522639
  },

  // 지방
  {
    id: 'cp-fat-1',
    nutrient: 'fat',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAu9uG9kaa',
    // sourceUrl: https://www.coupang.com/vp/products/1388355334
  },
  {
    id: 'cp-fat-2',
    nutrient: 'fat',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAvesXXVwO',
    // sourceUrl: https://www.coupang.com/vp/products/8562344995
  },
  {
    id: 'cp-fat-3',
    nutrient: 'fat',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAvgG3WySi',
    // sourceUrl: https://www.coupang.com/vp/products/5448185469
  },

  // 단백질
  {
    id: 'cp-protein-1',
    nutrient: 'protein',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAvlnHLLhY',
    // sourceUrl: https://www.coupang.com/vp/products/8255393437
  },
  {
    id: 'cp-protein-2',
    nutrient: 'protein',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAvm6wjZ1g',
    // sourceUrl: https://www.coupang.com/vp/products/8288998026
  },
  {
    id: 'cp-protein-3',
    nutrient: 'protein',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: 'https://link.coupang.com/a/fAvo3MrI72',
    // sourceUrl: https://www.coupang.com/vp/products/8990838579
  },

  // ══ 아직 파트너스 링크가 없는 영양소 (쿠팡 검색 URL — 이동은 되지만 수수료 없음) ═══════
  // 폴백 목록(미량영양소). 영양소당 최소 1개는 반드시 유지할 것 — 하나라도 비면 배너가 빌 수 있다.
  {
    id: 'cp-vitamin-d-1',
    nutrient: 'vitaminD',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('비타민D 영양제'),
  },
  {
    id: 'cp-calcium-1',
    nutrient: 'calcium',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('칼슘 영양제'),
  },
  {
    id: 'cp-vitamin-a-1',
    nutrient: 'vitaminA',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('비타민A 영양제'),
  },
  {
    id: 'cp-magnesium-1',
    nutrient: 'magnesium',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('마그네슘 영양제'),
  },
  {
    id: 'cp-omega3-1',
    nutrient: 'omega3',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('rTG 오메가3'),
  },
  {
    id: 'cp-vitamin-c-1',
    nutrient: 'vitaminC',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('비타민C 1000'),
  },
  // 앱이 추적하지만 아직 제휴 링크가 없는 나머지 2개
  {
    id: 'cp-calories-1',
    nutrient: 'calories',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('균형영양식'),
  },
  {
    id: 'cp-carbs-1',
    nutrient: 'carbs',
    productName: '',
    price: null,
    imageUrl: '',
    partnersUrl: search('에너지바'),
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

// 상품명이 아직 채워지지 않은 항목은 영양소 기반으로 대체 표기한다. 실제 상품명을 모르는 상태에서
// 그럴듯한 이름을 지어내지 않기 위한 장치 — 사용자에게는 "이 영양소 보충제로 간다"는 사실만 정확히
// 전달되고, 데이터 파일에 진짜 이름을 넣는 순간 그 이름으로 자동 교체된다.
export function displayProductName(product) {
  return product.productName || `${nutrientLabel(product.nutrient)} 보충제`
}

// 상품명이 실제로 채워져 있는지 — 같은 영양소의 상품을 여러 장 늘어놓아도 될지 판단하는 데 쓴다
// (이름이 비어 있으면 대체 표기가 전부 똑같아져 "식이섬유 보충제" 카드가 3장 나온다).
export function hasRealProductName(product) {
  return Boolean(product.productName)
}
