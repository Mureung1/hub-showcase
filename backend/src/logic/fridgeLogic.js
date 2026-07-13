// fridge/recipes 상태를 다루는 순수 함수 모음 — index.html 프로토타입의 계산 로직을 그대로 옮김.
// mockServer(BE 역할)와 프론트 컴포넌트 양쪽에서 재사용한다.

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
  return ing.id ? (fridge[ing.id]?.name ?? ing.id) : ing.name;
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

// 조리 완료 시 실제로 차감될 재료 미리보기 목록 계산
export function buildDeductionState(fridge, recipe, checkedAddonIds) {
  const state = [];
  function pushEntry(id, addon, amtStr) {
    const f = fridge[id];
    if (!f || !f.items) return; // 미추적(가공식품) 재료는 차감하지 않음
    
    // items 배열의 qtyAmount 합산
    const remain = f.items.reduce((sum, it) => sum + (Number(it.qtyAmount) || 0), 0);
    if (remain <= 0) return; // 이미 소진된 재료는 차감할 게 없음
    
    let use = 1;
    if (amtStr) {
      if (amtStr.includes('g')) use = parseInt(amtStr) || 150;
      else if (amtStr.includes('반')) use = 0.5;
      else if (amtStr.includes('1/2')) use = 0.5;
      else if (amtStr.includes('1/3')) use = 0.33;
      else if (amtStr.includes('1/4')) use = 0.25;
      else if (amtStr.includes('1/8')) use = 0.125;
      else use = parseFloat(amtStr) || 1;
    }
    
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
