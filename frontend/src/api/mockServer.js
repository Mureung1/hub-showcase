import { initialFridge } from './data/initialFridge.js';
import { ingredientMap, calcExpiryDate } from './data/ingredients.js';
import { recipeOrder, recipes } from './data/recipes.js';
import { dayLabels, resolvePrice, resolvePackSize } from './data/mealPrices.js';
import {
  ingHave, ingName, recipeHasImminentBadge, imminentIds, parseAmt, formatAmtText, extractUnit,
  getMissingInfo, generateImminentRescueSet, generateIngredientShareSet, estimateBuyCost, mergeMissingMaps,
  selectImminentGreedy, shortlistCandidates, searchMinPurchaseCombo3,
  isPantryOrVague, normalizeIngredientKey, calculateRecipeDifficulty, isMeal, isSideDish
} from './logic/fridgeLogic.js';
const supabase = null;

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// DEMO_TODAY가 아니면 호출 시점마다 새로 읽어야 서버를 재시작 없이 오래 켜둬도 D-day가 드리프트하지 않는다.
function today() {
  return process.env.DEMO_TODAY ? new Date(process.env.DEMO_TODAY) : new Date();
}

function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDday(dateStr) {
  const diff = Math.round((new Date(dateStr) - today()) / 86_400_000);
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

  const rawExpiry = expiryDate || (ingredientId ? calcExpiryDate(master, purchasedAt) : null);
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

// _file: httpClient.uploadReceipt(file)와 시그니처를 맞추기 위한 파라미터.
// 오프라인 Mock은 서버가 없어 실제 OCR을 돌릴 수 없으므로 사진 내용과 무관하게 기존 데모 로직을 쓴다.
export async function createReceipt(_file) {
  const id = `r_${nextReceiptId++}`;
  
  const allIds = Object.keys(ingredientMap);
  const pickedIds = [];
  while (pickedIds.length < 3) {
    const randomId = allIds[Math.floor(Math.random() * allIds.length)];
    if (!pickedIds.includes(randomId)) pickedIds.push(randomId);
  }

  const items = pickedIds.map((pid) => {
    const master = ingredientMap[pid];
    const unit = master.defaultUnitLabels?.[0] || '1개';
    return {
      rawText: `${master.name}(스캔완료)`,
      matchedIngredientId: master.id,
      quantityLabel: unit,
      category: master.category,
      matched: true,
      isNew: Math.random() > 0.5
    };
  });

  items.push({ rawText: '(흐릿함)', matchedIngredientId: null, quantityLabel: null, category: null, matched: false });

  const record = {
    id,
    store: '이마트 신촌점',
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    status: 'partial',
    items,
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
      const rawExpiry = expiryOverrides[id] ?? calcExpiryDate(master, todayStr) ?? null;
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

let _recipesCache = null;
let _recipesCacheAt = 0;
const RECIPES_CACHE_TTL_MS = 30 * 60 * 1000;

export async function getRecipesFromDB() {
  if (_recipesCache && (Date.now() - _recipesCacheAt) < RECIPES_CACHE_TTL_MS) return _recipesCache;

  if (!supabase) {
    _recipesCache = { recipeOrder, recipes };
    _recipesCacheAt = Date.now();
    return _recipesCache;
  }
  const { count, error: countErr } = await supabase.from('recipes').select('*', { count: 'exact', head: true });
  if (countErr || !count) {
    _recipesCache = { recipeOrder, recipes };
    _recipesCacheAt = Date.now();
    return _recipesCache;
  }

  // 1000 rows per request, max 10 concurrent requests
  const pageSize = 1000;
  const pages = Math.ceil(count / pageSize);
  const data = [];

  for (let i = 0; i < pages; i += 10) {
    const chunkPromises = [];
    for (let j = i; j < Math.min(i + 10, pages); j++) {
      chunkPromises.push(
        supabase.from('recipes').select('*').range(j * pageSize, (j + 1) * pageSize - 1)
      );
    }
    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(r => {
      if (r.data) data.push(...r.data);
    });
  }

  if (data.length === 0) {
    _recipesCache = { recipeOrder, recipes };
    _recipesCacheAt = Date.now();
    return _recipesCache;
  }

  const fetchedRecipes = {};
  const fetchedOrder = [];

  data.forEach(r => {
    const id = r.api_rcp_seq;
    fetchedOrder.push(id);
    
    const ingrs = r.ingredients_json.map((ing) =>
      typeof ing === 'string' ? { id: ing, amt: '' } : ing
    );
    
    const steps = r.steps_json ? r.steps_json.map(s => ({
      emoji: '🍳',
      text: s.desc,
      sum: s.desc.substring(0, 20),
      tip: '',
      tips: []
    })) : [];

    // 원본 DB에 'level'이 있으면 넘겨줘서 조리과정(steps)이 없을 때 폴백으로 쓴다.
    const difficulty = calculateRecipeDifficulty({ ingredients: ingrs, steps, level: r.level });
    
    fetchedRecipes[id] = {
      name: r.title,
      emoji: '🍲',
      level: difficulty.level,
      levelLabel: difficulty.levelLabel,
      time: parseInt(r.time) || 30,
      note: '식품안전나라 레시피',
      ingredients: ingrs,
      addons: [],
      steps: steps,
      image_url: r.image_url,
      category: r.category || '기타'
    };
  });

  _recipesCache = { recipeOrder: fetchedOrder, recipes: fetchedRecipes };
  _recipesCacheAt = Date.now();
  return _recipesCache;
}

// backend/src/store.js의 listRecipes와 동일한 페이지네이션/정렬 계약 — API 계약이 셋(mockServer/
// httpClient/실제 백엔드) 다 일치해야 한다는 CLAUDE.md 규칙에 맞춘다.
const LEVEL_RANK = { beginner: 0, mid: 1, expert: 2 };

export async function listRecipes({ filter = 'all', level = 'all', category = 'all', search = '', page = 1, pageSize = 30, sort = 'default' } = {}) {
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
      few:           have !== total && total > 0 && (have / total) >= 0.6,
      imminentBadge: recipeHasImminentBadge(view, recipes, id),
      missing:       r.ingredients
                       .filter((ing) => !ingHave(view, ing))
                       .map((ing) => {
                         const name = ingName(view, ing);
                         return typeof name === 'object' ? (name.name || name.id || '') : name;
                       }),
    };
  });

  const keyword = search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter === 'full' && !r.full) return false;
    if (filter === 'few'  && !r.few)  return false;
    if (level !== 'all'  && r.level !== level) return false;
    if (category !== 'all' && r.category !== category) return false;
    if (keyword && !r.name.toLowerCase().includes(keyword)) return false;
    return true;
  });

  if (sort === 'ratio') {
    filtered.sort((a, b) => (b.total ? b.have / b.total : 0) - (a.total ? a.have / a.total : 0));
  } else if (sort === 'time') {
    filtered.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  } else if (sort === 'level') {
    filtered.sort((a, b) => (LEVEL_RANK[a.level] ?? 99) - (LEVEL_RANK[b.level] ?? 99));
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page: safePage, pageSize, totalPages };
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

  const lowStockIds = Object.keys(view).filter(id => {
    const f = view[id];
    if (!f.items || f.items.length === 0) return false;
    const unit = f.items[0].qtyUnit || '';
    const totalAmount = f.items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 1), 0);
    if (['g', 'ml', 'g 직접입력'].includes(unit)) return totalAmount <= 150;
    return totalAmount <= 1;
  });

  return {
    items: ids.map((id) => ({ id, ...clone(view[id]) })),
    lowStockItems: lowStockIds.map((id) => ({ id, ...clone(view[id]) })),
    relatedRecipes: relatedRecipeIds.map((rid) => ({
      id: rid,
      ...clone(recipes[rid]),
      usedNames: recipes[rid].ingredients
        .filter((ing) => ing.id && ids.includes(ing.id))
        .map((ing) => view[ing.id].name),
    })),
  };
}

async function calculateCumulativeNeeds(recipeIds, multiplier = 1.0, view, recipesData) {
  view = view ?? await buildFridgeView();
  const { recipes } = recipesData ?? await getRecipesFromDB();
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
      if (isPantryOrVague(ing)) return;

      const key = normalizeIngredientKey(ing);
      const parsed = parseAmt(ing.amt);
      const isGram = parsed.isGram;
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

          if (!buyList[key]) buyList[key] = { label: ingName(view, ing), price: resolvePrice(key), uses: [], qty: 0, isGram, originalAmt: ing.amt };
          if (!buyList[key].uses.includes(recipes[id].name)) buyList[key].uses.push(recipes[id].name);
          buyList[key].qty += shortfall;
        }
      } else {
        if (!buyList[key]) buyList[key] = { label: ingName(view, ing), price: resolvePrice(key), uses: [], qty: 0, isGram, originalAmt: ing.amt };
        if (!buyList[key].uses.includes(recipes[id].name)) buyList[key].uses.push(recipes[id].name);
        buyList[key].qty += requiredQty;
      }
    });
  });

  const needs = Object.entries(buyList).map(([key, n]) => {
    const buyMultiplier = n.isGram
      ? Math.ceil(n.qty / 600)
      : Math.ceil(n.qty / resolvePackSize(key, extractUnit(n.originalAmt)));
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

let _dynamicSetsCache = null;
let _dynamicSetsCacheAt = 0;
let _dynamicSetsCacheKey = '';
const DYNAMIC_SETS_TTL_MS = 5 * 60 * 1000;

// mealPool/sidePool은 pickedIds나 fridge 상태와 무관하게 recipesData(카테고리)만으로 정해지므로,
// generateDynamicSets의 pickedIds 기반 캐시와 별개로 recipesData 참조 단위로 따로 메모이즈한다.
// getShoppingList가 매 요청마다(캐시 없이) 같은 필터를 최대 6.7만 개 레시피에 다시 돌리던 걸 막기 위함.
let _typedPoolsFor = null;
let _mealPoolCache = null;
let _sidePoolCache = null;
function getTypedPools(recipesData) {
  if (_typedPoolsFor !== recipesData) {
    const { recipeOrder, recipes } = recipesData;
    _mealPoolCache = recipeOrder.filter(id => isMeal(recipes[id].category));
    _sidePoolCache = recipeOrder.filter(id => isSideDish(recipes[id].category));
    _typedPoolsFor = recipesData;
  }
  return { mealPool: _mealPoolCache, sidePool: _sidePoolCache };
}

async function generateDynamicSets(pickedIds = [], view, recipesData) {
  const cacheKey = JSON.stringify({ p: Array.isArray(pickedIds) ? pickedIds : [] });
  if (_dynamicSetsCache && _dynamicSetsCacheKey === cacheKey
    && (Date.now() - _dynamicSetsCacheAt) < DYNAMIC_SETS_TTL_MS) {
    return _dynamicSetsCache;
  }

  view = view ?? await buildFridgeView();
  recipesData = recipesData ?? await getRecipesFromDB();
  const { recipeOrder, recipes } = recipesData;
  const immIds = imminentIds(view);

  const missingMap = new Map(recipeOrder.map((id) => [id, getMissingInfo(view, recipes[id])]));
  const rescue = generateImminentRescueSet(view, recipes, recipeOrder, immIds, missingMap);
  const rescueDesc = rescue.recipeIds.length
    ? `임박 재료 ${rescue.coveredIds.length}가지를 요리 ${rescue.recipeIds.length}개로 해결해요`
      + (rescue.uncoveredIds.length
        ? ` (${rescue.uncoveredIds.map((id) => view[id]?.name ?? id).join('·')}은/는 이번 세트로 소진하지 못해요)`
        : '')
    : '';

  // 위에서 이미 계산해둔 missingMap(레시피별 부족 재료)을 재사용 — calculateCumulativeNeeds와
  // 같은 가격 규칙(estimateBuyCost)을 쓰므로 이 화면 비용과 실제 장보기 합계가 어긋나지 않는다.
  const recipeCosts = {};
  recipeOrder.forEach(id => {
    recipeCosts[id] = estimateBuyCost([missingMap.get(id)]);
  });

  const costRecipes = recipeOrder.filter(id => isMeal(recipes[id].category)).slice().sort((a, b) => {
    return recipeCosts[a] - recipeCosts[b];
  }).slice(0, 3);

  const { mealPool, sidePool } = getTypedPools(recipesData);

  const share2 = generateIngredientShareSet(view, recipes, mealPool, 2);
  const share7 = generateIngredientShareSet(view, recipes, mealPool, 7);

  const sideShare2 = generateIngredientShareSet(view, recipes, sidePool, 2);
  const sideShare7 = generateIngredientShareSet(view, recipes, sidePool, 7);

  const fullWeekRecipes = (await buildWeeklyPlan(pickedIds, view, { recipeOrder, recipes }, 'any', 'meal')).days
    .map(d => d.recipe?.id)
    .filter(Boolean);

  const result = [
    ...(rescue.recipeIds.length
      ? [{ id: 'imminentRescue', name: '임박 재료 구출 세트', badge: '추천', level: null, matchType: 'imminentRescue', setLevel: 'mid', recipeIds: rescue.recipeIds, desc: rescueDesc }]
      : []),
    { id: 'minCost', name: '최소 지출 완성 세트', badge: '가성비', level: null, matchType: 'minCost', setLevel: 'beginner', recipeIds: costRecipes },
    { id: 'ingredientShare', name: '식자재 쉐어링 세트 (식사)', badge: '알뜰', level: null, matchType: 'ingredientShare', setLevel: 'beginner', recipeIds2: share2.recipeIds, recipeIds7: share7.recipeIds, desc: '냉장고 재료를 활용해 최소한의 추가 구매로 2~7끼를 뚝딱!' },
    { id: 'sideShare', name: '밑반찬 쉐어링 세트', badge: '반찬', level: null, matchType: 'sideShare', setLevel: 'beginner', recipeIds2: sideShare2.recipeIds, recipeIds7: sideShare7.recipeIds, desc: '냉장고 재료를 활용해 반찬 2~7가지를 뚝딱!' },
    { id: 'fullWeek', name: '일주일 전체 식단 (7일)', badge: '대량', level: null, matchType: 'fullWeek', setLevel: 'mid', recipeIds: fullWeekRecipes },
  ];
  _dynamicSetsCache = result;
  _dynamicSetsCacheAt = Date.now();
  _dynamicSetsCacheKey = cacheKey;
  return result;
}

export async function getShoppingSets({ match = 'all', level = 'all', pickedIds = [], multiplier = 1.0 } = {}) {
  const view = await buildFridgeView();
  const recipesData = await getRecipesFromDB();
  const dbRecipes = recipesData.recipes;

  const dynamicSets = await generateDynamicSets(pickedIds, view, recipesData);

  const sets = await Promise.all(dynamicSets
    .filter((s) => (match === 'all' || s.matchType === match) && (level === 'all' || s.setLevel === level))
    .map(async (s) => {
      if (s.id === 'ingredientShare' || s.id === 'sideShare') {
        const { totalCost: t2 } = await calculateCumulativeNeeds(s.recipeIds2, multiplier, view, recipesData);
        const { totalCost: t7 } = await calculateCumulativeNeeds(s.recipeIds7, multiplier, view, recipesData);
        return {
          id: s.id,
          name: s.name,
          badge: s.badge,
          level: s.level,
          desc: s.desc,
          buyCount: null,
          dishCount: null,
          dishes: s.id === 'sideShare' ? '원하는 반찬 가짓수에 따라 레시피가 구성돼요' : '원하는 끼니 수에 따라 레시피가 구성돼요',
          totalRange: [t2, t7],
        };
      }
      const { needs, totalCost } = await calculateCumulativeNeeds(s.recipeIds, multiplier, view, recipesData);
      return {
        id: s.id,
        name: s.name,
        badge: s.badge,
        level: s.level,
        desc: s.desc,
        buyCount: needs.length,
        dishCount: s.recipeIds.length,
        dishes: s.recipeIds.map((id) => dbRecipes[id]?.name).filter(Boolean).join(' · '),
        total: totalCost,
      };
    }));

  return { sets };
}

export async function getShoppingList(setId, pickedIds = [], multiplier = 1.0, shareMealCount = 3) {
  const view = await buildFridgeView();
  const recipesData = await getRecipesFromDB();

  const dynamicSets = await generateDynamicSets(pickedIds, view, recipesData);
  let def = dynamicSets.find((s) => s.id === setId) ?? dynamicSets[0];

  if (setId === 'ingredientShare' || setId === 'sideShare') {
    const { mealPool, sidePool } = getTypedPools(recipesData);
    const pool = setId === 'sideShare' ? sidePool : mealPool;
    const share = generateIngredientShareSet(view, recipesData.recipes, pool, shareMealCount);
    const name = setId === 'sideShare' ? `반찬 ${shareMealCount}가지 쉐어링 세트` : `${shareMealCount}끼 식자재 쉐어링 세트`;
    def = { ...def, recipeIds: share.recipeIds, name };
  }

  const { needs, have, totalCost } = await calculateCumulativeNeeds(def.recipeIds, multiplier, view, recipesData);

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

// 매 슬롯마다 "이미 정해진 부족 품목(alreadySelected의 합집합)과의 합집합이 가장 작아지는"
// 레시피를 하나씩 추가하는 탐욕 배치. type==='side'(픽 1개, searchMinPurchaseCombo3가 요구하는
// 정확히 3-조합 형태가 안 나옴)이거나, type==='meal'인데 임박 재료가 적어 selectImminentGreedy가
// 월·수 2슬롯을 다 못 채웠을 때 나머지를 메우는 범용 폴백으로 쓴다.
function greedyFillSlots(recipes, poolIds, missingMap, alreadySelected, count) {
  const selected = [];
  let P = new Set();
  alreadySelected.forEach((id) => (missingMap.get(id) || new Map()).forEach((_, key) => P.add(key)));

  for (let i = 0; i < count; i++) {
    let bestId = null, minUnionSize = Infinity, maxBaseUsage = -1, bestP = null;

    for (const id of poolIds) {
      if (selected.includes(id)) continue;

      const rMissing = missingMap.get(id);
      const newP = new Set(P);
      (rMissing || new Map()).forEach((_, key) => newP.add(key));

      const unionSize = newP.size;

      // 베이스 활용도: 해당 레시피의 전체 재료 수에서 "새로 사야 하는 재료 수(newP.size - P.size)"를 뺀 값.
      // 즉, 냉장고에 이미 있거나 앞서 뽑힌 레시피들 때문에 어차피 사야 하는 재료들을 얼마나 알차게 활용하는지를 의미합니다.
      const totalIngs = recipes[id].ingredients.filter(ing => !isPantryOrVague(ing)).length;
      const baseUsage = totalIngs - (unionSize - P.size);

      if (unionSize < minUnionSize || (unionSize === minUnionSize && baseUsage > maxBaseUsage)) {
        minUnionSize = unionSize;
        maxBaseUsage = baseUsage;
        bestId = id;
        bestP = newP;
      }
    }

    if (!bestId) break;
    selected.push(bestId);
    P = bestP;
  }
  return selected;
}

export async function buildWeeklyPlan(pickedIds = [], view, recipesData, difficulty = 'any', type = 'meal') {
  recipesData = recipesData ?? await getRecipesFromDB();
  const { recipeOrder, recipes } = recipesData;
  view = view ?? await buildFridgeView();
  const immIds = imminentIds(view);

  // 1. 후보군 풀(pool) 구성: type에 따라 식사용/반찬용 필터 적용
  const diffPool = recipeOrder.filter(id => {
    const r = recipes[id];
    // type 필터
    if (type === 'meal' && !isMeal(r.category)) return false;
    if (type === 'side' && !isSideDish(r.category)) return false;
    // difficulty 필터
    if (difficulty !== 'any' && r.level !== difficulty) return false;
    return true;
  });

  if (diffPool.length === 0) return { days: [] };

  const targetPickCount = type === 'side' ? 1 : 2;

  // Step 0: 사용자 픽(picks) 고정 (DB에 있는 레시피만)
  const validPicks = (Array.isArray(pickedIds) ? pickedIds : []).filter(id => !!recipes[id]);
  const actualPicks = validPicks.length === targetPickCount
    ? validPicks
    : diffPool.slice(0, targetPickCount);

  if (actualPicks.length < targetPickCount) return { days: [] };

  const pool = diffPool.filter(id => !actualPicks.includes(id));

  // 레시피별 부족 재료 사전 계산
  const missingMap = new Map(recipeOrder.map((id) => [id, getMissingInfo(view, recipes[id])]));

  const slotCount = 7 - actualPicks.length;
  let remaining;

  if (type === 'meal') {
    // algorithms.md §6 Step 1 — 임박 재료 한계 이득 탐욕 선정으로 월·수 2슬롯을 먼저 채운다.
    const immSelected = selectImminentGreedy(view, recipes, pool, immIds, 2, missingMap);
    const afterImm = pool.filter((id) => !immSelected.includes(id));
    const comboSlotCount = slotCount - immSelected.length;

    if (comboSlotCount === 3) {
      // §6 Step 2~3 — 후보 K=25로 축소한 뒤 (부족 품목 종류 수, 예상 비용) 사전식 최소가 되는
      // 3-조합을 브루트포스로 찾는다(목·토·일). 임박 재료가 2개 다 채워졌을 때만 나오는,
      // 설계 문서가 상정한 정확히 7 = 픽2 + 임박2 + 조합3 형태.
      const fixedNeeds = mergeMissingMaps([...actualPicks, ...immSelected].map((id) => missingMap.get(id)));
      const candidates = shortlistCandidates(view, recipes, afterImm, new Set(fixedNeeds.keys()), missingMap, 25);
      remaining = [...immSelected, ...searchMinPurchaseCombo3(fixedNeeds, candidates)];
    } else {
      // 임박 재료가 적어(0~1개) selectImminentGreedy가 2슬롯을 다 못 채운 경우 — 남은 슬롯 수가
      // 3이 아니라 searchMinPurchaseCombo3(정확히 3개 조합 전용)를 쓸 수 없으므로, 기존
      // 식자재 쉐어링 탐욕(단계별 합집합 최소화)으로 나머지를 채운다.
      remaining = [...immSelected, ...greedyFillSlots(recipes, afterImm, missingMap, [...actualPicks, ...immSelected], comboSlotCount)];
    }
  } else {
    remaining = greedyFillSlots(recipes, pool, missingMap, actualPicks, slotCount);
  }

  const usesImminent = (id) =>
    id && recipes[id].ingredients.some((ing) => ing.id && immIds.includes(ing.id));
  
  remaining.sort((a, b) => {
    const aImm = usesImminent(a) ? 1 : 0;
    const bImm = usesImminent(b) ? 1 : 0;
    return bImm - aImm; // 임박 재료 사용하는 요리를 앞으로
  });

  // 픽이 1개(반찬형)인데 화/금 슬롯을 둘 다 예약해두면 actualPicks[1]이 항상 undefined라 금요일이
  // 비는 버그가 있었다 — 예약 슬롯 개수는 actualPicks.length가 아니라 targetPickCount로 결정한다
  // (이 시점엔 이미 위쪽 guard로 둘이 항상 같은 값이지만, targetPickCount가 의도를 드러내는 쪽).
  const week = new Array(7);
  const pickSlots = targetPickCount > 1 ? [1, 4] : [1];
  pickSlots.forEach((slot, i) => { week[slot] = actualPicks[i]; });

  let rIdx = 0;
  for (let i = 0; i < 7; i++) {
    if (!pickSlots.includes(i) && rIdx < remaining.length) {
      week[i] = remaining[rIdx++];
    }
  }

  // type === 'side'일 경우, 남은 픽(S)은 요일이 아니라 단순 목록으로 반환할 수도 있음.
  // 하지만 7일치 식단 UI를 재사용할 수도 있으므로 일단 동일하게 요일에 배치하되,
  // 반찬은 매일 먹는 것이므로 UI에서 라벨만 바꿔서 보여주는게 낫습니다.
  
  // 추천 이유 태그
  const reasonOf = (id) => {
    if (actualPicks.includes(id)) return null; // picked 배지가 이미 있음
    if (usesImminent(id)) return '⏰ 임박 재료 소진';
    return '🌱 식자재 쉐어링';
  };

  // 요약: 이번 주 전체 추가 구매 품목 수
  const weekNeeds = new Set();
  week.filter(Boolean).forEach((id) => missingMap.get(id).forEach((_, k) => weekNeeds.add(k)));

  return {
    days: week.filter(Boolean).map((id, i) => ({
      day:    dayLabels[i],
      recipe: { id, ...clone(recipes[id]) },
      picked: actualPicks.includes(id),
      reason: reasonOf(id),
    })),
    summary: `이번 주 추가 구매 품목을 ${weekNeeds.size}개로 압축했어요`,
  };
}

export async function getMealShoppingList(weekPlanIds, multiplier = 1.0) {
  const { needs, totalCost } = await calculateCumulativeNeeds(weekPlanIds, multiplier);
  const items = needs.map(n => ({
    label: `${n.label} (부족: ${formatAmtText(n.qty, n.isGram, n.originalAmt)})`,
    uses: n.uses,
    price: n.price
  }));
  return { items, total: totalCost };
}

// ─────────────────────────────────────────────────────────────────────────────
// mockServer 전용 Alias
// ─────────────────────────────────────────────────────────────────────────────
export const uploadReceipt = createReceipt;
export const getRecipes = listRecipes;
