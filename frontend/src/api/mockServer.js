// ── Mock BE + DB ──────────────────────────────────────────────────────────
// docs/api-design.md에서 설계한 엔드포인트를 실제 fetch() 대신 인메모리로 구현한 것.
// 각 함수의 시그니처와 반환 모양은 실제 API와 동일하게 맞춰서, 나중에 Express 서버가
// 생기면 이 파일만 fetch(`/api/...`) 호출로 교체하면 되도록 만들었다.
import { initialFridge } from '../data/initialFridge';
import { recipeOrder, recipes } from '../data/recipes';
import { mealPriceTable, dayLabels } from '../data/mealPrices';
import {
  fridgeAvailable, ingHave, ingName, recipeRatio, recipeHasImminentBadge, imminentIds,
} from '../logic/fridgeLogic';

const NETWORK_DELAY_MS = 220;
const delay = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (obj) => JSON.parse(JSON.stringify(obj));

// 데모 스토리 안의 "오늘" — 영수증 인식 화면의 2026.07.08과 맞춘 고정 기준일.
const TODAY = new Date('2026-07-08T00:00:00');
function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function formatDday(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.round((d - TODAY) / 86400000);
  return diff >= 0 ? `D-${diff}` : `D+${-diff}`;
}
function ddayValue(label) {
  // label은 "D-9"(9일 남음) 또는 "D+3"(3일 지남) 형태 — 앞의 부호 문자까지 잘라내고 읽어야 한다.
  // (label.replace('D','')로만 자르면 부호가 살아남아 parseInt가 이미 음수를 반환해 부호가 이중으로 반전된다.)
  const n = parseInt(label.slice(2), 10);
  return label.startsWith('D-') ? n : -n;
}

// ── "DB" 상태 ───────────────────────────────────────────────────────────
let fridge = clone(initialFridge);
const receipts = {}; // id -> { id, status, items }
let nextReceiptId = 1;

// ── GET /api/fridge ───────────────────────────────────────────────────────
export async function getFridge() {
  await delay();
  return clone(fridge);
}

// ── POST /api/fridge ──────────────────────────────────────────────────────
export async function addFridgeItem({ name, quantityLabel, purchasedAt, expiryDate }) {
  await delay();
  const id = `custom_${Date.now()}`;
  const expiry = formatDday(expiryDate);
  fridge[id] = {
    emoji: '🥗',
    name,
    category: 'fresh',
    levels: [quantityLabel, '소진'],
    level: 0,
    purchased: formatMD(purchasedAt),
    expiry,
    imminent: ddayValue(expiry) <= 2,
    role: '사용자가 직접 추가한 재료예요.',
    tip: '일반적인 보관 방법(냉장·밀폐)을 따르면 돼요.',
  };
  return clone(fridge[id]);
}

// ── PATCH /api/fridge/:id ─────────────────────────────────────────────────
export async function updateFridgeItem(id, patch) {
  await delay();
  if (!fridge[id]) throw new Error(`404: fridge item ${id} not found`);
  fridge[id] = { ...fridge[id], ...patch };
  return clone(fridge[id]);
}

// ── DELETE /api/fridge/:id ────────────────────────────────────────────────
export async function deleteFridgeItem(id) {
  await delay();
  if (!fridge[id]) throw new Error(`404: fridge item ${id} not found`);
  delete fridge[id];
}

// ── POST /api/receipts ────────────────────────────────────────────────────
export async function uploadReceipt() {
  await delay(500); // OCR 외부 API 호출을 흉내내는 더 긴 지연
  const id = `r_${nextReceiptId++}`;
  const record = {
    id,
    store: '이마트 신촌점',
    date: '2026.07.08',
    status: 'partial',
    items: [
      { rawText: '양파(1.5kg/망)', matchedIngredientId: 'onion', quantityLabel: '3쪽', category: 'fresh', matched: true },
      { rawText: '돈앞다리수육용300G', matchedIngredientId: 'pork', quantityLabel: '300g', category: 'fresh', matched: true },
      { rawText: '풀무원국산콩두부', matchedIngredientId: 'tofu', quantityLabel: '1모', category: 'fresh', matched: true },
      { rawText: '스팸클래식200G', matchedIngredientId: 'spam', quantityLabel: '200g', category: 'processed', matched: true, isNew: true },
      { rawText: '(흐릿함)', matchedIngredientId: null, quantityLabel: null, category: null, matched: false },
    ],
  };
  receipts[id] = record;
  return clone(record);
}

// ── POST /api/receipts/:id/confirm ───────────────────────────────────────
export async function confirmReceipt(receiptId, { expiryOverrides = {} } = {}) {
  await delay();
  const record = receipts[receiptId];
  if (!record) throw new Error(`404: receipt ${receiptId} not found`);

  record.items.filter((it) => it.matched).forEach((it) => {
    const id = it.matchedIngredientId;
    // expiryOverrides는 FE의 <input type=date>에서 온 ISO 날짜 문자열 — 여기서 D-day로 변환한다.
    const expiry = expiryOverrides[id] ? formatDday(expiryOverrides[id]) : (fridge[id] ? fridge[id].expiry : 'D-5');
    if (fridge[id]) {
      fridge[id] = {
        ...fridge[id],
        level: 0,
        purchased: formatMD('2026-07-08'),
        expiry,
        imminent: ddayValue(expiry) <= 2,
      };
    } else if (id === 'spam') {
      fridge.spam = {
        emoji: '🥫', name: '스팸', category: 'processed', qtyLabel: '1개', expiryLabel: null,
        role: '짭짤한 감칠맛을 더하는 가공육이에요. 볶음밥·찌개에 넣으면 든든해져요.',
        tip: '개봉 전엔 상온 보관 가능하고, 개봉 후에는 밀폐용기에 담아 냉장 보관하며 2~3일 안에 드세요.',
      };
    }
  });
  record.status = 'confirmed';
  return clone(fridge);
}

// ── GET /api/recipes?filter=&level= ──────────────────────────────────────
export async function getRecipes({ filter = 'all', level = 'all' } = {}) {
  await delay();
  const rows = recipeOrder.map((id) => {
    const r = recipes[id];
    const have = r.ingredients.filter((ing) => ingHave(fridge, ing)).length;
    const total = r.ingredients.length;
    return {
      id,
      name: r.name,
      emoji: r.emoji,
      level: r.level,
      levelLabel: r.levelLabel,
      time: r.time,
      have,
      total,
      full: have === total,
      few: total <= 4,
      imminentBadge: recipeHasImminentBadge(fridge, recipes, id),
      missing: r.ingredients.filter((ing) => !ingHave(fridge, ing)).map((ing) => ingName(fridge, ing)),
    };
  });
  const filtered = rows.filter((r) => {
    let ok = true;
    if (filter === 'full') ok = r.full;
    if (filter === 'few') ok = r.few;
    if (ok && level !== 'all') ok = r.level === level;
    return ok;
  });
  return { items: filtered, total: filtered.length };
}

// ── GET /api/recipes/:id ──────────────────────────────────────────────────
export async function getRecipeDetail(id) {
  await delay();
  const r = recipes[id];
  if (!r) throw new Error(`404: recipe ${id} not found`);
  return {
    id,
    ...clone(r),
    ingredients: r.ingredients.map((ing) => ({ ...ing, have: ingHave(fridge, ing), name: ingName(fridge, ing) })),
    addons: r.addons.map((a) => ({ ...a, fridgeInfo: clone(fridge[a.id]) })),
  };
}

// ── POST /api/recipes/:id/cook-done ──────────────────────────────────────
export async function cookDone(recipeId, { deductions }) {
  await delay();
  const results = deductions.map(({ id, use }) => {
    const f = fridge[id];
    const before = f.levels[f.level];
    const afterIdx = Math.min(f.level + use, f.levels.length - 1);
    if (use > 0) fridge[id] = { ...f, level: afterIdx };
    return { id, name: f.name, emoji: f.emoji, before, after: fridge[id].levels[afterIdx] };
  });
  return { results, fridge: clone(fridge) };
}

// ── GET /api/fridge/alerts ────────────────────────────────────────────────
export async function getExpiryAlerts() {
  await delay();
  const ids = imminentIds(fridge);
  const relatedRecipeIds = recipeOrder.filter((rid) => recipes[rid].ingredients.some((ing) => ing.id && ids.includes(ing.id)));
  return {
    items: ids.map((id) => ({ id, ...clone(fridge[id]) })),
    relatedRecipes: relatedRecipeIds.map((rid) => ({
      id: rid,
      ...clone(recipes[rid]),
      usedNames: recipes[rid].ingredients.filter((ing) => ing.id && ids.includes(ing.id)).map((ing) => fridge[ing.id].name),
    })),
  };
}

// ── GET /api/shopping-sets ────────────────────────────────────────────────
export async function getShoppingSets() {
  await delay();
  return {
    sets: [
      { id: 'basic', name: '알뜰 기본 세트', badge: '추천', level: null, buyCount: 6, dishCount: 5, dishes: '제육볶음 · 두부조림 · 된장찌개 · 계란찜 · 김치찌개', total: 21400 },
      { id: 'quick3', name: '초간단 3일 세트', badge: null, level: null, buyCount: 4, dishCount: 3, dishes: '김치볶음밥 · 계란말이 · 두부부침', total: 11200 },
      { id: 'week', name: '한주 든든 세트', badge: null, level: '🟡 중급', buyCount: 9, dishCount: 7, dishes: '닭볶음탕 · 카레 · 된장찌개 외 4가지', total: 31800 },
    ],
  };
}

// ── GET /api/shopping-sets/:id/items ──────────────────────────────────────
export async function getShoppingList() {
  await delay();
  const buy = [
    { name: '돼지고기 앞다리 300g', uses: '제육볶음 · 된장찌개', price: 6900, checked: true },
    { name: '두부 1모', uses: '두부조림 · 된장찌개', price: 1800, checked: true },
    { name: '고추장 소형', uses: '제육볶음', price: 3400, checked: false },
    { name: '된장 소형', uses: '된장찌개', price: 3200, checked: false },
    { name: '애호박 1개', uses: '된장찌개', price: 1500, checked: false },
    { name: '참기름 소형', uses: '김치볶음밥', price: 4600, checked: false },
  ];
  const have = [
    { name: '양파', note: '냉장고에 있음 (반쪽)' },
    { name: '대파', note: '냉장고에 있음 (한단)' },
    { name: '계란', note: '냉장고에 있음 (6알)' },
  ];
  const total = buy.reduce((sum, it) => sum + it.price, 0);
  return { setName: '알뜰 기본 세트', buy, have, total };
}

// ── GET /api/prices ────────────────────────────────────────────────────────
export async function getPrices() {
  await delay();
  return {
    updatedAt: '2026.07.08 (화)',
    items: [
      { emoji: '🧅', name: '양파 1망 (1.5kg)', avg: 3480, diff: -120 },
      { emoji: '🥬', name: '대파 한단', avg: 2850, diff: 300 },
      { emoji: '🥚', name: '계란 10구', avg: 4190, diff: -60 },
      { emoji: '🧊', name: '두부 1모', avg: 1780, diff: 40 },
      { emoji: '🥩', name: '돼지 앞다리 100g', avg: 1590, diff: -90 },
      { emoji: '🥒', name: '애호박 1개', avg: 1520, diff: 210 },
    ],
  };
}

// ── GET /api/meal-plan/candidates (선택용 레시피 카드) ────────────────────
export async function getMealPlanCandidates() {
  await delay();
  return { items: recipeOrder.map((id) => ({ id, ...clone(recipes[id]) })) };
}

// ── POST /api/meal-plan/weekly ─────────────────────────────────────────────
export async function buildWeeklyPlan(pickedIds) {
  await delay();
  if (pickedIds.length !== 2) throw new Error('400: pickedIds must have exactly 2 items');
  const others = recipeOrder.filter((id) => !pickedIds.includes(id));
  const week = new Array(6);
  week[1] = pickedIds[0]; // 화
  week[4] = pickedIds[1]; // 금
  [0, 2, 3, 5].forEach((slot, i) => { week[slot] = others[i % others.length]; }); // 월수목토
  return {
    days: week.map((id, i) => ({ day: dayLabels[i], recipe: { id, ...clone(recipes[id]) }, picked: pickedIds.includes(id) })),
  };
}

// ── GET /api/meal-plan/shopping-list ───────────────────────────────────────
export async function getMealShoppingList(weekPlanIds) {
  await delay();
  const need = {};
  weekPlanIds.forEach((id) => {
    recipes[id].ingredients.forEach((ing) => {
      if (ing.untracked) return;
      if (ingHave(fridge, ing)) return;
      const key = ing.id || ing.name;
      if (!need[key]) need[key] = { label: ingName(fridge, ing), price: mealPriceTable[key] || 3000, uses: [] };
      if (!need[key].uses.includes(recipes[id].name)) need[key].uses.push(recipes[id].name);
    });
  });
  const items = Object.values(need);
  return { items, total: items.reduce((sum, it) => sum + it.price, 0) };
}
