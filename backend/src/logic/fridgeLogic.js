// fridge/recipes 상태를 다루는 순수 함수 모음 — index.html 프로토타입의 계산 로직을 그대로 옮김.
// mockServer(BE 역할)와 프론트 컴포넌트 양쪽에서 재사용한다.
//
// amt 파싱/포맷 함수(parseAmt~formatAmtText)는 store.js·fetchRecipes.js·mockServer.js
// 세 곳에 각각 따로 구현돼 있다가 한 곳(store.js)만 고쳐지고 나머지 두 곳엔 예전 버그
// (parseInt(...) || 150 — "0.2g"처럼 정상 파싱된 값이 falsy라 기본값으로 덮어써지는 문제)가
// 남아있던 걸 여기 하나로 합쳤다. store.js와 mockServer.js 둘 다 이 파일에서 import해서 쓴다.

import { ingredientMap } from '../data/ingredients.js';
import { resolvePrice, resolvePackSize } from '../data/mealPrices.js';

// 식사/반찬 카테고리 판별 헬퍼
export function isSideDish(category) {
  return ['반찬', '밑반찬', '김치/젓갈/장류'].includes(category);
}

export function isMeal(category) {
  const excluded = ['반찬', '밑반찬', '김치/젓갈/장류', '차/음료/술', '디저트', '과자', '후식', '빵', '양념/소스/잼'];
  return !excluded.includes(category);
}

export function fridgeAvailable(fridge, id) {
  const f = fridge[id];
  if (!f) return false;
  return f.items && f.items.length > 0;
}

export function ingHave(fridge, ing) {
  if (ing.untracked) return true;
  return ing.id ? fridgeAvailable(fridge, ing.id) : false;
}

export function ingName(fridge, ing) {
  if (!ing) return '';
  if (typeof ing === 'string') return ing;
  if (ing.id) {
    const fromFridge = fridge[ing.id];
    const fromMap = ingredientMap[ing.id];
    return (fromFridge && typeof fromFridge === 'object' ? fromFridge.name : null) ?? 
           (fromMap && typeof fromMap === 'object' ? fromMap.name : null) ?? 
           ing.id;
  }
  return ing.name || '';
}

export function recipeRatio(fridge, recipes, id) {
  const r = recipes[id];
  return r.ingredients.filter((ing) => ingHave(fridge, ing)).length / r.ingredients.length;
}

export function recipeHasImminentBadge(fridge, recipes, id) {
  return recipes[id].ingredients.some((ing) => ing.id && fridge[ing.id]?.imminent && fridgeAvailable(fridge, ing.id));
}

export function imminentIds(fridge) {
  return Object.keys(fridge).filter((id) => fridge[id].imminent && fridgeAvailable(fridge, id));
}

// "약간"·"적당량"처럼 정량화되지 않은 표현 — 배수를 곱해도 의미가 없어서(예: "2약간")
// formatAmtText에서 원문 그대로 통과시키는 데 쓴다. fetchRecipes.js도 같은 목록을 써서
// 이런 줄을 "숫자·쉼표 없는 헤더 줄"로 오인해 통째로 버리지 않게 한다.
export const VAGUE_AMOUNTS = ['약간', '적당량', '적당히', '조금', '소량'];

// amt 문자열(예: "0.2g", "1/4개", "반단")에서 기준 수량만 뽑아낸다. 배수 적용·반올림은 하지 않는다 —
// 호출부가 필요에 따라(화면 표시용 formatAmtText, 재고 차감용 raw 값 등) 각자 처리한다.
// `parseInt(...) || fallback` 형태는 "0.2g"·"0g"처럼 정상 파싱된 값이 0(또는 truncate로 0이 되는
// 소수)일 때도 falsy로 취급해 엉뚱한 기본값으로 덮어써버린다 — 실제 API 재료(소금 0.2g 등)에서 재현됨.
export function parseAmt(amtStr) {
  if (!amtStr) return { val: 1, isGram: false };
  
  const lower = amtStr.toLowerCase();
  
  // kg, L 등 단위 변환 처리
  const unitMatch = lower.match(/([0-9.]+)\s*(g|ml|kg|l)(?![a-z])/);
  if (unitMatch) {
    let val = parseFloat(unitMatch[1]);
    const unit = unitMatch[2];
    if (unit === 'kg' || unit === 'l') val *= 1000;
    return { val: Number.isNaN(val) ? 150 : val, isGram: true };
  }

  // 명확한 패턴이 없어도 g나 ml가 포함되어 있으면 무게/부피(연속량)로 취급
  if (lower.includes('g') || lower.includes('ml')) {
    const val = parseFloat(amtStr);
    return { val: Number.isNaN(val) ? 150 : val, isGram: true };
  }

  if (amtStr.includes('반')) return { val: 0.5, isGram: false };
  if (amtStr.includes('1/2')) return { val: 0.5, isGram: false };
  if (amtStr.includes('1/3')) return { val: 0.33, isGram: false };
  if (amtStr.includes('1/4')) return { val: 0.25, isGram: false };
  if (amtStr.includes('1/8')) return { val: 0.125, isGram: false };
  const val = parseFloat(amtStr);
  return { val: Number.isNaN(val) ? 1 : val, isGram: false };
}

// g/ml 같은 연속량은 배수를 곱한 값을 그대로 보여준다. 10g 미만(소금 0.2g 같은 극소량)은
// 소수 첫째 자리까지 살려야 배수를 바꿨을 때 실제로 값이 움직이는 게 보인다 — 정수로
// 반올림하면 0.2g도 0.6g(3인분)도 전부 "0g"이 돼버린다. 10g 이상은 정수로 반올림.
export function formatGramQty(qty) {
  if (qty <= 0) return '0g';
  const rounded = qty < 10 ? Math.round(qty * 10) / 10 : Math.round(qty);
  return `${rounded}g`;
}

// 개/쪽/알/큰술처럼 낱개·계량스푼 단위는 배수를 곱한 값을 그대로 쓰면 "7/5쪽" 같은 실제로
// 잴 수 없는 분수가 나온다. 요리에서 실제로 쓰는 분수(1/8·1/4·1/3·1/2·2/3·3/4)와 정수 중
// 가장 가까운 값으로 스냅해서 항상 계량 가능한 표현만 나오게 한다.
export const NICE_FRACTIONS = [
  { frac: 0, label: '' },
  { frac: 1 / 8, label: '1/8' },
  { frac: 1 / 4, label: '1/4' },
  { frac: 1 / 3, label: '1/3' },
  { frac: 1 / 2, label: '1/2' },
  { frac: 2 / 3, label: '2/3' },
  { frac: 3 / 4, label: '3/4' },
  { frac: 1, label: '' }, // 다음 정수로 올림
];

export function snapToNiceFraction(qty) {
  const intPart = Math.floor(qty);
  const frac = qty - intPart;
  const best = NICE_FRACTIONS.reduce((a, b) => (Math.abs(frac - b.frac) < Math.abs(frac - a.frac) ? b : a));
  return best.frac === 1 ? { whole: intPart + 1, fracLabel: '' } : { whole: intPart, fracLabel: best.label };
}

// amt 원문에서 숫자·분수·공백을 뺀 순수 단위 문자열만 뽑는다 (예: "8쪽" → "쪽").
// formatAmtText(화면 표시)와 resolvePackSize(팩 크기 추정)가 같은 단위 추출 규칙을 공유한다.
export function extractUnit(originalAmt) {
  return originalAmt ? originalAmt.replace(/[0-9./반 ]/g, '') || '단위' : '단위';
}

export function formatAmtText(qty, isGram, originalAmt) {
  // "약간"처럼 정량화되지 않은 표현은 배수를 곱해도 의미가 없다 — 원문 그대로 보여준다.
  if (originalAmt && VAGUE_AMOUNTS.some((w) => originalAmt.includes(w))) return originalAmt.trim();
  if (isGram) return formatGramQty(qty);

  const unit = extractUnit(originalAmt);
  const { whole, fracLabel } = snapToNiceFraction(qty);

  if (!fracLabel) return `${whole}${unit}`;
  if (whole === 0) return `${fracLabel}${unit}`;
  return `${whole}${unit} 하고 ${fracLabel}${unit}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 식단 알고리즘 (docs/식단 알고리즘 설계.md §6~§8)
// store.js(실서버)와 mockServer.js(FE 폴백)가 같은 조합 탐색을 쓰도록 순수 함수로 분리.
// ═══════════════════════════════════════════════════════════════════════════

// 구매 최적화에서 제외할 상비 조미료 — 실데이터(식품안전나라 레시피)에선 소금·후춧가루·물이
// 거의 모든 레시피의 부족 품목으로 잡혀, 이걸 세면 어떤 조합을 골라도 품목 수 차이가 안 난다.
export const PANTRY_STAPLES = [
  '물', '소금', '설탕', '후춧가루', '후추', '흰후추', '식용유', '참기름', '들기름',
  '올리브오일', '올리브유', '다진마늘', '맛술', '청주', '통깨', '참깨',
];

// 이름 정규화용 수식어 — fetchRecipes.js의 PREP_MODIFIERS와 같은 목록.
// "멸치" vs "마른 멸치"처럼 같은 재료가 표기 차이로 별개 품목으로 세어지는 걸 막는다.
const NAME_MODIFIERS = [
  '다진', '채썬', '슬라이스', '으깬', '데친', '삶은', '잘게썬', '어슷썬', '얇게썬',
  '마른', '붉은', '볶은', '불린', '흰',
];

export function normalizeIngredientKey(ing) {
  if (ing.id) return ing.id;
  let name = (ing.name || '').replace(/\s+/g, '');
  for (const w of NAME_MODIFIERS) {
    if (name.startsWith(w) && name.length > w.length) { name = name.slice(w.length); break; }
  }
  return name;
}

function stockQtyOf(view, id) {
  const f = view[id];
  if (!f || !f.items) return 0;
  return f.items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
}

// "구매 목록/비용 계산에서 제외해야 하는 재료인가"의 단일 판정 — getMissingInfo(식단 최적화)와
// calculateCumulativeNeeds(실제 장보기 리스트/금액, store.js·mockServer.js)가 이 함수 하나를
// 공유해야 한다. 예전엔 두 곳이 각자 "untracked만" 또는 "물만" 제외하는 식으로 따로 구현돼 있어서,
// 최적화가 최소화하는 부족 품목 집합과 사용자에게 보여주는 장보기 목록·금액이 서로 다른 정의를 썼다.
export function isPantryOrVague(ing) {
  if (ing.untracked) return true;
  const key = normalizeIngredientKey(ing);
  if (!key || PANTRY_STAPLES.includes(key)) return true;
  if (ing.amt && VAGUE_AMOUNTS.some((w) => ing.amt.includes(w))) return true;
  return false;
}

// 레시피의 "구매가 필요한" 재료 정보: Map(정규화키 → { qty, isGram, label, originalAmt }).
// 조미료(untracked)·상비재료·"약간"뿐인 재료는 제외, id 재료는 재고 수량과 대조해 부족분만 담는다.
// originalAmt는 estimateBuyCost가 팩 크기(resolvePackSize)를 추정할 때 단위(쪽/개/cm 등)를 뽑는 데 쓴다.
export function getMissingInfo(view, recipe, multiplier = 1) {
  const map = new Map();
  const add = (key, qty, isGram, label, originalAmt) => {
    const cur = map.get(key);
    if (cur) cur.qty += qty;
    else map.set(key, { qty, isGram, label, originalAmt });
  };
  recipe.ingredients.forEach((ing) => {
    if (isPantryOrVague(ing)) return;
    const key = normalizeIngredientKey(ing);
    const parsed = parseAmt(ing.amt);
    const req = parsed.val * multiplier;
    if (ing.id && view[ing.id]) {
      const stock = stockQtyOf(view, ing.id);
      if (stock >= req) return;
      add(key, req - stock, parsed.isGram, ingName(view, ing), ing.amt);
    } else {
      add(key, req, parsed.isGram, ing.name || key, ing.amt);
    }
  });
  return map;
}

// 여러 레시피의 부족 품목 Map을 하나로 합친다(같은 키는 qty를 더함) — estimateBuyCost와
// buildWeeklyPlan의 조합 탐색(searchMinPurchaseCombo3에 넘길 P_fixed)이 이 병합 규칙을 공유해야
// "이미 사기로 한 재료"와 "새로 사야 하는 재료"가 이중으로 잡히지 않는다.
export function mergeMissingMaps(needMaps) {
  const merged = new Map();
  needMaps.forEach((m) => m.forEach((v, k) => {
    const cur = merged.get(k);
    if (cur) cur.qty += v.qty;
    else merged.set(k, { ...v });
  }));
  return merged;
}

// 부족 품목 집합(need Map 여러 개)의 실구매 예상 비용.
// calculateCumulativeNeeds와 같은 규칙(g 재료는 600g 팩 단위 올림, 개수 단위 재료는 resolvePackSize로
// 추정한 팩 크기 단위 올림, resolvePrice로 가격 조회)을 쓴다 — 탐색이 고른 "최저가" 조합이 장보기
// 화면의 실제 합계와 어긋나지 않게 하기 위함.
export function estimateBuyCost(needMaps) {
  const merged = mergeMissingMaps(needMaps);
  let cost = 0;
  merged.forEach((v, k) => {
    const packs = v.isGram
      ? Math.ceil(v.qty / 600)
      : Math.ceil(v.qty / resolvePackSize(k, extractUnit(v.originalAmt)));
    cost += resolvePrice(k) * Math.max(1, packs);
  });
  return cost;
}

// §6 Step 1 — 한계 이득(marginal gain) 탐욕 선정: 이미 앞 요리가 커버한 임박 재료는 제외하고,
// 남은 임박 재료를 가장 많이 쓰는 레시피를 다음 슬롯에 배치한다. 단순 "임박 포함 수 정렬"은
// 같은 재료(두부)를 쓰는 요리 2개가 뽑혀 다른 임박 재료(돼지고기)를 방치할 수 있다.
export function selectImminentGreedy(view, recipes, poolIds, immIds, slots, missingMap) {
  const selected = [];
  const uncovered = new Set(immIds.filter((id) => stockQtyOf(view, id) > 0));
  for (let s = 0; s < slots && uncovered.size > 0; s++) {
    let best = null, bestGain = 0, bestMissing = Infinity, bestTime = Infinity;
    for (const id of poolIds) {
      if (selected.includes(id)) continue;
      const r = recipes[id];
      const gain = r.ingredients.filter((ing) => ing.id && uncovered.has(ing.id)).length;
      if (gain === 0) continue;
      const missing = missingMap.get(id)?.size ?? Infinity;
      const time = r.time || 999;
      if (gain > bestGain
        || (gain === bestGain && missing < bestMissing)
        || (gain === bestGain && missing === bestMissing && time < bestTime)) {
        best = id; bestGain = gain; bestMissing = missing; bestTime = time;
      }
    }
    if (!best) break;
    selected.push(best);
    recipes[best].ingredients.forEach((ing) => { if (ing.id) uncovered.delete(ing.id); });
  }
  return selected;
}

// §6 Step 2 — 조합 탐색에 올릴 후보 상위 K개로 축소. 레시피가 1,000개로 늘어도
// Step 3 탐색량이 C(K,3)으로 고정된다.
export function shortlistCandidates(view, recipes, poolIds, fixedKeys, missingMap, K = 25) {
  return poolIds
    .map((id) => {
      const r = recipes[id];
      const haveCount = r.ingredients.filter((ing) => ingHave(view, ing)).length;
      let overlap = 0, fresh = 0;
      (missingMap.get(id) ?? new Map()).forEach((_, k) => { if (fixedKeys.has(k)) overlap++; else fresh++; });
      return { id, score: haveCount * 2 + overlap - fresh * 3 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, K)
    .map((c) => ({ id: c.id, missing: missingMap.get(c.id) ?? new Map() }));
}

// §6 Step 3 — C(K,3) 브루트포스 + 부분합 가지치기.
// (유니크 부족 품목 수, 실구매 비용) 사전식 최소화로 3개 레시피 조합을 고른다.
export function searchMinPurchaseCombo3(fixedNeeds, candidates) {
  const n = candidates.length;
  if (n <= 3) return candidates.map((c) => c.id);
  const fixedKeys = [...fixedNeeds.keys()];
  let best = null, bestP = Infinity, bestCost = Infinity;
  for (let i = 0; i < n; i++) {
    const mi = candidates[i].missing;
    for (let j = i + 1; j < n; j++) {
      const mj = candidates[j].missing;
      const pab = new Set(fixedKeys);
      mi.forEach((_, k) => pab.add(k));
      mj.forEach((_, k) => pab.add(k));
      if (pab.size > bestP) continue; // c를 더해도 품목 수는 줄어들 수 없음
      for (let k2 = j + 1; k2 < n; k2++) {
        const mk = candidates[k2].missing;
        const p = new Set(pab);
        mk.forEach((_, kk) => p.add(kk));
        if (p.size > bestP) continue;
        const cost = estimateBuyCost([fixedNeeds, mi, mj, mk]);
        if (p.size < bestP || (p.size === bestP && cost < bestCost)) {
          bestP = p.size; bestCost = cost;
          best = [candidates[i].id, candidates[j].id, candidates[k2].id];
        }
      }
    }
  }
  return best ?? candidates.slice(0, 3).map((c) => c.id);
}

// §7 — 임박 재료 구출 세트: 요리 수 k를 1부터 올려가며 임박 재료 전량 커버 조합을 찾는
// Set Cover 브루트포스. k≤3 고정이라 정확해가 나온다. 전량 커버가 불가능하면 최대 커버
// 조합과 함께 uncoveredIds를 돌려줘 "△△는 소진하지 못해요" 안내에 쓴다.
export function generateImminentRescueSet(view, recipes, recipeOrder, immIds, missingMap, { kMax = 3, candM = 30 } = {}) {
  const targets = immIds.filter((id) => stockQtyOf(view, id) > 0);
  if (targets.length === 0) return { recipeIds: [], coveredIds: [], uncoveredIds: [] };

  const usesImm = (rid) =>
    recipes[rid].ingredients.filter((ing) => ing.id && targets.includes(ing.id)).map((ing) => ing.id);

  const cand = recipeOrder
    .filter((rid) => usesImm(rid).length > 0)
    .sort((a, b) =>
      usesImm(b).length - usesImm(a).length
      || (missingMap.get(a)?.size ?? 0) - (missingMap.get(b)?.size ?? 0))
    .slice(0, candM);
  if (cand.length === 0) return { recipeIds: [], coveredIds: [], uncoveredIds: targets };

  const covMap = new Map(cand.map((rid) => [rid, new Set(usesImm(rid))]));

  let best = null;
  const consider = (ids) => {
    const covered = new Set();
    ids.forEach((rid) => covMap.get(rid).forEach((x) => covered.add(x)));
    const missKeys = new Set();
    ids.forEach((rid) => (missingMap.get(rid) ?? new Map()).forEach((_, k) => missKeys.add(k)));
    if (!best
      || covered.size > best.covered.size
      || (covered.size === best.covered.size && ids.length < best.ids.length)
      || (covered.size === best.covered.size && ids.length === best.ids.length && missKeys.size < best.missingCount)) {
      best = { ids: ids.slice(), covered, missingCount: missKeys.size };
    }
  };

  for (let k = 1; k <= Math.min(kMax, cand.length); k++) {
    const walk = (start, acc) => {
      if (acc.length === k) { consider(acc); return; }
      for (let i = start; i < cand.length; i++) {
        acc.push(cand[i]);
        walk(i + 1, acc);
        acc.pop();
      }
    };
    walk(0, []);
    if (best && best.covered.size === targets.length) break; // 전량 커버를 달성한 최소 k에서 종료
  }

  return {
    recipeIds: best.ids,
    coveredIds: [...best.covered],
    uncoveredIds: targets.filter((t) => !best.covered.has(t)),
  };
}

// 조리 완료 시 실제로 차감될 재료 미리보기 목록 계산
export function buildDeductionState(fridge, recipe, checkedAddonIds) {
  const state = [];
  function pushEntry(id, addon, amtStr) {
    const f = fridge[id];
    if (!f || !f.items) return; // 미추적(가공식품) 재료는 차감하지 않음

    // items 배열의 qtyAmount 합산
    const remain = f.items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
    if (remain <= 0) return; // 이미 소진된 재료는 차감할 게 없음

    const use = amtStr ? parseAmt(amtStr).val : 1;

    state.push({ id, use, max: remain, fixed: false, addon: !!addon, unit: f.items[0]?.qtyUnit });
  }
  recipe.ingredients.forEach((ing) => { if (!ing.untracked && ing.id) pushEntry(ing.id, false, ing.amt); });
  recipe.addons.forEach((a) => { if (checkedAddonIds.includes(a.id)) pushEntry(a.id, true, a.label); });
  return state;
}

// 체크된 추가 재료를 원래 조리 순서 사이에 끼워 넣은 전체 스텝 목록
export function buildSteps(recipe, checkedAddonIds) {
  const steps = recipe.steps.slice();
  recipe.addons
    .slice()
    .sort((a, b) => b.after - a.after)
    .forEach((a) => {
      if (checkedAddonIds.includes(a.id)) {
        steps.splice(a.after + 1, 0, { ...a.step, add: true });
      }
    });
  return steps;
}

// 유니크 구매 종류 최소화를 위한 식자재 쉐어링 세트 (탐욕 알고리즘)
export function generateIngredientShareSet(view, recipes, recipeOrder, mealCount = 3) {
  if (recipeOrder.length < mealCount) return { recipeIds: [], desc: '' };

  const missingMap = new Map();
  recipeOrder.forEach(id => {
    missingMap.set(id, getMissingInfo(view, recipes[id], 1));
  });

  const S = [];
  let P = new Set(); 

  for (let i = 0; i < mealCount; i++) {
    let bestId = null;
    let minUnionSize = Infinity;
    let maxBaseUsage = -1;
    let bestP = null;

    for (const id of recipeOrder) {
      if (S.includes(id)) continue;
      
      const rMissing = missingMap.get(id);
      const newP = new Set(P);
      for (const key of rMissing.keys()) {
        newP.add(key);
      }
      
      const unionSize = newP.size;
      
      const totalIngs = recipes[id].ingredients.filter(ing => !isPantryOrVague(ing)).length;
      const baseUsage = totalIngs - (unionSize - P.size);

      if (unionSize < minUnionSize || (unionSize === minUnionSize && baseUsage > maxBaseUsage)) {
        minUnionSize = unionSize;
        maxBaseUsage = baseUsage;
        bestId = id;
        bestP = newP;
      }
    }
    
    if (bestId) {
      S.push(bestId);
      P = bestP;
    } else {
      break;
    }
  }

  let desc = '';
  if (P.size > 0) {
    // missingMap에는 정규화된 key가 저장되지만 label도 활용 가능함. 여기선 key를 그대로 쓴다.
    // 더 나은 표시를 위해 첫번째 레시피의 missingMap에서 label을 찾음
    const getLabel = (key) => {
      for (const id of S) {
        const m = missingMap.get(id);
        if (m && m.has(key)) return m.get(key).label;
      }
      return key;
    };
    
    const missingLabels = Array.from(P).map(getLabel);
    const display = missingLabels.slice(0, 2);
    const etc = missingLabels.length > 2 ? ` 외 ${missingLabels.length - 2}종` : '';
    desc = `${display.join(', ')}${etc}만 사면 ${mealCount}끼가 뚝딱!`;
  } else {
    desc = `추가 구매 없이 냉장고 재료만으로 ${mealCount}끼를 만들 수 있어요!`;
  }

  return { recipeIds: S, desc };
}

// 레시피 난이도 동적 계산
export function calculateRecipeDifficulty(recipe) {
  const ingCount = recipe.ingredients ? recipe.ingredients.length : 0;
  const stepCount = recipe.steps ? recipe.steps.length : 0;
  
  // 만개의 레시피 CSV처럼 조리 과정 데이터가 없는 경우, DB에 있는 기존 난이도를 그대로 리턴합니다.
  if (stepCount === 0 && recipe.level) {
    if (recipe.level === 'beginner') return { level: 'beginner', levelLabel: '🟢 쉬움' };
    if (recipe.level === 'mid') return { level: 'mid', levelLabel: '🟡 보통' };
    if (recipe.level === 'expert') return { level: 'expert', levelLabel: '🔴 어려움' };
  }
  
  // 가중치: 재료 가짓수(2) + 조리 과정(1)
  const score = (ingCount * 2) + stepCount;
  
  if (score < 10) {
    return { level: 'beginner', levelLabel: '🟢 쉬움' };
  } else if (score < 14) {
    return { level: 'mid', levelLabel: '🟡 보통' };
  } else {
    return { level: 'expert', levelLabel: '🔴 어려움' };
  }
}

