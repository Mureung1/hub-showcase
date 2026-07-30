import { initialFridge } from './data/initialFridge.js';
import { ingredientMap, calcExpiryDate } from './data/ingredients.js';
import { recipeOrder, recipes } from './data/recipes.js';
import { dayLabels, resolvePrice, resolvePackSize } from './data/mealPrices.js';
import {
  ingHave, ingName, recipeHasImminentBadge, imminentIds, isExpired, parseAmt, formatAmtText, extractUnit,
  getMissingInfo, generateImminentRescueSet, generateIngredientShareSet, estimateBuyCost, mergeMissingMaps,
  selectImminentGreedy, shortlistCandidates, searchMinPurchaseCombo3, lowStockIdsOf, selectPantryCleanupRecipe,
  isPantryOrVague, normalizeIngredientKey, calculateRecipeDifficulty, isMeal, isSideDish, CONTINUOUS_UNITS
} from './logic/fridgeLogic.js';
import { supabase } from './supabaseClient.js';
import { recognizeReceiptText } from './ocr/index.js';
import { matchReceiptLines } from './ocr/matchReceiptLines.js';
import { getPriceSnapshot } from './prices/priceCache.js';

// DEMO_TODAY가 아니면 호출 시점마다 새로 읽어야 서버를 재시작 없이 오래 켜둬도 D-day가 드리프트하지 않는다.
function today() {
  return process.env.DEMO_TODAY ? new Date(process.env.DEMO_TODAY) : new Date();
}

function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDday(dateStr) {
  const diff = Math.round((new Date(dateStr) - today()) / 86_400_000);
  return diff >= 0 ? `D-${diff}` : `D+${-diff}`;
}

export function ddayValue(label) {
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
  if (!supabase) return structuredClone(initialFridge);
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
  return structuredClone(await buildFridgeView());
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
  return structuredClone(view[id]);
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
  return structuredClone(view[id] || null);
}

export async function deleteFridgeItem(id) {
  const view = await buildFridgeView();
  if (!view[id]) return false;
  if (supabase) {
    await supabase.from('fridge_items').delete().eq('ingredient_id', id);
  }
  _dynamicSetsCache = null; // 냉장고 변경 시 세트 캐시 무효화
  return true;
}

// 유통기한이 지난 구매 내역만 골라 한 번에 버린다. 프론트가 updateFridgeItem(deleteItemIndex)로
// 하나씩 지우면 안 되는 이유: fetchFridge의 select에 order가 없어 행 순서가 보장되지 않는데,
// 여러 건을 지우는 동안 인덱스가 밀리면 멀쩡한 내역을 지울 수 있다 — 여기서 dbId로 지운다.
export async function discardExpiredItems() {
  const view = await buildFridgeView();
  const expired = Object.values(view).flatMap((f) =>
    (f.items ?? []).filter((it) => isExpired(it.expiry)).map((it) => ({ id: f.id, dbId: it.dbId })));

  for (const { dbId } of expired) {
    if (supabase && dbId) await supabase.from('fridge_items').delete().eq('id', dbId);
  }
  if (expired.length) _dynamicSetsCache = null; // 냉장고 변경 시 세트 캐시 무효화
  return { discarded: expired.map((e) => e.id) };
}

// Clova OCR 크레덴셜이 없거나(로컬 개발) 실제 인식이 실패했을 때 쓰는 기존 데모 로직.
// 재료 마스터에서 무작위 3가지를 뽑아 "스캔 완료"로 채운다.
function buildMockReceiptItems() {
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
  return items;
}

// file은 multer가 채운 req.file(버퍼+mimetype). recognizeReceiptText는 크레덴셜이 아예
// 없을 때만(로컬 개발 등) null을 반환하는데, 그때만 조용히 Mock으로 폴백한다 — 크레덴셜이
// 있는데 호출이 실패/타임아웃된 경우까지 Mock으로 감춰버리면 사용자가 가짜 인식 결과를
// 진짜로 착각해 냉장고에 엉뚱한 재료가 등록될 수 있으므로, 그 경우는 에러를 그대로 위로
// 던져 컨트롤러 → 프론트의 "다시 촬영해 주세요" 알림으로 이어지게 둔다.
export async function createReceipt(file) {
  const id = `r_${nextReceiptId++}`;

  let items;
  if (file) {
    const lines = await recognizeReceiptText(file.buffer, file.mimetype);
    if (lines) {
      const view = await buildFridgeView();
      items = matchReceiptLines(lines, ingredientMap, view);
    }
  }
  if (!items) items = buildMockReceiptItems();

  const record = {
    id,
    store: '이마트 신촌점',
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    status: 'partial',
    items,
  };
  receipts[id] = record;
  return structuredClone(record);
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
  return structuredClone(await buildFridgeView());
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

  // 청크 요청 하나가 실패해도(r.error) 예전엔 조용히 건너뛰어서, 레시피 6만여 개 중 만 단위로
  // 누락되는 게 눈에 안 띄었다(총 개수가 요청마다 들쭉날쭉했음). 최대 3번까지 재시도하고,
  // 그래도 실패하면 에러를 던져서 절반짜리 캐시가 조용히 자리잡는 걸 막는다.
  async function fetchRange(j) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await supabase.from('recipes').select('*').range(j * pageSize, (j + 1) * pageSize - 1);
      if (!r.error) return r.data ?? [];
      console.error(`getRecipesFromDB: range fetch failed for page ${j} (attempt ${attempt}/3):`, r.error.message);
    }
    throw new Error(`getRecipesFromDB: failed to fetch page ${j} after 3 attempts`);
  }

  for (let i = 0; i < pages; i += 10) {
    const chunkPromises = [];
    for (let j = i; j < Math.min(i + 10, pages); j++) {
      chunkPromises.push(fetchRange(j));
    }
    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach((rows) => data.push(...rows));
  }

  if (data.length !== count) {
    console.error(`getRecipesFromDB: expected ${count} rows but fetched ${data.length} — serving partial cache.`);
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
      tip: s.tip || '',
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

// page/pageSize: 필터 조건에 맞는 전체 개수(total)는 그대로 정확히 세되, 실제로 응답에 담아
// 보내는 목록(items)만 그 페이지 분량으로 자른다 — 66,981개(→ 필터 후에도 최대 수만 개) 전체를
// 매 요청마다 그대로 응답에 실어 보내던 게 22MB 페이로드의 원인이었다.
// sort='ratio': have/total(보유율) 내림차순 정렬 후 자른다 — Home 화면의 "추천 레시피"처럼
// DB 순서가 아니라 매칭률 상위 몇 개가 필요한 경우에 쓴다.
// sort='time'/'level': 레시피 리스트 화면의 정렬 드롭다운(조리시간 짧은순/난이도 낮은순)에서 사용.
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
      image_url:     r.image_url,
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
    ...structuredClone(r),
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
      fridgeInfo: view[a.id] ? structuredClone(view[a.id]) : null,
    })),
  };
}

// Supabase 클라이언트는 여러 문 트랜잭션을 지원하지 않아 진짜 원자성을 보장할 수 없다(docs/api.md §8).
// 대신 1패스에서 모든 deductions에 대해 어떤 fridge_items 행을 얼마나 update/delete할지 읽기 전용으로
// 전부 계산해두고(계산 오류가 이미 다른 항목을 쓴 *이후*에 터지는 상황 방지), 2패스에서만 실제로 쓴다.
export function planDeduction(currentFridge, id, use) {
  const ops = [];
  if (!(use > 0) || !currentFridge[id]?.items) return ops;

  const items = [...currentFridge[id].items].sort((a, b) => {
    const da = a.expiry ? ddayValue(a.expiry) : 999;
    const db = b.expiry ? ddayValue(b.expiry) : 999;
    return da - db;
  });

  // 프론트(buildDeductionState)가 이미 개수 단위를 올림해서 보내지만, 여기가 재고를 실제로
  // 깎는 유일한 지점이라 그 계산을 거치지 않고 호출돼도 "2.5개" 같은 재고가 남지 않게 한 번 더 막는다.
  const unit = items[0]?.qtyUnit || '';
  let remainingToDeduct = CONTINUOUS_UNITS.includes(unit) ? use : Math.ceil(use);
  for (let i = 0; i < items.length && remainingToDeduct > 0; i++) {
    const item = items[i];
    if (!item.dbId) continue;
    if (item.qtyAmount) {
      if (item.qtyAmount <= remainingToDeduct) {
        remainingToDeduct -= item.qtyAmount;
        ops.push({ action: 'delete', dbId: item.dbId });
      } else {
        ops.push({ action: 'update', dbId: item.dbId, qtyAmount: item.qtyAmount - remainingToDeduct });
        remainingToDeduct = 0;
      }
    } else {
      ops.push({ action: 'delete', dbId: item.dbId });
      remainingToDeduct = 0;
    }
  }
  return ops;
}

export async function cookDone(recipeId, deductions) {
  const { recipes } = await getRecipesFromDB();
  if (!recipes[recipeId]) {
    throw Object.assign(new Error(`cook-done: unknown recipe id "${recipeId}"`), { status: 400 });
  }

  const view = await buildFridgeView();
  const currentFridge = await fetchFridge();

  // 1패스: 계산만, DB 쓰기 없음.
  const plans = deductions.map(({ id, use }) => ({
    id,
    name: view[id]?.name || '',
    emoji: view[id]?.emoji || '',
    before: view[id]?.qtyLabel || '소진',
    ops: planDeduction(currentFridge, id, use),
  }));

  // 2패스: 실제 쓰기. 중간에 실패하면 그때까지 성공/실패한 항목을 구분해 에러에 담아 던진다 —
  // 완전한 롤백은 아니지만 최소한 어디까지 반영됐는지는 응답에서 알 수 있게 한다.
  const appliedIds = [];
  if (supabase) {
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      try {
        for (const op of plan.ops) {
          if (op.action === 'delete') {
            await supabase.from('fridge_items').delete().eq('id', op.dbId);
          } else {
            await supabase.from('fridge_items').update({ qty_amount: op.qtyAmount }).eq('id', op.dbId);
          }
        }
        appliedIds.push(plan.id);
      } catch (writeErr) {
        const err = new Error(`cook-done: 재고 차감 중 일부만 반영됐어요(${writeErr.message})`);
        err.status = 500;
        err.partiallyApplied = appliedIds;
        err.failed = plan.id;
        err.notAttempted = plans.slice(i + 1).map((p) => p.id);
        throw err;
      }
    }
  }

  _dynamicSetsCache = null; // 요리 완료 시 냉장고 재고 변경 안해 캐시 무효화
  const afterView = await buildFridgeView();
  const results = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    emoji: plan.emoji,
    before: plan.before,
    after: afterView[plan.id]?.qtyLabel || '소진',
  }));

  return { results, fridge: structuredClone(afterView) };
}

export async function getExpiryAlerts() {
  const view = await buildFridgeView();
  const ids  = imminentIds(view);
  const lowStockIds = lowStockIdsOf(view);

  return {
    items: ids.map((id) => ({ id, ...structuredClone(view[id]) })),
    lowStockItems: lowStockIds.map((id) => ({ id, ...structuredClone(view[id]) })),
  };
}

// 같은 재료라도 레시피마다 계량 단위가 다르다("대파 1/2뿌리" vs "즉석밥 2공기" vs "800g") —
// 숫자만 보고 그대로 더하면 서로 다른 단위가 섞여 수량·가격이 전부 틀어진다(예: 뿌리+컵+공기를
// 그대로 합쳐 "1047컵" 같은 결과가 나옴). key만이 아니라 단위까지 묶어서 단위가 같은 것끼리만
// 누적하고, 가격은 단위 그룹별로 따로 계산한 뒤 합산한다.
function unitTokenOf(isGram, amt) {
  return isGram ? 'g' : (extractUnit(amt) || '단위');
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

  const buyList = {}; // `${key}::${단위}` -> 단위가 같은 것끼리만 누적된 그룹
  const alreadyHaveList = {};

  recipeIds.forEach(id => {
    recipes[id].ingredients.forEach(ing => {
      if (isPantryOrVague(ing)) return;

      const key = normalizeIngredientKey(ing);
      const parsed = parseAmt(ing.amt);
      const isGram = parsed.isGram;
      const requiredQty = parsed.val * multiplier;
      const groupKey = `${key}::${unitTokenOf(isGram, ing.amt)}`;

      if (ing.id && view[ing.id]) {
        if (haveMap[ing.id] >= requiredQty) {
          haveMap[ing.id] -= requiredQty;

          if (!alreadyHaveList[groupKey]) alreadyHaveList[groupKey] = { label: ingName(view, ing), uses: [], qty: 0 };
          if (!alreadyHaveList[groupKey].uses.includes(recipes[id].name)) alreadyHaveList[groupKey].uses.push(recipes[id].name);
          alreadyHaveList[groupKey].qty += requiredQty;
        } else {
          const shortfall = requiredQty - (haveMap[ing.id] || 0);

          if (haveMap[ing.id] > 0) {
            if (!alreadyHaveList[groupKey]) alreadyHaveList[groupKey] = { label: ingName(view, ing), uses: [], qty: 0 };
            if (!alreadyHaveList[groupKey].uses.includes(recipes[id].name)) alreadyHaveList[groupKey].uses.push(recipes[id].name);
            alreadyHaveList[groupKey].qty += haveMap[ing.id];
          }

          haveMap[ing.id] = 0;

          if (!buyList[groupKey]) buyList[groupKey] = { key, label: ingName(view, ing), price: resolvePrice(key), uses: [], qty: 0, isGram, originalAmt: ing.amt };
          if (!buyList[groupKey].uses.includes(recipes[id].name)) buyList[groupKey].uses.push(recipes[id].name);
          buyList[groupKey].qty += shortfall;
        }
      } else {
        if (!buyList[groupKey]) buyList[groupKey] = { key, label: ingName(view, ing), price: resolvePrice(key), uses: [], qty: 0, isGram, originalAmt: ing.amt };
        if (!buyList[groupKey].uses.includes(recipes[id].name)) buyList[groupKey].uses.push(recipes[id].name);
        buyList[groupKey].qty += requiredQty;
      }
    });
  });

  // 단위 그룹별로 가격을 계산한 뒤, 화면엔 재료 하나당 한 줄로 합쳐서 보여준다 — 가격은 그룹별로
  // 계산해 합산(단위를 안 섞으니 정확함), 수량은 단위별로 나눠 적는다("800g + 7컵"처럼).
  const byKey = new Map();
  Object.values(buyList).forEach((n) => {
    const packSize = n.isGram ? 600 : resolvePackSize(n.key, extractUnit(n.originalAmt));
    const buyMultiplier = Math.ceil(n.qty / packSize);
    // 마트 1팩 단위 올림 가격(price) 외에, 실제 쓰는 양만큼만 계산한 "실소진 예상가"도 같이 낸다
    // (algorithms.md Part 3 Step 4 — 소량 재료가 팩 단가 올림으로 부풀려 보이는 걸 화면에서 구분해서 보여주기 위함).
    const actualUseCost = n.price * (n.qty / packSize);
    if (!byKey.has(n.key)) byKey.set(n.key, { label: n.label, uses: new Set(), price: 0, actualCost: 0, parts: [] });
    const agg = byKey.get(n.key);
    n.uses.forEach((u) => agg.uses.add(u));
    agg.price += n.price * buyMultiplier;
    agg.actualCost += actualUseCost;
    agg.parts.push({ qty: n.qty, isGram: n.isGram, originalAmt: n.originalAmt });
  });

  const needs = [...byKey.values()].map((agg) => ({
    label: agg.label,
    price: agg.price,
    actualCost: Math.round(agg.actualCost),
    uses: [...agg.uses],
    qty: agg.parts[0].qty,
    isGram: agg.parts[0].isGram,
    originalAmt: agg.parts[0].originalAmt,
    parts: agg.parts.length > 1 ? agg.parts : undefined,
  }));

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
  const missingMap = new Map(recipeOrder.map((id) => [id, getMissingInfo(view, recipes[id])]));
  const rescue = generateImminentRescueSet(view, recipes);
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
    actualCost: n.actualCost,
    checked: true,
  }));

  return { setName: def.name, buy, have, total: totalCost };
}

// q(검색어)가 있으면 재료명에 부분일치하는 것만 반환한다 — 화면의 검색창용.
export async function getPrices(q) {
  const snapshot = await getPriceSnapshot();
  const keyword = q?.trim();
  const list = keyword
    ? Object.values(ingredientMap).filter((ing) => ing.name.includes(keyword))
    : Object.values(ingredientMap);
  return {
    updatedAt: snapshot.updatedAt.toLocaleString('ko-KR'),
    items: list.map((ing) => ({
      id: ing.id,
      emoji: ing.emoji,
      name: ing.name,
      avg: snapshot.prices[ing.id].avg,
      diff: snapshot.prices[ing.id].diff,
      source: snapshot.prices[ing.id].source, // 'kamis'(실시간) | 'static'(폴백) — 화면에서 실시간 여부 구분용
    })),
  };
}

export async function getMealPlanCandidates() {
  const { recipeOrder, recipes } = await getRecipesFromDB();
  return { items: recipeOrder.map((id) => ({ id, ...structuredClone(recipes[id]) })) };
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
  // 프론트(AppContext 기본값·ShoppingSets 난이도 선택 시트)는 "전체 난이도"를 'all'로 보낸다 —
  // 'any'와 동일하게 취급하지 않으면 어떤 레시피도 level === 'all'일 수 없어 후보군이 항상 0개가 된다.
  if (difficulty === 'all') difficulty = 'any';
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

  // 일요일 "냉장고 털이" 슬롯 — 자투리(lowStockIds)를 가장 많이 소진하는 레시피를 먼저 예약해두고,
  // 나머지 슬롯은 그 레시피를 뺀 풀로 기존 임박/쉐어링 로직을 그대로 돌린다. 슬롯이 하나뿐인
  // side(반찬) 플랜에는 적용하지 않는다.
  let cleanupId = null;

  if (type === 'meal') {
    const lowStockIds = lowStockIdsOf(view);
    cleanupId = slotCount >= 1 ? selectPantryCleanupRecipe(view, recipes, pool, lowStockIds) : null;
    const mealPool = cleanupId ? pool.filter((id) => id !== cleanupId) : pool;
    const mealSlotCount = cleanupId ? slotCount - 1 : slotCount;

    // algorithms.md §6 Step 1 — 임박 재료 한계 이득 탐욕 선정으로 월·수 2슬롯을 먼저 채운다.
    const immSelected = selectImminentGreedy(view, recipes, mealPool, immIds, 2, missingMap);
    const afterImm = mealPool.filter((id) => !immSelected.includes(id));
    const comboSlotCount = mealSlotCount - immSelected.length;

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

  // remaining의 마지막 원소가 항상 일요일 슬롯에 배치되므로(week 배열 채우는 순서 참고),
  // 냉장고 털이 레시피를 맨 뒤에 붙여 일요일에 고정한다.
  if (cleanupId) remaining.push(cleanupId);

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
    if (id === cleanupId) return '🧹 냉장고 털이';
    if (usesImminent(id)) return '⏰ 임박 재료 소진';
    return '🌱 식자재 쉐어링';
  };

  // 요약: 이번 주 전체 추가 구매 품목 수
  const weekNeeds = new Set();
  week.filter(Boolean).forEach((id) => missingMap.get(id).forEach((_, k) => weekNeeds.add(k)));

  return {
    days: week.filter(Boolean).map((id, i) => ({
      day:    dayLabels[i],
      recipe: { id, ...structuredClone(recipes[id]) },
      picked: actualPicks.includes(id),
      reason: reasonOf(id),
    })),
    summary: `이번 주 추가 구매 품목을 ${weekNeeds.size}개로 압축했어요`,
  };
}

export async function getMealShoppingList(weekPlanIds, multiplier = 1.0) {
  const { needs, totalCost } = await calculateCumulativeNeeds(weekPlanIds, multiplier);
  const items = needs.map(n => {
    // 단위가 여러 개 섞인 재료(예: 즉석밥이 어떤 레시피는 g, 어떤 레시피는 컵/공기)는
    // 하나의 숫자로 억지로 합치지 않고 "800g + 7컵"처럼 단위별로 나눠서 보여준다.
    const amountText = n.parts
      ? n.parts.map((p) => formatAmtText(p.qty, p.isGram, p.originalAmt)).join(' + ')
      : formatAmtText(n.qty, n.isGram, n.originalAmt);
    return {
      label: `${n.label} (부족: ${amountText})`,
      uses: n.uses,
      price: n.price,
      actualCost: n.actualCost,
    };
  });
  return { items, total: totalCost };
}
