import { initialFridge } from './data/initialFridge.js';
import { ingredientMap, calcExpiryDate, getSeason } from './data/ingredients.js';
import { recipeOrder, recipes } from './data/recipes.js';
import { mealPriceTable, dayLabels } from './data/mealPrices.js';
import { ingHave, ingName, recipeHasImminentBadge, imminentIds } from './logic/fridgeLogic.js';
import { supabase } from './supabaseClient.js';

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const TODAY = new Date(process.env.DEMO_TODAY ?? '2026-07-08T00:00:00');

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

  if (ingredientId === 'pork' && qtyUnit === '근') {
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
  return clone(view[id] || null);
}

export async function deleteFridgeItem(id) {
  if (supabase) {
    await supabase.from('fridge_items').delete().eq('ingredient_id', id);
  }
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

      const rawExpiry = expiryOverrides[id] ?? calcExpiryDate(id, '2026-07-08') ?? null;
      const expiry = rawExpiry ? formatDday(rawExpiry) : 'D-5';
      const imminent = ddayValue(expiry) <= 2;

      const match = quantityLabel ? quantityLabel.match(/^([\d.]+)(.*)$/) : null;
      const qtyAmount = match ? parseFloat(match[1]) : 1;
      const qtyUnit = match ? match[2].trim() : quantityLabel;

      if (category === 'fresh' || (master && master.category === 'fresh')) {
        inserts.push({
          ingredient_id: id,
          qty_amount: qtyAmount,
          qty_unit: qtyUnit || '개',
          purchased: formatMD('2026-07-08'),
          expiry,
          imminent
        });
      } else {
        inserts.push({
          ingredient_id: id,
          qty_label: quantityLabel ?? '1개',
          purchased: formatMD('2026-07-08'),
          expiry: null,
          imminent: false
        });
      }
    });

  if (supabase && inserts.length > 0) {
    await supabase.from('fridge_items').insert(inserts);
  }

  record.status = 'confirmed';
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
    
    // Convert array of string IDs back to ingredients format: [{ id: 'pork', amt: '' }, ...]
    const ingrs = r.ingredients_json.map(ing => ({ id: ing, amt: '' }));
    
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

function parseAmt(amtStr) {
  if (!amtStr) return { val: 1, isGram: false };
  if (amtStr.includes('g')) return { val: parseInt(amtStr) || 150, isGram: true };
  if (amtStr.includes('반')) return { val: 0.5, isGram: false };
  if (amtStr.includes('1/2')) return { val: 0.5, isGram: false };
  if (amtStr.includes('1/3')) return { val: 0.33, isGram: false };
  if (amtStr.includes('1/4')) return { val: 0.25, isGram: false };
  if (amtStr.includes('1/8')) return { val: 0.125, isGram: false };
  return { val: parseFloat(amtStr) || 1, isGram: false };
}

function formatAmtText(qty, isGram, originalAmt) {
  if (isGram) return `${Math.round(qty)}g`;
  
  const unit = originalAmt ? originalAmt.replace(/[0-9./반 ]/g, '') || '단위' : '단위';
  const rounded = Math.round(qty * 4) / 4;
  
  if (Number.isInteger(rounded)) return `${rounded}${unit}`;
  
  const intPart = Math.floor(rounded);
  const frac = rounded - intPart;
  
  let fracStr = '';
  if (frac === 0.25) fracStr = '1/4';
  else if (frac === 0.5) fracStr = '1/2';
  else if (frac === 0.75) fracStr = '3/4';
  else fracStr = frac.toString().replace('0.', '.');
  
  if (intPart === 0) return `${fracStr}${unit}`;
  return `${intPart}${unit} 하고 ${fracStr}쪽`;
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
      const isGram = parsed.isGram;
      const requiredQtyRaw = parsed.val * multiplier;
      const requiredQty = isGram ? Math.round(requiredQtyRaw) : Math.round(requiredQtyRaw * 4) / 4;
      return {
        ...ing,
        amt: formatAmtText(requiredQty, isGram, ing.amt),
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
      const parsed = parseAmt(ing.amt);
      const isGram = parsed.isGram;
      const requiredQtyRaw = parsed.val * multiplier;
      const requiredQty = isGram ? Math.round(requiredQtyRaw) : Math.round(requiredQtyRaw * 4) / 4;

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

async function generateDynamicSets(pickedIds = []) {
  const view = await buildFridgeView();
  const immIds = imminentIds(view);
  const { recipeOrder, recipes } = await getRecipesFromDB();

  const imminentRecipes = recipeOrder.slice().sort((a, b) => {
    const aImminent = recipes[a].ingredients.filter(ing => immIds.includes(ing.id)).length;
    const bImminent = recipes[b].ingredients.filter(ing => immIds.includes(ing.id)).length;
    return bImminent - aImminent;
  }).slice(0, 3);

  const costRecipes = recipeOrder.slice().sort((a, b) => {
    const aHave = recipes[a].ingredients.filter(ing => ingHave(view, ing)).length / recipes[a].ingredients.length;
    const bHave = recipes[b].ingredients.filter(ing => ingHave(view, ing)).length / recipes[b].ingredients.length;
    return bHave - aHave;
  }).slice(0, 3);

  const shareRecipes = recipeOrder.filter(id => {
    return recipes[id].ingredients.some(ing => ['pa', 'onion', 'egg'].includes(ing.id));
  }).slice(0, 3);

  const fullWeekRecipes = (await buildWeeklyPlan(pickedIds)).days.map(d => d.recipe.id);

  return [
    { id: 'imminentRescue', name: '임박 재료 구출 세트', badge: '추천', level: null, matchType: 'imminentRescue', setLevel: 'mid', recipeIds: imminentRecipes },
    { id: 'minCost', name: '최소 지출 완성 세트', badge: '가성비', level: null, matchType: 'minCost', setLevel: 'beginner', recipeIds: costRecipes },
    { id: 'ingredientShare', name: '식자재 쉐어링 세트', badge: '알뜰', level: null, matchType: 'ingredientShare', setLevel: 'beginner', recipeIds: shareRecipes },
    { id: 'fullWeek', name: '일주일 전체 식단 (7일)', badge: '대량', level: null, matchType: 'fullWeek', setLevel: 'mid', recipeIds: fullWeekRecipes },
  ];
}

export async function getShoppingSets({ match = 'all', level = 'all', pickedIds = [], multiplier = 1.0 } = {}) {
  const dynamicSets = await generateDynamicSets(pickedIds);
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
  const { recipeOrder, recipes } = await getRecipesFromDB();
  const actualPicks = (Array.isArray(pickedIds) && pickedIds.length === 2) 
    ? pickedIds 
    : [recipeOrder[0], recipeOrder[1]];

  const others = recipeOrder.filter((id) => !actualPicks.includes(id));
  const week   = new Array(7);

  week[1] = actualPicks[0];
  week[4] = actualPicks[1];
  [0, 2, 3, 5, 6].forEach((slot, i) => { week[slot] = others[i % others.length]; });

  return {
    days: week.map((id, i) => ({
      day:    dayLabels[i],
      recipe: { id, ...clone(recipes[id]) },
      picked: actualPicks.includes(id),
    })),
  };
}

export async function getMealShoppingList(weekPlanIds, multiplier = 1.0) {
  const { recipeOrder, recipes } = await getRecipesFromDB();
  const { needs, have, totalCost } = await calculateCumulativeNeeds(weekPlanIds, multiplier);
  const items = needs.map(n => ({
    label: `${n.label} (부족: ${formatAmtText(n.qty, n.isGram, n.originalAmt)})`,
    uses: n.uses,
    price: n.price
  }));
  return { items, total: totalCost };
}
