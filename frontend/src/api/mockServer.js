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

import { initialFridge } from '../data/initialFridge.js';
import { ingredientMap, calcExpiryDate, getSeason } from '../data/ingredients.js';
import { recipeOrder, recipes } from '../data/recipes.js';
import { mealPriceTable, dayLabels } from '../data/mealPrices.js';
import { ingHave, ingName, recipeHasImminentBadge, imminentIds, parseAmt, formatAmtText } from '../logic/fridgeLogic.js';

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

function enrichFridgeItem(id, stock) {
  const master = ingredientMap[id];
  
  if (!master) {
    if (stock.items) {
       const total = stock.items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
       const unit = stock.items[0]?.qtyUnit || '';
       const earliest = stock.items.slice().sort((a, b) => {
         const da = a.expiry ? ddayValue(a.expiry) : 999;
         const db = b.expiry ? ddayValue(b.expiry) : 999;
         return da - db;
       })[0];
       return {
         id,
         ...stock,
         qtyLabel: total > 0 ? `${total}${unit}` : stock.items[0]?.qtyLabel,
         purchased: earliest?.purchased,
         expiry: earliest?.expiry,
         imminent: stock.items.some(it => it.imminent)
       };
    }
    return { id, ...stock };
  }

  if (stock.items) {
    const total = stock.items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
    const unit = stock.items[0]?.qtyUnit || '';
    const isFresh = master.category === 'fresh';
    const qtyLabel = isFresh ? `${total}${unit}` : (stock.items[0]?.qtyLabel || '');
    
    const earliest = stock.items.slice().sort((a, b) => {
      const da = a.expiry ? ddayValue(a.expiry) : 999;
      const db = b.expiry ? ddayValue(b.expiry) : 999;
      return da - db;
    })[0];

    return {
      id,
      emoji: master.emoji,
      name: master.name,
      category: master.category,
      items: stock.items,
      qtyLabel,
      purchased: earliest?.purchased,
      expiry: earliest?.expiry,
      imminent: stock.items.some(it => it.imminent),
      role: master.role,
      tip: master.tip,
      isFresh
    };
  }
  
  return { id, ...stock, name: master.name, emoji: master.emoji, category: master.category, isFresh: master.category === 'fresh' };
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

export function addFridgeItem({ ingredientId, name, quantityLabel, purchasedAt, expiryDate }) {
  const match = quantityLabel ? quantityLabel.match(/^([\d.]+)(.*)$/) : null;
  let qtyAmount = match ? parseFloat(match[1]) : 1;
  let qtyUnit = match ? match[2].trim() : quantityLabel;

  if (ingredientId === 'pork' && qtyUnit === '근') {
    qtyAmount *= 600;
    qtyUnit = 'g';
  }

  if (ingredientId) {
    const master = ingredientMap[ingredientId];
    if (!master) {
      throw Object.assign(new Error(`addFridgeItem: unknown ingredientId "${ingredientId}"`), { status: 400 });
    }

    const rawExpiry = expiryDate || calcExpiryDate(ingredientId, purchasedAt);
    const expiry = formatDday(rawExpiry);
    const imminent = ddayValue(expiry) <= 2;
    
    const newItem = master.category === 'fresh' 
      ? { qtyAmount, qtyUnit: qtyUnit || '개', purchased: formatMD(purchasedAt), expiry, imminent }
      : { qtyLabel: quantityLabel, purchased: formatMD(purchasedAt), expiry: expiryDate ? formatDday(expiryDate) : null, imminent: false };

    if (!fridge[ingredientId]) fridge[ingredientId] = { items: [] };
    fridge[ingredientId].items.push(newItem);

    return clone(enrichFridgeItem(ingredientId, fridge[ingredientId]));
  }

  if (!name || !expiryDate) {
    throw Object.assign(new Error('addFridgeItem: name, expiryDate가 필요해요.'), { status: 400 });
  }
  const id = `custom_${Date.now()}`;
  const expiry = formatDday(expiryDate);
  fridge[id] = {
    emoji: '🥗',
    name,
    category: 'fresh',
    role: '사용자가 직접 추가한 재료예요.',
    tip: '일반적인 보관 방법(냉장·밀폐)을 따르면 돼요.',
    items: [
      { qtyAmount, qtyUnit: qtyUnit || '개', purchased: formatMD(purchasedAt), expiry, imminent: ddayValue(expiry) <= 2 }
    ]
  };

  return clone(enrichFridgeItem(id, fridge[id]));
}

export function updateFridgeItem(id, patch) {
  const current = fridge[id];
  if (!current) return null;

  if (patch.deleteItemIndex !== undefined && current.items) {
    current.items.splice(patch.deleteItemIndex, 1);
    if (current.items.length === 0) {
      delete fridge[id];
      return null;
    }
    return clone(enrichFridgeItem(id, fridge[id]));
  }

  if (patch.itemIndex !== undefined && current.items && current.items[patch.itemIndex]) {
    const item = current.items[patch.itemIndex];
    if (patch.qtyAmount !== undefined) item.qtyAmount = patch.qtyAmount;
    if (patch.qtyUnit !== undefined) item.qtyUnit = patch.qtyUnit;
    if (patch.qtyLabel !== undefined) item.qtyLabel = patch.qtyLabel;
    
    if (patch.expiryDate !== undefined) {
      if (patch.expiryDate) {
        item.expiry = formatDday(patch.expiryDate);
        item.imminent = ddayValue(item.expiry) <= 2;
      } else {
        item.expiry = null;
        item.imminent = false;
      }
    }
  }

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
export function uploadReceipt() {
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

export function confirmReceipt(receiptId, { expiryOverrides = {} } = {}) {
  const record = receipts[receiptId];
  if (!record) return null;

  record.items
    .filter((it) => it.matched && it.matchedIngredientId)
    .forEach((it) => {
      const { matchedIngredientId: id, quantityLabel, category } = it;
      const master = ingredientMap[id];

      const rawExpiry = expiryOverrides[id] ?? calcExpiryDate(id, '2026-07-08') ?? null;
      const expiry = rawExpiry ? formatDday(rawExpiry) : 'D-5';
      const imminent = ddayValue(expiry) <= 2;

      const match = quantityLabel ? quantityLabel.match(/^([\d.]+)(.*)$/) : null;
      const qtyAmount = match ? parseFloat(match[1]) : 1;
      const qtyUnit = match ? match[2].trim() : quantityLabel;

      if (!fridge[id] || !fridge[id].items) {
        fridge[id] = { items: [] };
      }

      if (category === 'fresh' || (master && master.category === 'fresh')) {
        fridge[id].items.push({
          qtyAmount,
          qtyUnit: qtyUnit || '개',
          purchased: formatMD('2026-07-08'),
          expiry,
          imminent
        });
      } else {
        fridge[id].items.push({
          qtyLabel: quantityLabel ?? '1개',
          purchased: formatMD('2026-07-08'),
          expiry: null,
          imminent: false
        });
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
export function getRecipes({ filter = 'all', level = 'all', category = 'all' } = {}) {
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
      category:      r.category,
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
    if (category !== 'all' && r.category !== category) return false;
    return true;
  });

  return { items: filtered, total: filtered.length };
}

/** GET /api/recipes/:id — 레시피 상세 (재료·애드온·조리 스텝) */
export function getRecipeDetail(id, multiplier = 1.0) {
  const r = recipes[id];
  if (!r) return null;

  const view = buildFridgeView();

  return {
    id,
    ...clone(r),
    ingredients: r.ingredients.map((ing) => {
      const parsed = parseAmt(ing.amt);
      // 반올림/분수 스냅은 formatAmtText 안에서만 한다 — 여기서 먼저 반올림하면 소금 0.2g 같은
      // 극소량이 formatAmtText에 닿기도 전에 날아간다 (backend/src/store.js와 동일한 이유).
      const requiredQty = parsed.val * multiplier;
      return {
        ...ing,
        amt: formatAmtText(requiredQty, parsed.isGram, ing.amt),
        have: ingHave(view, ing),
        name: ingName(view, ing),
      };
    }),
    addons: r.addons.map((a) => ({
      ...a,
      fridgeInfo: view[a.id] ? clone(view[a.id]) : null,
    })),
  };
}

export function cookDone(recipeId, deductions) {
  if (!recipes[recipeId]) {
    throw Object.assign(new Error(`cook-done: unknown recipe id "${recipeId}"`), { status: 400 });
  }

  const view = buildFridgeView();
  
  const results = deductions.map(({ id, use }) => {
    const current = view[id];
    const before = current.qtyLabel;
    
    if (use > 0 && fridge[id] && fridge[id].items) {
      // 선입선출 (유통기한 적은 것부터 우선 차감)
      fridge[id].items.sort((a, b) => {
        const da = a.expiry ? ddayValue(a.expiry) : 999;
        const db = b.expiry ? ddayValue(b.expiry) : 999;
        return da - db;
      });
      
      let remainingToDeduct = use;
      for (let i = 0; i < fridge[id].items.length && remainingToDeduct > 0; i++) {
        const item = fridge[id].items[i];
        if (item.qtyAmount) {
          if (item.qtyAmount <= remainingToDeduct) {
            remainingToDeduct -= item.qtyAmount;
            item.qtyAmount = 0;
          } else {
            item.qtyAmount -= remainingToDeduct;
            remainingToDeduct = 0;
          }
        } else {
           // 가공식품이거나 qtyAmount가 없는 경우 차감 방식 생략 (수동 관리)
           remainingToDeduct = 0;
        }
      }
      
      // qtyAmount가 0이 된 항목 제거
      fridge[id].items = fridge[id].items.filter(it => it.qtyAmount === undefined || it.qtyAmount > 0);
      
      if (fridge[id].items.length === 0) {
         delete fridge[id];
      }
    }
    
    const afterView = fridge[id] ? enrichFridgeItem(id, fridge[id]) : { qtyLabel: '소진' };
    
    return {
      id,
      name: current.name,
      emoji: current.emoji,
      before,
      after: afterView.qtyLabel || '소진',
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

// 레시피 목록을 받아 누적 부족 재료와 필요 재료를 계산하는 함수
function calculateCumulativeNeeds(recipeIds, multiplier = 1.0) {
  const view = buildFridgeView();
  const haveMap = {}; // 이미 보유중인 수량 (차감용 복사본)

  // 냉장고 실제 총량 복사
  Object.keys(view).forEach(id => {
    if (view[id].items) {
      haveMap[id] = view[id].items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
    } else {
      haveMap[id] = 1; // 기본 1개로 취급
    }
  });

  const buyList = {};
  const alreadyHaveList = {};

  recipeIds.forEach(id => {
    recipes[id].ingredients.forEach(ing => {
      if (ing.untracked) return;

      const key = ing.id || ing.name;
      const parsed = parseAmt(ing.amt);
      const isGram = parsed.isGram;
      // getRecipeDetail과 동일하게, 반올림은 formatAmtText 호출 시점(최종 표시 직전)에만 한다.
      const requiredQty = parsed.val * multiplier;

      if (ing.id && view[ing.id]) {
        // 냉장고에 있는 재료
        if (haveMap[ing.id] >= requiredQty) {
          // 수량 충분
          haveMap[ing.id] -= requiredQty;
          
          if (!alreadyHaveList[key]) alreadyHaveList[key] = { label: ingName(view, ing), uses: [], qty: 0 };
          if (!alreadyHaveList[key].uses.includes(recipes[id].name)) alreadyHaveList[key].uses.push(recipes[id].name);
          alreadyHaveList[key].qty += requiredQty;
        } else {
          // 수량 부족 (일부는 냉장고에서, 일부는 구매)
          const shortfall = requiredQty - (haveMap[ing.id] || 0);
          
          if (haveMap[ing.id] > 0) {
            if (!alreadyHaveList[key]) alreadyHaveList[key] = { label: ingName(view, ing), uses: [], qty: 0 };
            if (!alreadyHaveList[key].uses.includes(recipes[id].name)) alreadyHaveList[key].uses.push(recipes[id].name);
            alreadyHaveList[key].qty += haveMap[ing.id];
          }

          haveMap[ing.id] = 0; // 모두 소진

          if (!buyList[key]) buyList[key] = { label: ingName(view, ing), price: mealPriceTable[key] ?? 3000, uses: [], qty: 0, isGram, originalAmt: ing.amt };
          if (!buyList[key].uses.includes(recipes[id].name)) buyList[key].uses.push(recipes[id].name);
          buyList[key].qty += shortfall;
        }
      } else {
        // 냉장고에 아예 없는 재료
        if (!buyList[key]) buyList[key] = { label: ingName(view, ing), price: mealPriceTable[key] ?? 3000, uses: [], qty: 0, isGram, originalAmt: ing.amt };
        if (!buyList[key].uses.includes(recipes[id].name)) buyList[key].uses.push(recipes[id].name);
        buyList[key].qty += requiredQty;
      }
    });
  });

  const needs = Object.values(buyList).map(n => {
    // g 단위 식재료(돼지고기 등)는 1근(600g) 단위로 팩을 산다고 가정하고 가격 계산
    const buyMultiplier = n.isGram ? Math.ceil(n.qty / 600) : Math.ceil(n.qty);
    return {
      label: n.label,
      price: n.price * buyMultiplier,
      uses: n.uses,
      qty: n.qty,
      isGram: n.isGram,
      originalAmt: n.originalAmt
    };
  });
  
  const have = Object.values(alreadyHaveList).map(n => ({
    name: n.label,
    note: `냉장고 누적 소진 (${Math.round(n.qty * 10) / 10}단위)`,
  }));

  return { needs, have, totalCost: needs.reduce((sum, it) => sum + it.price, 0) };
}

// 동적 세트 생성 헬퍼
function generateDynamicSets(pickedIds = []) {
  const view = buildFridgeView();
  const immIds = imminentIds(view);

  // 1. 임박 재료 구출 세트
  const imminentRecipes = recipeOrder.slice().sort((a, b) => {
    const aImminent = recipes[a].ingredients.filter(ing => immIds.includes(ing.id)).length;
    const bImminent = recipes[b].ingredients.filter(ing => immIds.includes(ing.id)).length;
    return bImminent - aImminent;
  }).slice(0, 3);

  // 2. 최소 지출 완성 세트
  const costRecipes = recipeOrder.slice().sort((a, b) => {
    const aHave = recipes[a].ingredients.filter(ing => ingHave(view, ing)).length / recipes[a].ingredients.length;
    const bHave = recipes[b].ingredients.filter(ing => ingHave(view, ing)).length / recipes[b].ingredients.length;
    return bHave - aHave;
  }).slice(0, 3);

  // 3. 식자재 쉐어링 세트 (대파, 양파, 계란 등을 공통으로 사용하는 요리)
  const shareRecipes = recipeOrder.filter(id => {
    return recipes[id].ingredients.some(ing => ['pa', 'onion', 'egg'].includes(ing.id));
  }).slice(0, 3);

  // 고정 1주일치 전체 메뉴 세트도 추가 (수량 누적 테스트용)
  // 기타 탭의 일주일 식단 루틴 추천 기능과 동일한 알고리즘을 사용합니다.
  const fullWeekRecipes = buildWeeklyPlan(pickedIds).days.map(d => d.recipe.id);

  return [
    { id: 'imminentRescue', name: '임박 재료 구출 세트', badge: '추천', level: null, matchType: 'imminentRescue', setLevel: 'mid', recipeIds: imminentRecipes },
    { id: 'minCost', name: '최소 지출 완성 세트', badge: '가성비', level: null, matchType: 'minCost', setLevel: 'beginner', recipeIds: costRecipes },
    { id: 'ingredientShare', name: '식자재 쉐어링 세트', badge: '알뜰', level: null, matchType: 'ingredientShare', setLevel: 'beginner', recipeIds: shareRecipes },
    { id: 'fullWeek', name: '일주일 전체 식단 (7일)', badge: '대량', level: null, matchType: 'fullWeek', setLevel: 'mid', recipeIds: fullWeekRecipes },
  ];
}

/** GET /api/shopping/sets?match=&level=&pickedIds=&multiplier= — 추천 장보기 세트 목록 (실제 냉장고 재고 기준으로 계산) */
export function getShoppingSets({ match = 'all', level = 'all', pickedIds = [], multiplier = 1.0 } = {}) {
  const dynamicSets = generateDynamicSets(pickedIds);
  
  const sets = dynamicSets
    .filter((s) => (match === 'all' || s.matchType === match) && (level === 'all' || s.setLevel === level))
    .map((s) => {
      const { needs, totalCost } = calculateCumulativeNeeds(s.recipeIds, multiplier);
      return {
        id: s.id,
        name: s.name,
        badge: s.badge,
        level: s.level,
        buyCount: needs.length,
        dishCount: s.recipeIds.length,
        dishes: s.recipeIds.map((id) => recipes[id].name).join(' · '),
        total: totalCost,
      };
    });

  return { sets };
}

/** GET /api/shopping/list?setId=&pickedIds=&multiplier= — 선택된 세트의 장보기 목록 (기본값: 첫 번째 세트) */
export function getShoppingList(setId, pickedIds = [], multiplier = 1.0) {
  const dynamicSets = generateDynamicSets(pickedIds);
  const def = dynamicSets.find((s) => s.id === setId) ?? dynamicSets[0];

  const { needs, have, totalCost } = calculateCumulativeNeeds(def.recipeIds, multiplier);

  const buy = needs.map((n) => ({
    name: `${n.label} (부족: ${formatAmtText(n.qty, n.isGram, n.originalAmt)})`,
    uses: n.uses.join(' · '),
    price: n.price,
    checked: true,
  }));

  return { setName: def.name, buy, have, total: totalCost };
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
export function buildWeeklyPlan(pickedIds = []) {
  const actualPicks = (Array.isArray(pickedIds) && pickedIds.length === 2) 
    ? pickedIds 
    : [recipeOrder[0], recipeOrder[1]];

  const others = recipeOrder.filter((id) => !actualPicks.includes(id));
  const week   = new Array(7);

  week[1] = actualPicks[0]; // 화요일
  week[4] = actualPicks[1]; // 금요일
  [0, 2, 3, 5, 6].forEach((slot, i) => { week[slot] = others[i % others.length]; }); // 월수목토일

  return {
    days: week.map((id, i) => ({
      day:    dayLabels[i],
      recipe: { id, ...clone(recipes[id]) },
      picked: actualPicks.includes(id),
    })),
  };
}

/** POST /api/meal-plan/shopping-list — 일주일 식단 기반 장보기 리스트 */
export function getMealShoppingList(weekPlanIds, multiplier = 1.0) {
  const { needs, totalCost } = calculateCumulativeNeeds(weekPlanIds, multiplier);
  const items = needs.map(n => ({
    label: `${n.label} (부족: ${formatAmtText(n.qty, n.isGram, n.originalAmt)})`,
    uses: n.uses,
    price: n.price
  }));
  return { items, total: totalCost };
}
