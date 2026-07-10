/**
 * @file store.js
 * @description 인메모리 데이터 스토어 — 실제 DB(Postgres/Supabase) 로 교체하기 전까지
 * 재고·영수증·레시피 상태를 관리하는 계층입니다.
 *
 * ## 설계 원칙
 * - 이 파일의 함수는 컨트롤러에서 호출하는 "DB 질의" 자리를 대신합니다.
 * - DB 로 교체할 때는 함수 내부의 인메모리 로직만 SQL 호출로 바꾸면 되고,
 *   컨트롤러 코드는 그대로 유지할 수 있습니다.
 *
 * ## 핵심 개념: 재고(Stock) + 마스터(Ingredient) 합산
 * - fridge 맵 : { [id]: StockState } — 시점에 따라 변하는 재고 정보만 보관
 * - ingredientMap : { [id]: Ingredient } — 변하지 않는 재료 고유 속성
 * - enrichFridgeItem() 이 두 소스를 합쳐 API 응답 모양을 만듭니다.
 *   → FE 는 기존과 동일한 응답 구조를 받으므로, FE 코드를 수정할 필요가 없습니다.
 */

import { initialFridge } from './data/initialFridge.js';
import { ingredientMap, calcExpiryDate, getSeason } from './data/ingredients.js';
import { recipeOrder, recipes } from './data/recipes.js';
import { mealPriceTable, dayLabels } from './data/mealPrices.js';
import { ingHave, ingName, recipeHasImminentBadge, imminentIds } from './logic/fridgeLogic.js';

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ─────────────────────────────────────────────────────────────────────────────
// 날짜 유틸리티
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 데모 스토리 안의 "오늘" — 영수증 인식 화면의 2026.07.08 과 맞춘 고정 기준일.
 *
 * TODO: 실서비스 전환 시 `new Date()` 로 교체하세요.
 *       환경변수(DEMO_TODAY)가 있으면 그 값을, 없으면 실제 오늘을 사용하도록
 *       `new Date(process.env.DEMO_TODAY ?? undefined)` 형태로 바꾸면 됩니다.
 */
const TODAY = new Date(process.env.DEMO_TODAY ?? '2026-07-08T00:00:00');

/** 'M/D' 형식 구매일 문자열 생성 */
function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** D-day 문자열 생성. 양수 = 남은 일수, 음수 = 초과 일수 */
function formatDday(dateStr) {
  const diff = Math.round((new Date(dateStr) - TODAY) / 86_400_000);
  return diff >= 0 ? `D-${diff}` : `D+${-diff}`;
}

/** D-day 문자열을 숫자로 변환 (D-3 → 3, D+1 → -1) */
function ddayValue(label) {
  const n = parseInt(label.slice(2), 10);
  return label.startsWith('D-') ? n : -n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 재고 상태 (인메모리 "DB")
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, object>} 재고 상태 맵 (id → StockState) */
let fridge = clone(initialFridge);

/** @type {Record<string, object>} 영수증 인식 이력 */
const receipts = {};
let nextReceiptId = 1;

// ─────────────────────────────────────────────────────────────────────────────
// 재고 조합 (마스터 + 재고 상태 → API 응답 모양)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 단일 재고 항목에 마스터 정보를 합쳐 API 응답 모양을 만듭니다.
 *
 * fresh 재료 응답 예시:
 *   { id, emoji, name, category, levels, level, purchased, expiry, imminent, role, tip }
 *
 * processed 재료 응답 예시:
 *   { id, emoji, name, category, qtyLabel, expiryLabel, role, tip }
 *
 * @param {string} id    - 재료 키
 * @param {object} stock - fridge 맵 안의 재고 상태 객체
 * @returns {object}     - FE 가 사용하는 완성된 재료 객체
 */
function enrichFridgeItem(id, stock) {
  const master = ingredientMap[id];

  // 마스터에 없는 재료 (수동 추가된 임시 재료 등)는 stock 자체를 그대로 반환
  if (!master) return { id, ...stock };

  if (master.category === 'fresh') {
    // levels 는 마스터의 defaultUnitLabels 를 그대로 사용합니다.
    // stock.level 은 그 배열 안에서 현재 위치를 나타냅니다.
    return {
      id,
      emoji:     master.emoji,
      name:      master.name,
      category:  master.category,
      levels:    master.defaultUnitLabels,
      level:     stock.level,
      purchased: stock.purchased,
      expiry:    stock.expiry,
      imminent:  stock.imminent,
      role:      master.role,
      tip:       master.tip,
    };
  }

  // processed
  return {
    id,
    emoji:       master.emoji,
    name:        master.name,
    category:    master.category,
    qtyLabel:    stock.qtyLabel,
    expiryLabel: stock.expiryLabel ?? null,
    role:        master.role,
    tip:         master.tip,
  };
}

/**
 * fridge 맵 전체를 enrichFridgeItem 으로 변환한 결과를 반환합니다.
 * fridgeLogic.js 의 헬퍼들은 이 반환값 형태를 기준으로 동작합니다.
 *
 * @returns {Record<string, object>}
 */
function buildFridgeView() {
  return Object.fromEntries(
    Object.entries(fridge).map(([id, stock]) => [id, enrichFridgeItem(id, stock)]),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 냉장고 (Fridge)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/fridge — 전체 재고를 마스터 정보와 합쳐 반환 */
export function getFridge() {
  return clone(buildFridgeView());
}

/** POST /api/fridge — 재고 아이템 수동 추가 */
export function addFridgeItem({ name, quantityLabel, purchasedAt, expiryDate }) {
  const id = `custom_${Date.now()}`;
  const expiry = formatDday(expiryDate);

  // 마스터에서 id 로 찾을 수 없는 직접 추가 재료 —
  // defaultUnitLabels 가 없으므로 입력된 단위를 2단계 배열로 구성합니다.
  fridge[id] = {
    // 마스터 없이 stock 과 표시 정보를 함께 보관 (직접 추가 재료 한정)
    emoji:     '🥗',
    name,
    category:  'fresh',
    levels:    [quantityLabel, '소진'],
    level:     0,
    purchased: formatMD(purchasedAt),
    expiry,
    imminent:  ddayValue(expiry) <= 2,
    role:      '사용자가 직접 추가한 재료예요.',
    tip:       '일반적인 보관 방법(냉장·밀폐)을 따르면 돼요.',
  };

  return clone(fridge[id]);
}

/** PATCH /api/fridge/:id — 재고 아이템 수정 (수량·유통기한) */
export function updateFridgeItem(id, patch) {
  if (!fridge[id]) return null;
  fridge[id] = { ...fridge[id], ...patch };
  return clone(enrichFridgeItem(id, fridge[id]));
}

/** DELETE /api/fridge/:id — 재고 아이템 삭제 */
export function deleteFridgeItem(id) {
  if (!fridge[id]) return false;
  delete fridge[id];
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 영수증 (Receipts)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/receipts — 영수증 OCR (현재는 고정 데모 결과 반환) */
export function createReceipt() {
  const id = `r_${nextReceiptId++}`;
  const record = {
    id,
    store:  '이마트 신촌점',
    date:   '2026.07.08',
    status: 'partial',
    items: [
      { rawText: '양파(1.5kg/망)',     matchedIngredientId: 'onion', quantityLabel: '3쪽',  category: 'fresh',     matched: true },
      { rawText: '돈앞다리수육용300G', matchedIngredientId: 'pork',  quantityLabel: '300g', category: 'fresh',     matched: true },
      { rawText: '풀무원국산콩두부',   matchedIngredientId: 'tofu',  quantityLabel: '1모',  category: 'fresh',     matched: true },
      { rawText: '스팸클래식200G',     matchedIngredientId: 'spam',  quantityLabel: '200g', category: 'processed', matched: true, isNew: true },
      { rawText: '(흐릿함)',           matchedIngredientId: null,    quantityLabel: null,   category: null,        matched: false },
    ],
  };
  receipts[id] = record;
  return clone(record);
}

/**
 * POST /api/receipts/:id/confirm — 영수증 확정 → 냉장고 재고 반영
 *
 * @param {string} receiptId
 * @param {{ expiryOverrides?: Record<string, string> }} options
 *   expiryOverrides : { [ingredientId]: 'YYYY-MM-DD' } — 사용자가 수동으로 보정한 유통기한
 */
export function confirmReceipt(receiptId, { expiryOverrides = {} } = {}) {
  const record = receipts[receiptId];
  if (!record) return null;

  record.items
    .filter((it) => it.matched && it.matchedIngredientId)
    .forEach((it) => {
      const { matchedIngredientId: id, quantityLabel, category } = it;
      const master = ingredientMap[id];

      // 유통기한 결정 우선순위:
      //   1) 사용자 수동 보정값 (expiryOverrides)
      //   2) 마스터의 avgShelfLifeDays 로 자동 계산
      //   3) 기존 냉장고 잔여 유통기한
      //   4) 폴백: D-5
      const rawExpiry = expiryOverrides[id]
        ?? calcExpiryDate(id, '2026-07-08')   // TODO: 실서비스에서는 실제 오늘 날짜 사용
        ?? null;

      const expiry = rawExpiry ? formatDday(rawExpiry) : (fridge[id]?.expiry ?? 'D-5');

      if (fridge[id]) {
        // 기존 재고 → 최신 구매일·유통기한으로 갱신하고 레벨 초기화
        fridge[id] = {
          ...fridge[id],
          level:     fridge[id].level !== undefined ? 0 : undefined,
          purchased: formatMD('2026-07-08'),
          expiry,
          imminent:  ddayValue(expiry) <= 2,
        };
      } else if (master) {
        // 신규 재료 — 마스터에서 정보를 가져와 재고 생성
        // (이제 spam 을 포함한 모든 마스터 재료가 이 경로로 일반 처리됩니다.)
        if (category === 'fresh') {
          fridge[id] = {
            level:     0,
            purchased: formatMD('2026-07-08'),
            expiry,
            imminent:  ddayValue(expiry) <= 2,
          };
        } else {
          // processed
          fridge[id] = {
            qtyLabel:    quantityLabel ?? '1개',
            expiryLabel: null,
          };
        }
      }
    });

  record.status = 'confirmed';
  return clone(buildFridgeView());
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 레시피 (Recipes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/recipes — 냉장고 재고 기반 레시피 목록 조회
 *
 * @param {{ filter?: 'all'|'full'|'few', level?: 'all'|'beginner'|'mid' }} options
 *   filter 허용값:
 *   - 'all'  : 재고 보유 여부 무관, 전체 레시피 (기본값)
 *   - 'full' : 필요한 재료를 모두 보유한 레시피만 ("바로 가능")
 *   - 'few'  : 핵심 재료가 4개 이하인 간단한 레시피만 ("적은 재료 OK")
 *
 * @returns {{ items: object[], total: number }}
 */
export function listRecipes({ filter = 'all', level = 'all' } = {}) {
  const view = buildFridgeView();

  const rows = recipeOrder.map((id) => {
    const r = recipes[id];
    const have  = r.ingredients.filter((ing) => ingHave(view, ing)).length;
    const total = r.ingredients.length;

    return {
      id,
      name:          r.name,
      emoji:         r.emoji,
      level:         r.level,
      levelLabel:    r.levelLabel,
      time:          r.time,
      have,
      total,
      full:          have === total,
      few:           total <= 4,
      imminentBadge: recipeHasImminentBadge(view, recipes, id),
      missing:       r.ingredients
                       .filter((ing) => !ingHave(view, ing))
                       .map((ing) => ingName(view, ing)),
    };
  });

  const filtered = rows.filter((r) => {
    if (filter === 'full' && !r.full) return false;
    if (filter === 'few'  && !r.few)  return false;
    if (level !== 'all'  && r.level !== level) return false;
    return true;
  });

  return { items: filtered, total: filtered.length };
}

/** GET /api/recipes/:id — 레시피 상세 (재료·애드온·조리 스텝) */
export function getRecipeDetail(id) {
  const r = recipes[id];
  if (!r) return null;

  const view = buildFridgeView();

  return {
    id,
    ...clone(r),
    ingredients: r.ingredients.map((ing) => ({
      ...ing,
      have: ingHave(view, ing),
      name: ingName(view, ing),
    })),
    addons: r.addons.map((a) => ({
      ...a,
      fridgeInfo: clone(view[a.id]),
    })),
  };
}

/**
 * POST /api/recipes/:id/cook-done — 조리 완료 → 재고 일괄 차감
 *
 * @param {string} recipeId
 * @param {{ id: string, use: number }[]} deductions - 차감할 재료 목록
 * @throws {Error & { status: number }} recipeId나 deductions의 id가 유효하지 않으면 status=400 에러
 */
export function cookDone(recipeId, deductions) {
  if (!recipes[recipeId]) {
    throw Object.assign(new Error(`cook-done: unknown recipe id "${recipeId}"`), { status: 400 });
  }

  const view = buildFridgeView();

  // levels 가 없는 id(존재하지 않거나 가공식품처럼 잔량 추적을 안 하는 재료)를 먼저 걸러낸다 —
  // 아래 map에서 그대로 진행하면 current.levels가 undefined라 크래시한다.
  const invalid = deductions.find(({ id }) => !view[id]?.levels);
  if (invalid) {
    throw Object.assign(new Error(`cook-done: unknown or untracked ingredient id "${invalid.id}"`), { status: 400 });
  }

  const results = deductions.map(({ id, use }) => {
    const current = view[id];
    const before   = current.levels[current.level];
    const afterIdx = Math.min(current.level + use, current.levels.length - 1);

    if (use > 0) fridge[id] = { ...fridge[id], level: afterIdx };

    return {
      id,
      name:   current.name,
      emoji:  current.emoji,
      before,
      after:  current.levels[afterIdx],
    };
  });

  return { results, fridge: clone(buildFridgeView()) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 유통기한 알림 (Expiry Alerts)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/fridge/alerts — 유통기한 임박 재료 및 관련 레시피 목록 */
export function getExpiryAlerts() {
  const view = buildFridgeView();
  const ids  = imminentIds(view);

  const relatedRecipeIds = recipeOrder.filter((rid) =>
    recipes[rid].ingredients.some((ing) => ing.id && ids.includes(ing.id)),
  );

  return {
    items: ids.map((id) => ({ id, ...clone(view[id]) })),
    relatedRecipes: relatedRecipeIds.map((rid) => ({
      id: rid,
      ...clone(recipes[rid]),
      usedNames: recipes[rid].ingredients
        .filter((ing) => ing.id && ids.includes(ing.id))
        .map((ing) => view[ing.id].name),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 장보기 (Shopping)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 장보기 세트 정의 — 실제 recipes.js에 있는 레시피 id만 참조한다.
 * (예전 정적 데이터는 "된장찌개"처럼 recipes.js에 없는 요리명을 하드코딩하고 있었다.)
 *
 * matchType : 'maxVariety'(재료 최대활용) | 'complete100'(100% 완성 — 재료 적은 세트)
 * setLevel  : 세트 자체의 난이도 태그('beginner'|'mid') — 개별 레시피 level과는 별개
 */
const SHOPPING_SET_DEFS = [
  { id: 'basic',  name: '알뜰 기본 세트', badge: '추천', level: null,      matchType: 'maxVariety',  setLevel: 'beginner', recipeIds: ['jeyuk-bokkeum', 'tofu-braise', 'kimchi-jjigae', 'egg-steam'] },
  { id: 'quick3', name: '초간단 3일 세트', badge: null,   level: null,      matchType: 'complete100', setLevel: 'beginner', recipeIds: ['kimchi-fried-rice', 'egg-roll', 'tofu-pan'] },
  { id: 'week',   name: '한주 든든 세트',  badge: null,   level: '🟡 중급', matchType: 'maxVariety',  setLevel: 'mid',      recipeIds: ['pajeon', 'omelette', 'jeyuk-bokkeum', 'kimchi-pork-jjim'] },
];

/**
 * 레시피 id 목록을 받아 "냉장고에 없어서 사야 하는" 재료 목록을 계산한다.
 * getShoppingSets/getShoppingList/getMealShoppingList이 공통으로 쓰는 핵심 로직.
 *
 * @param {string[]} recipeIds
 * @returns {{label: string, price: number, uses: string[]}[]}
 */
function computeShoppingNeeds(recipeIds) {
  const view = buildFridgeView();
  const need = {};

  recipeIds.forEach((id) => {
    recipes[id].ingredients.forEach((ing) => {
      if (ing.untracked || ingHave(view, ing)) return;

      const key = ing.id || ing.name;
      if (!need[key]) need[key] = { label: ingName(view, ing), price: mealPriceTable[key] ?? 3000, uses: [] };
      if (!need[key].uses.includes(recipes[id].name)) need[key].uses.push(recipes[id].name);
    });
  });

  return Object.values(need);
}

/**
 * 레시피 id 목록 기준으로, 필요하지만 이미 냉장고에 있는 재료 목록을 계산한다.
 * (computeShoppingNeeds의 "제외된 쪽" — 장보기 리스트의 "이미 있어요" 섹션에 사용)
 */
function computeAlreadyHave(recipeIds) {
  const view = buildFridgeView();
  const have = {};

  recipeIds.forEach((id) => {
    recipes[id].ingredients.forEach((ing) => {
      if (ing.untracked || !ing.id || !ingHave(view, ing)) return;
      const item = view[ing.id];
      const qty = item.levels ? item.levels[item.level] : item.qtyLabel;
      have[ing.id] = { name: item.name, note: `냉장고에 있음 (${qty})` };
    });
  });

  return Object.values(have);
}

/** GET /api/shopping/sets?match=&level= — 추천 장보기 세트 목록 (실제 냉장고 재고 기준으로 계산) */
export function getShoppingSets({ match = 'all', level = 'all' } = {}) {
  const sets = SHOPPING_SET_DEFS
    .filter((s) => (match === 'all' || s.matchType === match) && (level === 'all' || s.setLevel === level))
    .map((s) => {
      const needs = computeShoppingNeeds(s.recipeIds);
      return {
        id: s.id,
        name: s.name,
        badge: s.badge,
        level: s.level,
        buyCount: needs.length,
        dishCount: s.recipeIds.length,
        dishes: s.recipeIds.map((id) => recipes[id].name).join(' · '),
        total: needs.reduce((sum, it) => sum + it.price, 0),
      };
    });

  return { sets };
}

/** GET /api/shopping/list?setId= — 선택된 세트의 장보기 목록 (기본값: 첫 번째 세트) */
export function getShoppingList(setId) {
  const def = SHOPPING_SET_DEFS.find((s) => s.id === setId) ?? SHOPPING_SET_DEFS[0];

  const buy = computeShoppingNeeds(def.recipeIds).map((n) => ({
    name: n.label, uses: n.uses.join(' · '), price: n.price, checked: true,
  }));
  const have = computeAlreadyHave(def.recipeIds);

  return { setName: def.name, buy, have, total: buy.reduce((s, it) => s + it.price, 0) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 가격 정보 (Prices) [2차 확장]
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/prices — 식자재 시세 (현재는 하드코딩, 이후 외부 API 연동) */
export function getPrices() {
  return {
    updatedAt: '2026.07.08 (화)',
    items: [
      { emoji: '🧅', name: '양파 1망 (1.5kg)',  avg: 3480, diff:  -120 },
      { emoji: '🥬', name: '대파 한단',          avg: 2850, diff:   300 },
      { emoji: '🥚', name: '계란 10구',          avg: 4190, diff:   -60 },
      { emoji: '🧊', name: '두부 1모',           avg: 1780, diff:    40 },
      { emoji: '🥩', name: '돼지 앞다리 100g',   avg: 1590, diff:   -90 },
      { emoji: '🥒', name: '애호박 1개',          avg: 1520, diff:   210 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API — 일주일 식단 루틴 (Meal Plan) [2차 확장]
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/meal-plan/candidates — 식단 선택용 레시피 카드 목록 */
export function getMealPlanCandidates() {
  return { items: recipeOrder.map((id) => ({ id, ...clone(recipes[id]) })) };
}

/**
 * POST /api/meal-plan/weekly — 선택한 2개 요리를 기준으로 6일 식단 생성
 *
 * @param {string[]} pickedIds - 사용자가 직접 고른 레시피 ID 2개
 */
export function buildWeeklyPlan(pickedIds) {
  if (!Array.isArray(pickedIds) || pickedIds.length !== 2) return null;

  const others = recipeOrder.filter((id) => !pickedIds.includes(id));
  const week   = new Array(6);

  week[1] = pickedIds[0]; // 화요일
  week[4] = pickedIds[1]; // 금요일
  [0, 2, 3, 5].forEach((slot, i) => { week[slot] = others[i % others.length]; }); // 월수목토

  return {
    days: week.map((id, i) => ({
      day:    dayLabels[i],
      recipe: { id, ...clone(recipes[id]) },
      picked: pickedIds.includes(id),
    })),
  };
}

/**
 * POST /api/meal-plan/shopping-list — 주간 식단 기준 부족 재료 쇼핑 목록
 *
 * @param {string[]} weekPlanIds - 주간 식단에 포함된 레시피 ID 배열
 */
export function getMealShoppingList(weekPlanIds) {
  const items = computeShoppingNeeds(weekPlanIds);
  return { items, total: items.reduce((s, it) => s + it.price, 0) };
}
