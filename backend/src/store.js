import { initialFridge } from './data/initialFridge.js';
import { ingredientMap, calcExpiryDate, getSeason } from './data/ingredients.js';
import { recipeOrder, recipes } from './data/recipes.js';
import { mealPriceTable, dayLabels } from './data/mealPrices.js';
import { ingHave, ingName, recipeHasImminentBadge, imminentIds, parseAmt, formatAmtText } from './logic/fridgeLogic.js';
import { supabase } from './supabaseClient.js';

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const TODAY = process.env.DEMO_TODAY ? new Date(process.env.DEMO_TODAY) : new Date();

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

const receipts = {};
let nextReceiptId = 1;

// 마스터(ingredientMap)에 없는 "기타" 직접 추가 재료의 이름/이모지 —
// fridge_items 테이블에는 name/emoji 컬럼이 없어서(수량·유통기한만 추적) 서버 메모리에 따로 둔다.
// (receipts와 같은 이유로 인메모리: 재시작하면 초기화됨)
const customIngredientMeta = {};

async function fetchFridge() {
  if (!supabase) return clone(initialFridge);
  const { data, error } = await supabase.from('fridge_items').select('*');
  if (error) {
    console.error("Supabase fetch error:", error);
    return {};
  }
  const fridge = {};
  data.forEach(row => {
    if (!fridge[row.ingredient_id]) fridge[row.ingredient_id] = { items: [] };
    fridge[row.ingredient_id].items.push({
      dbId: row.id,
      qtyAmount: row.qty_amount ? parseFloat(row.qty_amount) : undefined,
      qtyUnit: row.qty_unit,
      qtyLabel: row.qty_label,
      purchased: row.purchased,
      expiry: row.expiry,
      imminent: row.imminent
    });
  });
  return fridge;
}

function enrichFridgeItem(id, stock) {
  const master = ingredientMap[id];
  
  if (!master) {
    const meta = customIngredientMeta[id] || {};
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
         name: meta.name || stock.name || id,
         emoji: meta.emoji || stock.emoji || '🥗',
         role: meta.role,
         tip: meta.tip,
         qtyLabel: total > 0 ? `${total}${unit}` : stock.items[0]?.qtyLabel,
         purchased: earliest?.purchased,
         expiry: earliest?.expiry,
         imminent: stock.items.some(it => it.imminent)
       };
    }
    return {
      id,
      ...stock,
      name: meta.name || stock.name || id,
      emoji: meta.emoji || stock.emoji || '🥗',
      role: meta.role,
      tip: meta.tip,
    };
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

async function buildFridgeView() {
  const currentFridge = await fetchFridge();
  return Object.fromEntries(
    Object.entries(currentFridge).map(([id, stock]) => [id, enrichFridgeItem(id, stock)]),
  );
}

export async function getFridge() {
  return clone(await buildFridgeView());
}

export async function addFridgeItem({ ingredientId, name, quantityLabel, purchasedAt, expiryDate }) {
  const match = quantityLabel ? quantityLabel.match(/^([\d.]+)(.*)$/) : null;
  let qtyAmount = match ? parseFloat(match[1]) : 1;
  let qtyUnit = match ? match[2].trim() : quantityLabel;

  // 근(=600g) 단위 변환 — 돼지고기, 삼겹살, 소고기 모두 적용
  if (['pork', 'porkBelly', 'beef'].includes(ingredientId) && qtyUnit === '근') {
    qtyAmount *= 600;
    qtyUnit = 'g';
  }

  const id = ingredientId || `custom_${Date.now()}`;
  const master = ingredientMap[id];
  if (ingredientId && !master) {
    throw Object.assign(new Error(`addFridgeItem: unknown ingredientId "${ingredientId}"`), { status: 400 });
  }

  if (!ingredientId) {
    customIngredientMeta[id] = {
      name: name || '기타 재료',
      emoji: '🥗',
      role: '사용자가 직접 추가한 재료예요.',
      tip: '일반적인 보관 방법(냉장·밀폐)을 따르면 돼요.',
    };
  }

  const rawExpiry = expiryDate || (ingredientId ? calcExpiryDate(ingredientId, purchasedAt) : null);
  const expiry = rawExpiry ? formatDday(rawExpiry) : null;
  const imminent = expiry ? ddayValue(expiry) <= 2 : false;
  
  const insertData = {
    ingredient_id: id,
    qty_amount: master?.category === 'fresh' || (!master && qtyAmount) ? qtyAmount : null,
    qty_unit: master?.category === 'fresh' || (!master && qtyUnit) ? (qtyUnit || '개') : null,
    qty_label: master?.category !== 'fresh' ? quantityLabel : null,
    purchased: formatMD(purchasedAt),
    expiry,
    imminent
  };

  if (supabase) {
    await supabase.from('fridge_items').insert(insertData);
  }
  _dynamicSetsCache = null; // 냉장고 변경 시 세트 캐시 무효화

  const view = await buildFridgeView();
  return clone(view[id]);
}

export async function updateFridgeItem(id, patch) {
  const currentFridge = await fetchFridge();
  const current = currentFridge[id];
  if (!current) return null;

  if (patch.deleteItemIndex !== undefined && current.items) {
    const item = current.items[patch.deleteItemIndex];
    if (item && supabase && item.dbId) {
      await supabase.from('fridge_items').delete().eq('id', item.dbId);
    }
  } else if (patch.itemIndex !== undefined && current.items && current.items[patch.itemIndex]) {
    const item = current.items[patch.itemIndex];
    const updateData = {};
    if (patch.qtyAmount !== undefined) updateData.qty_amount = patch.qtyAmount;
    if (patch.qtyUnit !== undefined) updateData.qty_unit = patch.qtyUnit;
    if (patch.qtyLabel !== undefined) updateData.qty_label = patch.qtyLabel;
    
    if (patch.expiryDate !== undefined) {
      if (patch.expiryDate) {
        updateData.expiry = formatDday(patch.expiryDate);
        updateData.imminent = ddayValue(updateData.expiry) <= 2;
      } else {
        updateData.expiry = null;
        updateData.imminent = false;
      }
    }
    if (supabase && item.dbId) {
      await supabase.from('fridge_items').update(updateData).eq('id', item.dbId);
    }
  }

  const view = await buildFridgeView();
  _dynamicSetsCache = null; // 냉장고 변경 시 세트 캐시 무효화
  return clone(view[id] || null);
}

export async function deleteFridgeItem(id) {
  if (supabase) {
    await supabase.from('fridge_items').delete().eq('ingredient_id', id);
  }
  _dynamicSetsCache = null; // 냉장고 변경 시 세트 캐시 무효화
  return true;
}

export async function createReceipt() {
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

export async function confirmReceipt(receiptId, { expiryOverrides = {} } = {}) {
  const record = receipts[receiptId];
  if (!record) return null;

  const inserts = [];

  record.items
    .filter((it) => it.matched && it.matchedIngredientId)
    .forEach((it) => {
      const { matchedIngredientId: id, quantityLabel, category } = it;
      const master = ingredientMap[id];

      const todayStr = new Date().toISOString().slice(0, 10);
      const rawExpiry = expiryOverrides[id] ?? calcExpiryDate(id, todayStr) ?? null;
      const expiry = rawExpiry ? formatDday(rawExpiry) : null;
      const imminent = expiry ? ddayValue(expiry) <= 2 : false;

      const match = quantityLabel ? quantityLabel.match(/^([\d.]+)(.*)$/) : null;
      const qtyAmount = match ? parseFloat(match[1]) : 1;
      const qtyUnit = match ? match[2].trim() : quantityLabel;

      if (category === 'fresh' || (master && master.category === 'fresh')) {
        inserts.push({
          ingredient_id: id,
          qty_amount: qtyAmount,
          qty_unit: qtyUnit || '개',
          purchased: formatMD(todayStr),
          expiry,
          imminent
        });
      } else {
        inserts.push({
          ingredient_id: id,
          qty_label: quantityLabel ?? '1개',
          purchased: formatMD(todayStr),
          expiry: null,
          imminent: false
        });
      }
    });

  if (supabase && inserts.length > 0) {
    await supabase.from('fridge_items').insert(inserts);
  }

  record.status = 'confirmed';
  _dynamicSetsCache = null; // 영수증 확정 시 재고 노온 변경 안해 세트 캐시 무효화
  return clone(await buildFridgeView());
}

export async function getRecipesFromDB() {
  if (!supabase) return { recipeOrder, recipes };
  const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: true });
  if (error || !data || data.length === 0) return { recipeOrder, recipes };

  const fetchedRecipes = {};
  const fetchedOrder = [];
  
  data.forEach(r => {
    const id = r.api_rcp_seq;
    fetchedOrder.push(id);
    
    // ingredients_json은 fetchRecipes.js가 [{ id?, name?, amt }, ...] 형태로 저장한다.
    // 예전에 시딩된 행은 아직 문자열 배열(['pork', ...])일 수 있어 하위호환으로 변환해준다.
    const ingrs = r.ingredients_json.map((ing) =>
      typeof ing === 'string' ? { id: ing, amt: '' } : ing
    );
    
    fetchedRecipes[id] = {
      name: r.title,
      emoji: '🍲',
      level: r.level || 'beginner',
      levelLabel: r.level === 'beginner' ? '🟢 초보자' : '🟡 중급자',
      time: parseInt(r.time) || 30,
      note: '식품안전나라 레시피',
      ingredients: ingrs,
      addons: [],
      steps: r.steps_json.map(s => ({
        emoji: '🍳',
        text: s.desc,
        sum: s.desc.substring(0, 20),
        tip: '',
        tips: []
      })),
      image_url: r.image_url,
      category: r.category || '기타'
    };
  });
  
  return { recipeOrder: fetchedOrder, recipes: fetchedRecipes };
}

export async function listRecipes({ filter = 'all', level = 'all', category = 'all' } = {}) {
  const view = await buildFridgeView();
  const { recipeOrder, recipes } = await getRecipesFromDB();

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
      // 전체 재료 중 60% 이상 보유 중이지만 아직 full이 아닌 경우 → '조금 더 필요'
      few:           have !== total && total > 0 && (have / total) >= 0.6,
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

export async function getRecipeDetail(id, multiplier = 1.0) {
  const { recipes } = await getRecipesFromDB();
  const r = recipes[id];
  if (!r) return null;

  const view = await buildFridgeView();

  return {
    id,
    ...clone(r),
    ingredients: r.ingredients.map((ing) => {
      const parsed = parseAmt(ing.amt);
      // 반올림/분수 스냅은 전부 formatAmtText 안에서 처리한다 — 여기서 먼저 반올림해버리면
      // (예전 코드처럼) 소량 재료의 소수부가 formatAmtText에 닿기도 전에 날아간다.
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

export async function cookDone(recipeId, deductions) {
  const { recipes } = await getRecipesFromDB();
  if (!recipes[recipeId]) {
    throw Object.assign(new Error(`cook-done: unknown recipe id "${recipeId}"`), { status: 400 });
  }

  const view = await buildFridgeView();
  const currentFridge = await fetchFridge();
  
  const results = [];
  for (const { id, use } of deductions) {
    const current = view[id];
    const before = current?.qtyLabel || '소진';
    
    if (use > 0 && currentFridge[id] && currentFridge[id].items) {
      currentFridge[id].items.sort((a, b) => {
        const da = a.expiry ? ddayValue(a.expiry) : 999;
        const db = b.expiry ? ddayValue(b.expiry) : 999;
        return da - db;
      });
      
      let remainingToDeduct = use;
      for (let i = 0; i < currentFridge[id].items.length && remainingToDeduct > 0; i++) {
        const item = currentFridge[id].items[i];
        if (item.qtyAmount) {
          if (item.qtyAmount <= remainingToDeduct) {
            remainingToDeduct -= item.qtyAmount;
            if (supabase && item.dbId) await supabase.from('fridge_items').delete().eq('id', item.dbId);
          } else {
            const newQty = item.qtyAmount - remainingToDeduct;
            remainingToDeduct = 0;
            if (supabase && item.dbId) await supabase.from('fridge_items').update({ qty_amount: newQty }).eq('id', item.dbId);
          }
        } else {
           // qtyLabel만 있는 가공식품 배치 — 수량을 세분화할 수 없으니 이 배치를 통째로 소진 처리
           remainingToDeduct = 0;
           if (supabase && item.dbId) await supabase.from('fridge_items').delete().eq('id', item.dbId);
        }
      }
    }
    
    const afterView = await buildFridgeView();
    const afterCurrent = afterView[id];
    
    results.push({
      id,
      name: current?.name || '',
      emoji: current?.emoji || '',
      before,
      after: afterCurrent?.qtyLabel || '소진',
    });
  }

  _dynamicSetsCache = null; // 요리 완료 시 냉장고 재고 변경 안해 캐시 무효화
  return { results, fridge: clone(await buildFridgeView()) };
}

export async function getExpiryAlerts() {
  const view = await buildFridgeView();
  const ids  = imminentIds(view);
  const { recipeOrder, recipes } = await getRecipesFromDB();

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

async function calculateCumulativeNeeds(recipeIds, multiplier = 1.0) {
  const view = await buildFridgeView();
  const { recipes } = await getRecipesFromDB();
  const haveMap = {}; 

  Object.keys(view).forEach(id => {
    if (view[id].items) {
      haveMap[id] = view[id].items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
    } else {
      haveMap[id] = 1;
    }
  });

  const buyList = {};
  const alreadyHaveList = {};

  recipeIds.forEach(id => {
    recipes[id].ingredients.forEach(ing => {
      if (ing.untracked) return;

      const key = ing.id || ing.name;
      const label = ingName(view, ing);
      if (label === '물' || key === '물') return; // 물은 장보기/재고 계산에서 아예 제외
      const parsed = parseAmt(ing.amt);
      const isGram = parsed.isGram;
      // 반올림/분수 스냅은 여기서 하지 않는다 — getRecipeDetail과 똑같이, 호출부가 최종
      // 표시 시점에 formatAmtText를 부를 때 한 번만 적용한다. 여기서 먼저 반올림해버리면
      // (예전 코드처럼) 소금 0.2g 같은 극소량이 0으로 사라지고, haveMap 재고 비교도
      // 실제 필요량이 아닌 반올림된 값과 비교하게 돼 재고가 있어도 없다고 잘못 판정한다.
      const requiredQty = parsed.val * multiplier;

      if (ing.id && view[ing.id]) {
        if (haveMap[ing.id] >= requiredQty) {
          haveMap[ing.id] -= requiredQty;
          
          if (!alreadyHaveList[key]) alreadyHaveList[key] = { label: ingName(view, ing), uses: [], qty: 0 };
          if (!alreadyHaveList[key].uses.includes(recipes[id].name)) alreadyHaveList[key].uses.push(recipes[id].name);
          alreadyHaveList[key].qty += requiredQty;
        } else {
          const shortfall = requiredQty - (haveMap[ing.id] || 0);
          
          if (haveMap[ing.id] > 0) {
            if (!alreadyHaveList[key]) alreadyHaveList[key] = { label: ingName(view, ing), uses: [], qty: 0 };
            if (!alreadyHaveList[key].uses.includes(recipes[id].name)) alreadyHaveList[key].uses.push(recipes[id].name);
            alreadyHaveList[key].qty += haveMap[ing.id];
          }

          haveMap[ing.id] = 0; 

          if (!buyList[key]) buyList[key] = { label: ingName(view, ing), price: mealPriceTable[key] ?? 3000, uses: [], qty: 0, isGram, originalAmt: ing.amt };
          if (!buyList[key].uses.includes(recipes[id].name)) buyList[key].uses.push(recipes[id].name);
          buyList[key].qty += shortfall;
        }
      } else {
        if (!buyList[key]) buyList[key] = { label: ingName(view, ing), price: mealPriceTable[key] ?? 3000, uses: [], qty: 0, isGram, originalAmt: ing.amt };
        if (!buyList[key].uses.includes(recipes[id].name)) buyList[key].uses.push(recipes[id].name);
        buyList[key].qty += requiredQty;
      }
    });
  });

  const needs = Object.values(buyList).map(n => {
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

// generateDynamicSets 결과를 5분간 캐싱 — buildWeeklyPlan의 C(N,3) 브루트포스가
// 매 API 요청마다 반복 실행되지 않도록 한다. 냉장고 상태가 바뀌면 즉시 무효화.
let _dynamicSetsCache = null;
let _dynamicSetsCacheAt = 0;
const DYNAMIC_SETS_TTL_MS = 5 * 60 * 1000; // 5분

async function generateDynamicSets(pickedIds = []) {
  const view = await buildFridgeView();
  const immIds = imminentIds(view);
  const { recipeOrder, recipes } = await getRecipesFromDB();

  const imminentRecipes = recipeOrder.slice().sort((a, b) => {
    const aImminent = recipes[a].ingredients.filter(ing => immIds.includes(ing.id)).length;
    const bImminent = recipes[b].ingredients.filter(ing => immIds.includes(ing.id)).length;
    return bImminent - aImminent;
  }).slice(0, 3);

  // 각 레시피의 부족 재료 실구매 추가 비용 계산 (최소 지출 정렬용)
  const recipeCosts = {};
  const haveMapInit = {}; 
  Object.keys(view).forEach(id => {
    if (view[id].items) {
      haveMapInit[id] = view[id].items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
    } else {
      haveMapInit[id] = 1;
    }
  });

  recipeOrder.forEach(id => {
    let cost = 0;
    const haveMap = { ...haveMapInit };
    recipes[id].ingredients.forEach(ing => {
      if (ing.untracked) return;
      const key = ing.id || ing.name;
      if (key === '물' || ingName(view, ing) === '물') return;

      const parsed = parseAmt(ing.amt);
      const isGram = parsed.isGram;
      const requiredQty = parsed.val;

      if (ing.id && view[ing.id]) {
        if (haveMap[ing.id] >= requiredQty) {
          haveMap[ing.id] -= requiredQty;
        } else {
          const shortfall = requiredQty - (haveMap[ing.id] || 0);
          haveMap[ing.id] = 0;
          const buyMultiplier = isGram ? Math.ceil(shortfall / 600) : Math.ceil(shortfall);
          cost += (mealPriceTable[key] ?? 3000) * buyMultiplier;
        }
      } else {
        const buyMultiplier = isGram ? Math.ceil(requiredQty / 600) : Math.ceil(requiredQty);
        cost += (mealPriceTable[key] ?? 3000) * buyMultiplier;
      }
    });
    recipeCosts[id] = cost;
  });

  const costRecipes = recipeOrder.slice().sort((a, b) => {
    return recipeCosts[a] - recipeCosts[b];
  }).slice(0, 3);

  const shareRecipes = recipeOrder.filter(id => {
    return recipes[id].ingredients.some(ing => ['pa', 'onion', 'egg'].includes(ing.id));
  }).slice(0, 3);

  const fullWeekRecipes = (await buildWeeklyPlan(pickedIds)).days
    .map(d => d.recipe?.id)
    .filter(Boolean);

  const result = [
    { id: 'imminentRescue', name: '임박 재료 구출 세트', badge: '추천', level: null, matchType: 'imminentRescue', setLevel: 'mid', recipeIds: imminentRecipes },
    { id: 'minCost', name: '최소 지출 완성 세트', badge: '가성비', level: null, matchType: 'minCost', setLevel: 'beginner', recipeIds: costRecipes },
    { id: 'ingredientShare', name: '식자재 쉐어링 세트', badge: '알뜰', level: null, matchType: 'ingredientShare', setLevel: 'beginner', recipeIds: shareRecipes },
    { id: 'fullWeek', name: '일주일 전체 식단 (7일)', badge: '대량', level: null, matchType: 'fullWeek', setLevel: 'mid', recipeIds: fullWeekRecipes },
  ];
  // 결과를 캐싱하고 타임스탬프 기록
  _dynamicSetsCache = result;
  _dynamicSetsCacheAt = Date.now();
  return result;
}

export async function getShoppingSets({ match = 'all', level = 'all', pickedIds = [], multiplier = 1.0 } = {}) {
  // 5분 TTL 캐시 — 냉장고 변경 함수(add/update/delete/cookDone/confirm)에서 bust한다.
  const now = Date.now();
  const isCacheValid = _dynamicSetsCache && (now - _dynamicSetsCacheAt) < DYNAMIC_SETS_TTL_MS;
  const dynamicSets = isCacheValid ? _dynamicSetsCache : await generateDynamicSets(pickedIds);
  const { recipes: dbRecipes } = await getRecipesFromDB();

  const sets = await Promise.all(dynamicSets
    .filter((s) => (match === 'all' || s.matchType === match) && (level === 'all' || s.setLevel === level))
    .map(async (s) => {
      const { needs, totalCost } = await calculateCumulativeNeeds(s.recipeIds, multiplier);
      return {
        id: s.id,
        name: s.name,
        badge: s.badge,
        level: s.level,
        buyCount: needs.length,
        dishCount: s.recipeIds.length,
        dishes: s.recipeIds.map((id) => dbRecipes[id]?.name).filter(Boolean).join(' · '),
        total: totalCost,
      };
    }));

  return { sets };
}

export async function getShoppingList(setId, pickedIds = [], multiplier = 1.0) {
  const dynamicSets = await generateDynamicSets(pickedIds);
  const def = dynamicSets.find((s) => s.id === setId) ?? dynamicSets[0];

  const { needs, have, totalCost } = await calculateCumulativeNeeds(def.recipeIds, multiplier);

  const buy = needs.map((n) => ({
    name: `${n.label} (부족: ${formatAmtText(n.qty, n.isGram, n.originalAmt)})`,
    uses: n.uses.join(' · '),
    price: n.price,
    checked: true,
  }));

  return { setName: def.name, buy, have, total: totalCost };
}

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

export async function getMealPlanCandidates() {
  const { recipeOrder, recipes } = await getRecipesFromDB();
  return { items: recipeOrder.map((id) => ({ id, ...clone(recipes[id]) })) };
}

export async function buildWeeklyPlan(pickedIds = []) {
  const view = await buildFridgeView();
  const immIds = imminentIds(view);
  const { recipeOrder, recipes } = await getRecipesFromDB();

  if (recipeOrder.length === 0) return { days: [] };

  // pickedIds 유효성 검사 — DB에 실제로 존재하는 레시피만 허용
  const validPicks = (Array.isArray(pickedIds) ? pickedIds : []).filter(id => !!recipes[id]);
  const actualPicks = validPicks.length === 2
    ? validPicks
    : recipeOrder.slice(0, 2).filter(Boolean);
  if (actualPicks.length < 2) return { days: [] };

  const pool = recipeOrder.filter((id) => !actualPicks.includes(id));

  // 각 레시피별 부족 재료 목록 계산 함수 (조미료 및 물 제외)
  function getMissingIngs(recipe) {
    const missing = [];
    recipe.ingredients.forEach(ing => {
      if (ing.untracked) return;
      const key = ing.id || ing.name;
      if (key === '물' || ingName(view, ing) === '물') return;
      
      const parsed = parseAmt(ing.amt);
      const req = parsed.val;
      
      if (ing.id && view[ing.id]) {
        const stockQty = view[ing.id].items ? view[ing.id].items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0) : 1;
        if (stockQty < req) {
          missing.push(key);
        }
      } else {
        missing.push(key);
      }
    });
    return missing;
  }

  // 모든 레시피의 부족 재료 미리 계산
  const recipeMissingMap = {};
  pool.concat(actualPicks).forEach(id => {
    recipeMissingMap[id] = getMissingIngs(recipes[id]);
  });

  // Step 1: 임박 재료 소진 레시피 선별 및 우선 정렬
  const imminentPool = pool.filter(id => {
    return recipes[id].ingredients.some(ing => ing.id && immIds.includes(ing.id));
  }).sort((a, b) => {
    const aImmCount = recipes[a].ingredients.filter(ing => ing.id && immIds.includes(ing.id)).length;
    const bImmCount = recipes[b].ingredients.filter(ing => ing.id && immIds.includes(ing.id)).length;
    return bImmCount - aImmCount;
  });

  // 전반부(월, 수)용 임박 재료 레시피 2개 선택
  const selectedImminent = [];
  if (imminentPool.length >= 1) selectedImminent.push(imminentPool[0]);
  if (imminentPool.length >= 2) selectedImminent.push(imminentPool[1]);

  // 임박 레시피가 부족할 경우 일반 레시피로 채움
  const remainingPool = pool.filter(id => !selectedImminent.includes(id));
  while (selectedImminent.length < 2 && remainingPool.length > 0) {
    selectedImminent.push(remainingPool.shift());
  }

  // Step 2: 남은 슬롯 3개(목, 토, 일)에 들어갈 레시피의 구매 품목 최소화 조합 탐색
  const remainingPoolFinal = pool.filter(id => !selectedImminent.includes(id));

  // 고정 재료(임박 요리 2개 + 사용자 선택 요리 2개)의 총 부족 재료 집합
  const fixedIds = [...selectedImminent, ...actualPicks];
  const fixedMissingSet = new Set();
  fixedIds.forEach(id => {
    recipeMissingMap[id].forEach(m => fixedMissingSet.add(m));
  });

  let bestCombination = [];
  let minCostUniqueCount = Infinity;
  let minTotalPrice = Infinity;

  // 조합 C(N, 3) 브루트포스 탐색을 통해 최적의 3개 레시피 탐색
  const N = remainingPoolFinal.length;
  for (let i = 0; i < N; i++) {
    const a = remainingPoolFinal[i];
    const missingA = recipeMissingMap[a];
    
    for (let j = i + 1; j < N; j++) {
      const b = remainingPoolFinal[j];
      const missingB = recipeMissingMap[b];
      
      for (let k = j + 1; k < N; k++) {
        const c = remainingPoolFinal[k];
        const missingC = recipeMissingMap[c];

        const tempSet = new Set(fixedMissingSet);
        missingA.forEach(m => tempSet.add(m));
        missingB.forEach(m => tempSet.add(m));
        missingC.forEach(m => tempSet.add(m));

        const uniqueCount = tempSet.size;

        if (uniqueCount < minCostUniqueCount) {
          minCostUniqueCount = uniqueCount;
          bestCombination = [a, b, c];
          
          let price = 0;
          tempSet.forEach(key => {
            price += (mealPriceTable[key] ?? 3000);
          });
          minTotalPrice = price;
        } else if (uniqueCount === minCostUniqueCount) {
          let price = 0;
          tempSet.forEach(key => {
            price += (mealPriceTable[key] ?? 3000);
          });
          if (price < minTotalPrice) {
            minTotalPrice = price;
            bestCombination = [a, b, c];
          }
        }
      }
    }
  }

  if (bestCombination.length < 3) {
    bestCombination = remainingPoolFinal.slice(0, 3);
  }

  // 최종 7일 식단 구성 및 배치
  // 월(0) - 임박 요리 1
  // 화(1) - 사용자 선택 요리 1
  // 수(2) - 임박 요리 2
  // 목(3) - 공유 최적화 요리 1
  // 금(4) - 사용자 선택 요리 2
  // 토(5) - 공유 최적화 요리 2
  // 일(6) - 공유 최적화 요리 3
  const week = new Array(7);
  week[0] = selectedImminent[0];
  week[1] = actualPicks[0];
  week[2] = selectedImminent[1];
  week[3] = bestCombination[0];
  week[4] = actualPicks[1];
  week[5] = bestCombination[1];
  week[6] = bestCombination[2];

  return {
    days: week.map((id, i) => ({
      day:    dayLabels[i],
      recipe: { id, ...clone(recipes[id]) },
      picked: actualPicks.includes(id),
    })),
  };
}

export async function getMealShoppingList(weekPlanIds, multiplier = 1.0) {
  const { needs, have, totalCost } = await calculateCumulativeNeeds(weekPlanIds, multiplier);
  const items = needs.map(n => ({
    label: `${n.label} (부족: ${formatAmtText(n.qty, n.isGram, n.originalAmt)})`,
    uses: n.uses,
    price: n.price
  }));
  return { items, total: totalCost };
}
