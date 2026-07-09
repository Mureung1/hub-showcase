const screens = document.querySelectorAll("[data-screen]");
const toast = document.querySelector("#toast");
const loadingOverlay = document.querySelector("#loading-overlay");
const bottomSheet = document.querySelector("#bottom-sheet");
const sheetBackdrop = document.querySelector("#sheet-backdrop");
const codeModal = document.querySelector("#code-modal");
const codeModalBackdrop = document.querySelector("#code-modal-backdrop");
const inviteCode = document.querySelector("#invite-code");
const shareModal = document.querySelector("#share-modal");
const shareModalBackdrop = document.querySelector("#share-modal-backdrop");
const searchInput = document.querySelector("#recipe-search");
const emptyList = document.querySelector("#empty-list");
const draftButton = document.querySelector("#draft-button");
const sourceUrl = document.querySelector("#source-url");
const rawRecipe = document.querySelector("#raw-recipe");

let activeFilter = "all";
let toastTimer;
let currentDetailRecipeId = "kimchi";

const recipes = {
  kimchi: {
    eyebrow: "가족 레시피",
    title: "엄마 김치찌개",
    description: "김치를 충분히 볶고 오래 끓이는, 집에서 먹던 가장 익숙한 맛.",
    metadata: ["엄마가 알려준 레시피", "2인분 · 약 35분 · 최근 수정 2일 전", "AI가 초안을 정리했고, 저장 전에 직접 다듬었습니다."],
    ingredients: ["잘 익은 김치 2컵", "돼지고기 앞다리살 180g", "두부 반 모", "대파 1대", "멸치육수 500ml"],
    steps: ["냄비에 돼지고기를 넣고 겉면이 익을 때까지 볶습니다.", "김치를 넣고 중불에서 5분 정도 더 볶습니다.", "육수를 붓고 끓어오르면 불을 줄여 20분 더 끓입니다.", "두부와 대파를 넣고 간을 본 뒤 마무리합니다."],
    memo: "다음에는 두부를 조금 더 넣어도 좋겠다. 엄마는 마지막에 김칫국물을 한 숟가락 더 넣으면 맛이 선명해진다고 했다.",
    relationship: ["엄마가 알려준 레시피", "관계: 가족", "2026.07.10 전달받음 · 재공유 불가"],
    source: "직접 전해 받은 레시피",
    sourceMeta: "원본 내용은 내 레시피북에 저장된 기록 기준으로 표시됩니다.",
    canEdit: false,
    canPassShare: false
  },
  galbi: {
    eyebrow: "전달받은 레시피",
    title: "할머니 갈비찜",
    description: "명절마다 먹던 달지 않은 갈비찜. 오래 졸여 부드럽게 먹는 집안 레시피입니다.",
    metadata: ["민지가 전해준 레시피", "4인분 · 약 90분 · 2026.07.10 전달받음", "전달받은 레시피는 원본 수정과 재공유가 제한됩니다."],
    ingredients: ["소갈비 1kg", "무 1/3개", "당근 1개", "간장 6큰술", "배즙 반 컵"],
    steps: ["갈비는 찬물에 담가 핏물을 뺍니다.", "양념을 넣고 약한 불에서 천천히 졸입니다.", "무와 당근을 넣고 국물이 자작해질 때까지 익힙니다."],
    memo: "명절 전날 부엌에서 오래 졸이던 냄새가 생각난다.",
    relationship: ["민지가 전해준 레시피", "관계: 친구", "2026.07.10 전달받음 · 재공유 불가"],
    source: "가족에게 전해 받은 명절 레시피",
    sourceMeta: "원 저장자: 할머니 · AI 구조화 여부: 없음",
    canEdit: false,
    canPassShare: false
  },
  basil: {
    eyebrow: "내가 기록한 레시피",
    title: "민지의 바질 파스타",
    description: "면수와 바질 향을 살리는 간단한 파스타.",
    metadata: ["친구 민지와 함께 만든 기록", "1인분 · 약 20분 · 방금 저장됨", "AI가 초안을 정리했고, 저장 전에 직접 다듬었습니다."],
    ingredients: ["스파게티면 1인분", "바질 한 줌", "올리브오일 3큰술", "마늘 2쪽", "파르메산 치즈 조금"],
    steps: ["면을 삶는 동안 마늘을 약한 불에 천천히 익힙니다.", "면수와 바질을 넣고 빠르게 섞습니다.", "마지막에 치즈를 갈아 올립니다."],
    memo: "다음에는 바질을 조금 더 넉넉히 넣어도 좋겠다.",
    relationship: ["민지에게 배운 레시피", "관계: 친구", "내가 기록 · 최근 수정"],
    source: "직접 입력한 메모에서 정리",
    sourceMeta: "입력한 내용을 바탕으로 만든 초안입니다.",
    canEdit: true,
    canPassShare: true
  }
};

loadingOverlay.hidden = true;

function renderRecipeDetail(recipeId) {
  const recipe = recipes[recipeId] || recipes.kimchi;
  currentDetailRecipeId = recipeId;
  document.querySelector("#detail-eyebrow").textContent = recipe.eyebrow;
  document.querySelector("#detail-title").textContent = recipe.title;
  document.querySelector("#detail-description").textContent = recipe.description;
  document.querySelector("#detail-metadata").innerHTML = recipe.metadata.map((item) => `<span>${item}</span>`).join("");
  document.querySelector("#detail-ingredients").innerHTML = recipe.ingredients.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#detail-steps").innerHTML = recipe.steps.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#detail-memo").textContent = recipe.memo;
  document.querySelector("#detail-relationship").innerHTML = `<div class="relationship-name">${recipe.relationship[0]}</div><div class="relationship-detail">${recipe.relationship[1]}</div><div class="metadata">${recipe.relationship[2]}</div>`;
  document.querySelector("#detail-source").textContent = recipe.source;
  document.querySelector("#detail-source-meta").textContent = recipe.sourceMeta;
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
    if (screen.dataset.screen === "detail" && name !== "detail") {
      screen.classList.remove("cooking-mode");
      const toggle = screen.querySelector("[data-cooking-toggle]");
      if (toggle) toggle.setAttribute("aria-pressed", "false");
    }
  });
  closeSheet();
  closeCodeModal();
  closeShareModal();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2000);
}

function openSheet() {
  const recipe = recipes[currentDetailRecipeId] || recipes.kimchi;
  document.querySelectorAll("[data-requires-edit]").forEach((item) => {
    item.hidden = !recipe.canEdit;
  });
  document.querySelectorAll("[data-requires-pass-share]").forEach((item) => {
    item.hidden = !recipe.canPassShare;
  });
  sheetBackdrop.hidden = false;
  bottomSheet.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => bottomSheet.classList.add("is-open"));
}

function closeSheet() {
  bottomSheet.classList.remove("is-open");
  bottomSheet.setAttribute("aria-hidden", "true");
  sheetBackdrop.hidden = true;
}

function openCodeModal() {
  codeModalBackdrop.hidden = false;
  codeModal.setAttribute("aria-hidden", "false");
  inviteCode.focus();
}

function closeCodeModal() {
  codeModal.setAttribute("aria-hidden", "true");
  codeModalBackdrop.hidden = true;
}

function openShareModal() {
  shareModalBackdrop.hidden = false;
  shareModal.setAttribute("aria-hidden", "false");
}

function closeShareModal() {
  shareModal.setAttribute("aria-hidden", "true");
  shareModalBackdrop.hidden = true;
}

function updateDraftButton() {
  const hasInput = sourceUrl.value.trim().length > 0 || rawRecipe.value.trim().length > 0;
  draftButton.disabled = !hasInput;
}

function runMockLoading() {
  loadingOverlay.hidden = false;
  draftButton.disabled = true;
  setTimeout(() => {
    loadingOverlay.hidden = true;
    showScreen("editor");
    updateDraftButton();
  }, 900);
}

function applyListFilter() {
  const query = searchInput.value.trim().toLowerCase();
  const items = document.querySelectorAll(".recipe-list-item");
  let visibleCount = 0;

  items.forEach((item) => {
    const matchesQuery = item.dataset.search.toLowerCase().includes(query);
    const matchesFilter = activeFilter === "all" || item.dataset.category.split(" ").includes(activeFilter);
    const visible = matchesQuery && matchesFilter;
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  emptyList.classList.toggle("is-visible", visibleCount === 0);
}

document.addEventListener("click", (event) => {
  const screenTarget = event.target.closest("[data-screen-target]");
  if (screenTarget) {
    if (screenTarget.dataset.screenTarget === "detail" && screenTarget.dataset.recipeId) {
      renderRecipeDetail(screenTarget.dataset.recipeId);
    }
    showScreen(screenTarget.dataset.screenTarget);
    return;
  }

  if (event.target.closest("[data-open-sheet]")) {
    openSheet();
    return;
  }

  if (event.target === sheetBackdrop) {
    closeSheet();
    return;
  }

  if (event.target.closest("[data-open-code-modal]")) {
    openCodeModal();
    return;
  }

  if (event.target === codeModalBackdrop || event.target.closest("[data-close-code-modal]")) {
    closeCodeModal();
    return;
  }

  if (event.target === shareModalBackdrop || event.target.closest("[data-close-share-modal]")) {
    closeShareModal();
    return;
  }

  const copyShare = event.target.closest("[data-copy-share]");
  if (copyShare) {
    showToast(copyShare.dataset.copyShare === "link" ? "전달 링크가 복사되었습니다." : "초대 코드가 복사되었습니다.");
    return;
  }

  if (event.target.closest("[data-submit-code]")) {
    if (!inviteCode.value.trim()) {
      showToast("초대 코드를 입력해 주세요.");
      return;
    }
    closeCodeModal();
    showScreen("received");
    return;
  }

  const sheetAction = event.target.closest("[data-sheet-action]");
  if (sheetAction) {
    const action = sheetAction.dataset.sheetAction;
    closeSheet();
    if (action === "edit") showScreen("editor");
    if (action === "view-share") showToast("열람 링크가 준비되었습니다.");
    if (action === "pass-share") openShareModal();
    if (action === "delete") showToast("프로토타입에서는 삭제하지 않습니다.");
    return;
  }

  const cookingToggle = event.target.closest("[data-cooking-toggle]");
  if (cookingToggle) {
    const detailScreen = document.querySelector('[data-screen="detail"]');
    const nextState = cookingToggle.getAttribute("aria-pressed") !== "true";
    cookingToggle.setAttribute("aria-pressed", String(nextState));
    detailScreen.classList.toggle("cooking-mode", nextState);
    showToast(nextState ? "조리 중 보기를 켰습니다." : "조리 중 보기를 종료했습니다.");
    return;
  }

  const filterChip = event.target.closest("[data-filter]");
  if (filterChip) {
    activeFilter = filterChip.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((chip) => {
      chip.classList.toggle("is-selected", chip === filterChip);
    });
    applyListFilter();
    return;
  }

  const relationChip = event.target.closest("[data-relation-chip]");
  if (relationChip) {
    document.querySelectorAll("[data-relation-chip]").forEach((chip) => {
      chip.classList.toggle("is-selected", chip === relationChip);
    });
    return;
  }

  if (event.target.closest("[data-focus-search]")) {
    searchInput.focus();
    return;
  }

  if (event.target.closest("[data-save-editor]")) {
    showToast("레시피북에 저장되었습니다.");
    renderRecipeDetail("basil");
    showScreen("detail");
    return;
  }

  if (event.target.closest("[data-save-received]")) {
    showToast("레시피북에 저장되었습니다.");
    renderRecipeDetail("galbi");
    showScreen("detail");
  }
});

draftButton.addEventListener("click", runMockLoading);
sourceUrl.addEventListener("input", updateDraftButton);
rawRecipe.addEventListener("input", updateDraftButton);
searchInput.addEventListener("input", applyListFilter);

updateDraftButton();
applyListFilter();
renderRecipeDetail(currentDetailRecipeId);
