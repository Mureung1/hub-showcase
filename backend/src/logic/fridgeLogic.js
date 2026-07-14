// fridge/recipes 상태를 다루는 순수 함수 모음 — index.html 프로토타입의 계산 로직을 그대로 옮김.
// mockServer(BE 역할)와 프론트 컴포넌트 양쪽에서 재사용한다.
//
// amt 파싱/포맷 함수(parseAmt~formatAmtText)는 store.js·fetchRecipes.js·mockServer.js
// 세 곳에 각각 따로 구현돼 있다가 한 곳(store.js)만 고쳐지고 나머지 두 곳엔 예전 버그
// (parseInt(...) || 150 — "0.2g"처럼 정상 파싱된 값이 falsy라 기본값으로 덮어써지는 문제)가
// 남아있던 걸 여기 하나로 합쳤다. store.js와 mockServer.js 둘 다 이 파일에서 import해서 쓴다.

import { ingredientMap } from '../data/ingredients.js';

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
  if (ing.id) {
    return fridge[ing.id]?.name ?? ingredientMap[ing.id]?.name ?? ing.id;
  }
  return ing.name;
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

export function formatAmtText(qty, isGram, originalAmt) {
  // "약간"처럼 정량화되지 않은 표현은 배수를 곱해도 의미가 없다 — 원문 그대로 보여준다.
  if (originalAmt && VAGUE_AMOUNTS.some((w) => originalAmt.includes(w))) return originalAmt.trim();
  if (isGram) return formatGramQty(qty);

  const unit = originalAmt ? originalAmt.replace(/[0-9./반 ]/g, '') || '단위' : '단위';
  const { whole, fracLabel } = snapToNiceFraction(qty);

  if (!fracLabel) return `${whole}${unit}`;
  if (whole === 0) return `${fracLabel}${unit}`;
  return `${whole}${unit} 하고 ${fracLabel}${unit}`;
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
