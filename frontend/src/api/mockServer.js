/**
 * @file mockServer.js
 * @description FE 전용 인메모리 Mock 서버.
 *
 * ## 역할
 * 실제 Express 백엔드 없이 UI 를 개발·테스트할 때 사용합니다.
 * api/index.js 에서 import 대상을 바꾸면 실서버 ↔ mock 전환이 가능합니다.
 *
 * ## 구조
 * backend/src/store.js 의 로직을 FE 환경에 맞게 그대로 옮긴 것입니다.
 * 두 파일의 비즈니스 로직(enrichFridgeItem, confirmReceipt 등)은 동일하게 유지합니다.
 * 차이점은 각 함수에 네트워크 지연을 흉내내는 `await delay()` 가 붙는다는 점뿐입니다.
 *
 * ## 공통 데이터 소스
 * - ingredients.js  : 재료 마스터 (BE 버전과 동일)
 * - initialFridge.js: 초기 재고 시드 (BE 버전과 동일)
 * - recipes.js      : 레시피 데이터
 * - fridgeLogic.js  : 순수 함수 유틸리티
 */

import { initialFridge } from '../data/initialFridge';
import { ingredientMap, calcExpiryDate } from '../data/ingredients';
import { recipeOrder, recipes } from '../data/recipes';
import { mealPriceTable, dayLabels } from '../data/mealPrices';
import { ingHave, ingName, recipeHasImminentBadge, imminentIds } from '../logic/fridgeLogic';

// ─────────────────────────────────────────────────────────────────────────────
// 네트워크 지연 시뮬레이션
// ─────────────────────────────────────────────────────────────────────────────

const NETWORK_DELAY_MS = 220;
const delay = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (obj) => JSON.parse(JSON.stringify(obj));

// ─────────────────────────────────────────────────────────────────────────────
// 날짜 유틸리티
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 데모 스토리 안의 "오늘" — 영수증 인식 화면의 2026.07.08 과 맞춘 고정 기준일.
 * TODO: 실서비스 전환 시 `new Date()` 로 교체하세요.
 */
const TODAY = new Date('2026-07-08T00:00:00');

function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDday(dateStr) {
  const diff = Math.round((new Date(dateStr) - TODAY) / 86_400_000);
  return diff >= 0 ? `D-${diff}` : `D+${-diff}`;
}

function ddayValue(label) {
  const n = parseInt(label.slice(2), 10);
  return label.startsWith('D-') ? n : -n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 인메모리 "DB" 상태
// ─────────────────────────────────────────────────────────────────────────────

let fridge = clone(initialFridge);
const receipts = {};
let nextReceiptId = 1;

// ─────────────────────────────────────────────────────────────────────────────
// 재고 합산 (마스터 + 재고 상태 → UI 렌더링 객체)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 단일 재고 항목에 마스터 정보를 합쳐 FE 렌더링에 필요한 완성된 객체를 반환합니다.
 * (store.js 의 enrichFridgeItem 과 동일한 로직)
 */
function enrichFridgeItem(id, stock) {
  const master = ingredientMap[id];
  if (!master) return { id, ...stock };

  if (master.category === 'fresh') {
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

function buildFridgeView() {
  return Object.fromEntries(
    Object.entries(fridge).map(([id, stock]) => [id, enrichFridgeItem(id, stock)]),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock API — 냉장고 (Fridge)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/fridge
export async function getFridge() {
  await delay();
  return clone(buildFridgeView());
}

// POST /api/fridge
export async function addFridgeItem({ name, quantityLabel, purchasedAt, expiryDate }) {
  await delay();
  const id     = `custom_${Date.now()}`;
  const expiry = formatDday(expiryDate);

  fridge[id] = {
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

// PATCH /api/fridge/:id
export async function updateFridgeItem(id, patch) {
  await delay();
  if (!fridge[id]) throw new Error(`404: fridge item ${id} not found`);
  fridge[id] = { ...fridge[id], ...patch };
  return clone(enrichFridgeItem(id, fridge[id]));
}

// DELETE /api/fridge/:id
export async function deleteFridgeItem(id) {
  await delay();
  if (!fridge[id]) throw new Error(`404: fridge item ${id} not found`);
  delete fridge[id];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock API — 영수증 (Receipts)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/receipts  (OCR 외부 API 호출 지연을 더 길게 흉내냄)
export async function uploadReceipt() {
  await delay(500);
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

// POST /api/receipts/:id/confirm
export async function confirmReceipt(receiptId, { expiryOverrides = {} } = {}) {
  await delay();
  const record = receipts[receiptId];
  if (!record) throw new Error(`404: receipt ${receiptId} not found`);

  record.items
    .filter((it) => it.matched && it.matchedIngredientId)
    .forEach((it) => {
      const { matchedIngredientId: id, quantityLabel, category } = it;
      const master = ingredientMap[id];

      // 유통기한 결정 우선순위: 사용자 보정 → 마스터 자동계산 → 기존 값 → 폴백
      const rawExpiry = expiryOverrides[id] ?? calcExpiryDate(id, '2026-07-08') ?? null;
      const expiry    = rawExpiry ? formatDday(rawExpiry) : (fridge[id]?.expiry ?? 'D-5');

      if (fridge[id]) {
        fridge[id] = {
          ...fridge[id],
          level:     fridge[id].level !== undefined ? 0 : undefined,
          purchased: formatMD('2026-07-08'),
          expiry,
          imminent:  ddayValue(expiry) <= 2,
        };
      } else if (master) {
        fridge[id] = category === 'fresh'
          ? { level: 0, purchased: formatMD('2026-07-08'), expiry, imminent: ddayValue(expiry) <= 2 }
          : { qtyLabel: quantityLabel ?? '1개', expiryLabel: null };
      }
    });

  record.status = 'confirmed';
  return clone(buildFridgeView());
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock API — 레시피 (Recipes)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/recipes?filter=&level=
export async function getRecipes({ filter = 'all', level = 'all' } = {}) {
  await delay();
  const view = buildFridgeView();

  const rows = recipeOrder.map((id) => {
    const r     = recipes[id];
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
      missing:       r.ingredients.filter((ing) => !ingHave(view, ing)).map((ing) => ingName(view, ing)),
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

// GET /api/recipes/:id
export async function getRecipeDetail(id) {
  await delay();
  const r = recipes[id];
  if (!r) throw new Error(`404: recipe ${id} not found`);

  const view = buildFridgeView();
  return {
    id,
    ...clone(r),
    ingredients: r.ingredients.map((ing) => ({ ...ing, have: ingHave(view, ing), name: ingName(view, ing) })),
    addons:      r.addons.map((a)   => ({ ...a,   fridgeInfo: clone(view[a.id]) })),
  };
}

// POST /api/recipes/:id/cook-done
export async function cookDone(recipeId, { deductions }) {
  await delay();
  const view = buildFridgeView();

  const results = deductions.map(({ id, use }) => {
    const current  = view[id];
    const before   = current.levels[current.level];
    const afterIdx = Math.min(current.level + use, current.levels.length - 1);

    if (use > 0) fridge[id] = { ...fridge[id], level: afterIdx };

    return { id, name: current.name, emoji: current.emoji, before, after: current.levels[afterIdx] };
  });

  return { results, fridge: clone(buildFridgeView()) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock API — 유통기한 알림 (Expiry Alerts)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/fridge/alerts
export async function getExpiryAlerts() {
  await delay();
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
// Mock API — 장보기 (Shopping)
// ─────────────────────────────────────────────────────────────────────────────

// (store.js와 동일한 세트 정의 — 실제 recipes.js에 있는 레시피 id만 참조한다)
const SHOPPING_SET_DEFS = [
  { id: 'basic',  name: '알뜰 기본 세트', badge: '추천', level: null,      matchType: 'maxVariety',  setLevel: 'beginner', recipeIds: ['jeyuk-bokkeum', 'tofu-braise', 'kimchi-jjigae', 'egg-steam'] },
  { id: 'quick3', name: '초간단 3일 세트', badge: null,   level: null,      matchType: 'complete100', setLevel: 'beginner', recipeIds: ['kimchi-fried-rice', 'egg-roll', 'tofu-pan'] },
  { id: 'week',   name: '한주 든든 세트',  badge: null,   level: '🟡 중급', matchType: 'maxVariety',  setLevel: 'mid',      recipeIds: ['pajeon', 'omelette', 'jeyuk-bokkeum', 'kimchi-pork-jjim'] },
];

// 레시피 id 목록 → 냉장고에 없어서 사야 하는 재료 목록 (store.js의 computeShoppingNeeds와 동일 로직)
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

// 레시피 id 목록 기준으로 이미 냉장고에 있는 재료 목록
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

// GET /api/shopping/sets?match=&level=
export async function getShoppingSets({ match = 'all', level = 'all' } = {}) {
  await delay();
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

// GET /api/shopping/list?setId=
export async function getShoppingList(setId) {
  await delay();
  const def = SHOPPING_SET_DEFS.find((s) => s.id === setId) ?? SHOPPING_SET_DEFS[0];
  const buy = computeShoppingNeeds(def.recipeIds).map((n) => ({
    name: n.label, uses: n.uses.join(' · '), price: n.price, checked: true,
  }));
  const have = computeAlreadyHave(def.recipeIds);
  return { setName: def.name, buy, have, total: buy.reduce((s, it) => s + it.price, 0) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock API — 가격 정보 (Prices) [2차 확장]
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/prices
export async function getPrices() {
  await delay();
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
// Mock API — 일주일 식단 루틴 (Meal Plan) [2차 확장]
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/meal-plan/candidates
export async function getMealPlanCandidates() {
  await delay();
  return { items: recipeOrder.map((id) => ({ id, ...clone(recipes[id]) })) };
}

// POST /api/meal-plan/weekly
export async function buildWeeklyPlan(pickedIds) {
  await delay();
  if (pickedIds.length !== 2) throw new Error('400: pickedIds must have exactly 2 items');

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

// POST /api/meal-plan/shopping-list
export async function getMealShoppingList(weekPlanIds) {
  await delay();
  const items = computeShoppingNeeds(weekPlanIds);
  return { items, total: items.reduce((s, it) => s + it.price, 0) };
}
