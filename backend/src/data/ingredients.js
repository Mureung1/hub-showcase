/**
 * @file ingredients.js
 * @description 재료 마스터 데이터 — 재료 고유의 정적 속성을 정의합니다.
 *
 * ## 역할 분리 원칙
 * - 이 파일       : 재료 자체의 고유 속성 (이름·단위·유통기한·설명)
 * - initialFridge : 사용자의 현재 재고 상태 (level·expiry 등)
 * - store.js      : 위 둘을 합산해 API 응답으로 조합
 *
 * ## 스키마
 * @typedef {Object} Ingredient
 * @property {string}   id               - 재료 고유 키 (fridge_items.ingredient_id 와 동일)
 * @property {string}   emoji            - 화면 표시용 이모지
 * @property {string}   name             - 한국어 재료명
 * @property {'fresh'|'processed'} category
 *   - fresh     : 신선식품 — levels 배열로 잔량 추적, 유통기한 자동 계산
 *   - processed : 가공식품 — qtyLabel 문자열로 표시, 유통기한 사용자 입력
 * @property {string[]|null} defaultUnitLabels
 *   - fresh 전용. 잔량 단계 배열 (마지막 값은 반드시 '소진').
 *   - 냉장고 수동 추가 시 이 배열을 levels 로 그대로 씁니다.
 *   - processed 는 null.
 * @property {{ spring:number, summer:number, fall:number, winter:number }|null} avgShelfLifeDays
 *   - fresh 전용. 계절별 평균 유통기한(일). processed 는 null.
 *   - 영수증 확정 시 구매일의 계절을 기준으로 자동 설정하는 데 사용합니다.
 * @property {string}   role             - 요리에서의 주요 역할 (재료 상세 바텀시트)
 * @property {string}   tip              - 보관법 팁 (재료 상세 바텀시트)
 */

/** @type {Ingredient[]} */
const INGREDIENT_LIST = [

  // ── 신선식품 ─────────────────────────────────────────────────────────────

  {
    id: 'pork',
    emoji: '🥩',
    name: '돼지고기 앞다리',
    category: 'fresh',
    // 수육·볶음용으로 150 g 단위 분리가 현실적인 최소 소비 단위
    defaultUnitLabels: ['300g', '150g', '소진'],
    avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 },
    role: '단백질이 필요한 볶음·구이·찌개에 두루 쓰는 기본 고기예요.',
    tip: '한 번 먹을 만큼 소분해서 냉동하면 오래가요. 해동은 냉장실에서 천천히 하는 게 맛이 덜 빠져요.',
  },

  {
    id: 'tofu',
    emoji: '🧊',
    name: '두부',
    category: 'fresh',
    // 한 모를 반으로 잘라 쓰는 경우가 대부분
    defaultUnitLabels: ['1모', '반모', '소진'],
    avgShelfLifeDays: { spring: 4, summer: 3, fall: 4, winter: 5 },
    role: '단백질을 더하면서 부드러운 식감을 주는 재료예요. 찌개·조림·부침 어디든 잘 어울려요.',
    tip: '개봉 후엔 물에 담가 냉장 보관하고, 매일 물을 갈아주면 2~3일 더 신선하게 먹을 수 있어요.',
  },

  {
    id: 'onion',
    emoji: '🧅',
    name: '양파',
    category: 'fresh',
    // 요리당 1/4 ~ 1/2 쪽씩 소진하는 패턴 반영
    defaultUnitLabels: ['1개', '반쪽', '1/4쪽', '소진'],
    avgShelfLifeDays: { spring: 14, summer: 10, fall: 20, winter: 30 },
    role: '볶으면 단맛을 내는 국물·볶음 요리의 기본 재료예요. 한식 대부분에 들어가요.',
    tip: '자른 양파는 랩으로 감싸 냉장 보관하고 일주일 안에 드세요. 통양파는 서늘하고 통풍되는 곳에 두면 한 달 이상 가요.',
  },

  {
    id: 'pa',
    emoji: '🥬',
    name: '대파',
    category: 'fresh',
    // 한 단 → 4분의 1 씩 소진하는 5단계 (prototype 과 동일하게 유지)
    defaultUnitLabels: ['한단', '3/4단', '1/2단', '1/4단', '소진'],
    avgShelfLifeDays: { spring: 10, summer: 7, fall: 12, winter: 14 },
    role: '향을 살리는 향신 재료예요. 국물 요리의 마무리나 고기 잡내 제거에 자주 써요.',
    tip: '씻어서 물기를 없앤 뒤 키친타월에 말아 냉장 보관하면 1~2주 가요. 잘라서 냉동하면 더 오래 써요.',
  },

  {
    id: 'kimchi',
    emoji: '🌶️',
    name: '김치',
    category: 'fresh',
    // 통김치 기준, 사용할수록 줄어드는 4단계
    defaultUnitLabels: ['1/2통', '1/3통', '1/4통', '소진'],
    // 발효식품이라 계절보다 냉장 보관이 핵심이지만, 여름에는 산패가 빠름
    avgShelfLifeDays: { spring: 60, summer: 45, fall: 60, winter: 90 },
    role: '그 자체로 반찬이 되면서 찌개·볶음밥에 감칠맛과 칼칼함을 더해줘요.',
    tip: '꾹꾹 눌러 공기를 빼고 밀폐하면 발효가 천천히 진행돼요. 익을수록 찌개·볶음 요리에 더 잘 어울려요.',
  },

  {
    id: 'egg',
    emoji: '🥚',
    name: '계란',
    category: 'fresh',
    // 1알 단위로 줄어드는 7단계 (6알 → 소진)
    defaultUnitLabels: ['6알', '5알', '4알', '3알', '2알', '1알', '소진'],
    avgShelfLifeDays: { spring: 25, summer: 18, fall: 25, winter: 35 },
    role: '거의 모든 요리에 두루 쓰는 만능 단백질 재료예요.',
    tip: '뾰족한 쪽이 아래로 가게 세워서 냉장 보관하면 신선도가 더 오래 유지돼요.',
  },

  // ── 가공식품 ─────────────────────────────────────────────────────────────
  // processed 재료는 level 추적 없이 qtyLabel 문자열로 표시합니다.
  // defaultUnitLabels·avgShelfLifeDays 는 null.

  {
    id: 'soy',
    emoji: '🍶',
    name: '간장',
    category: 'processed',
    defaultUnitLabels: null,
    avgShelfLifeDays: null,
    role: '짠맛과 감칠맛을 내는 기본 양념이에요. 거의 모든 볶음·조림에 들어가요.',
    tip: '직사광선을 피해 서늘한 곳에 두면 상온 보관도 가능해요. 개봉 후엔 냉장 보관을 추천해요.',
  },

  {
    id: 'ramen',
    emoji: '🍜',
    name: '라면',
    category: 'processed',
    defaultUnitLabels: null,
    avgShelfLifeDays: null,
    role: '급할 때 빠르게 한 끼를 해결해주는 비상용 식재료예요.',
    tip: '습기를 피해 서늘하고 건조한 곳에 두면 표시된 유통기한까지 문제없어요.',
  },

  {
    id: 'spam',
    emoji: '🥫',
    name: '스팸',
    category: 'processed',
    defaultUnitLabels: null,
    avgShelfLifeDays: null,
    role: '짭짤한 감칠맛을 더하는 가공육이에요. 볶음밥·찌개에 넣으면 든든해져요.',
    tip: '개봉 전엔 상온 보관 가능하고, 개봉 후에는 밀폐용기에 담아 냉장 보관하며 2~3일 안에 드세요.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────────────────────

/** 전체 재료 배열 */
export const ingredients = INGREDIENT_LIST;

/**
 * id → Ingredient 맵 (O(1) 조회).
 * store.js 에서 fridge 재고에 마스터 정보를 합칠 때 사용합니다.
 * @type {Record<string, Ingredient>}
 */
export const ingredientMap = Object.fromEntries(
  INGREDIENT_LIST.map((ing) => [ing.id, ing]),
);

/**
 * 구매 날짜를 받아 해당 계절 키를 반환합니다. (한국 기준)
 *
 * @param {string|Date} purchasedAt
 * @returns {'spring'|'summer'|'fall'|'winter'}
 */
export function getSeason(purchasedAt) {
  const month = new Date(purchasedAt).getMonth() + 1; // 1–12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

/**
 * 재료 ID + 구매 날짜로 예상 유통기한을 계산합니다.
 * processed 재료이거나 마스터에 없으면 null 을 반환합니다.
 *
 * @param {string}      ingredientId
 * @param {string|Date} purchasedAt
 * @returns {string|null} 'YYYY-MM-DD' 형식, 또는 null
 */
export function calcExpiryDate(ingredientId, purchasedAt) {
  const master = ingredientMap[ingredientId];
  if (!master?.avgShelfLifeDays) return null;

  const days = master.avgShelfLifeDays[getSeason(purchasedAt)];
  const expiry = new Date(purchasedAt);
  expiry.setDate(expiry.getDate() + days);

  return expiry.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}
