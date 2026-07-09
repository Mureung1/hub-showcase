// 인메모리 "DB" — 실제 Postgres/Supabase로 교체하기 전까지 재고/영수증 상태를 들고 있는 계층.
// 여기 함수들은 컨트롤러에서 호출하는 "DB 질의" 자리를 대신한다. 나중에 실제 DB를 붙일 때는
// 이 파일의 함수 내부만 SQL/쿼리 호출로 바꾸면 되고, 컨트롤러는 그대로 둘 수 있게 짰다.
import { initialFridge } from './data/initialFridge.js';
import { recipeOrder, recipes } from './data/recipes.js';
import { mealPriceTable, dayLabels } from './data/mealPrices.js';
import {
  ingHave, ingName, recipeHasImminentBadge, imminentIds,
} from './logic/fridgeLogic.js';

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
  const n = parseInt(label.slice(2), 10);
  return label.startsWith('D-') ? n : -n;
}

let fridge = clone(initialFridge);
const receipts = {};
let nextReceiptId = 1;

export function getFridge() {
  return clone(fridge);
}

export function addFridgeItem({ name, quantityLabel, purchasedAt, expiryDate }) {
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

export function updateFridgeItem(id, patch) {
  if (!fridge[id]) return null;
  fridge[id] = { ...fridge[id], ...patch };
  return clone(fridge[id]);
}

export function deleteFridgeItem(id) {
  if (!fridge[id]) return false;
  delete fridge[id];
  return true;
}

export function createReceipt() {
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

export function confirmReceipt(receiptId, { expiryOverrides = {} } = {}) {
  const record = receipts[receiptId];
  if (!record) return null;

  record.items.filter((it) => it.matched).forEach((it) => {
    const id = it.matchedIngredientId;
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

export function listRecipes({ filter = 'all', level = 'all' } = {}) {
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

export function getRecipeDetail(id) {
  const r = recipes[id];
  if (!r) return null;
  return {
    id,
    ...clone(r),
    ingredients: r.ingredients.map((ing) => ({ ...ing, have: ingHave(fridge, ing), name: ingName(fridge, ing) })),
    addons: r.addons.map((a) => ({ ...a, fridgeInfo: clone(fridge[a.id]) })),
  };
}

export function cookDone(recipeId, deductions) {
  const results = deductions.map(({ id, use }) => {
    const f = fridge[id];
    const before = f.levels[f.level];
    const afterIdx = Math.min(f.level + use, f.levels.length - 1);
    if (use > 0) fridge[id] = { ...f, level: afterIdx };
    return { id, name: f.name, emoji: f.emoji, before, after: fridge[id].levels[afterIdx] };
  });
  return { results, fridge: clone(fridge) };
}

export function getExpiryAlerts() {
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

export function getShoppingSets() {
  return {
    sets: [
      { id: 'basic', name: '알뜰 기본 세트', badge: '추천', level: null, buyCount: 6, dishCount: 5, dishes: '제육볶음 · 두부조림 · 된장찌개 · 계란찜 · 김치찌개', total: 21400 },
      { id: 'quick3', name: '초간단 3일 세트', badge: null, level: null, buyCount: 4, dishCount: 3, dishes: '김치볶음밥 · 계란말이 · 두부부침', total: 11200 },
      { id: 'week', name: '한주 든든 세트', badge: null, level: '🟡 중급', buyCount: 9, dishCount: 7, dishes: '닭볶음탕 · 카레 · 된장찌개 외 4가지', total: 31800 },
    ],
  };
}

export function getShoppingList() {
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

export function getPrices() {
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

export function getMealPlanCandidates() {
  return { items: recipeOrder.map((id) => ({ id, ...clone(recipes[id]) })) };
}

export function buildWeeklyPlan(pickedIds) {
  if (!Array.isArray(pickedIds) || pickedIds.length !== 2) return null;
  const others = recipeOrder.filter((id) => !pickedIds.includes(id));
  const week = new Array(6);
  week[1] = pickedIds[0]; // 화
  week[4] = pickedIds[1]; // 금
  [0, 2, 3, 5].forEach((slot, i) => { week[slot] = others[i % others.length]; }); // 월수목토
  return {
    days: week.map((id, i) => ({ day: dayLabels[i], recipe: { id, ...clone(recipes[id]) }, picked: pickedIds.includes(id) })),
  };
}

export function getMealShoppingList(weekPlanIds) {
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
