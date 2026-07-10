// fridge/recipes 상태를 다루는 순수 함수 모음 — index.html 프로토타입의 계산 로직을 그대로 옮김.
// mockServer(BE 역할)와 프론트 컴포넌트 양쪽에서 재사용한다.

export function fridgeAvailable(fridge, id) {
  const f = fridge[id];
  if (!f) return false; // 삭제됐거나 애초에 없던 재료 — "보유 안 함"으로 취급 (레시피 매칭이 크래시하지 않도록)
  return f.levels ? f.level < f.levels.length - 1 : true;
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
  return Object.keys(fridge).filter((id) => fridge[id].levels && fridge[id].imminent && fridgeAvailable(fridge, id));
}

// 조리 완료 시 실제로 차감될 재료 미리보기 목록 계산 (기본 사용량 = 1레벨)
export function buildDeductionState(fridge, recipe, checkedAddonIds) {
  const state = [];
  function pushEntry(id, addon) {
    const f = fridge[id];
    if (!f?.levels) return; // 삭제됐거나 미추적(펜트리) 재료는 차감하지 않음
    const remain = f.levels.length - 1 - f.level;
    if (remain <= 0) return; // 이미 소진된 재료는 차감할 게 없음
    state.push({ id, use: 1, max: remain, fixed: f.levels.length <= 2, addon: !!addon });
  }
  recipe.ingredients.forEach((ing) => { if (!ing.untracked && ing.id) pushEntry(ing.id, false); });
  recipe.addons.forEach((a) => { if (checkedAddonIds.includes(a.id)) pushEntry(a.id, true); });
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
