const MS_PER_DAY = 1000 * 60 * 60 * 24;

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const ingredients = [
  { id: 1, name: "계란", quantity: "6개", expiry: addDays(10) },
  { id: 2, name: "김치", quantity: "1/2통", expiry: addDays(5) },
  { id: 3, name: "두부", quantity: "1모", expiry: addDays(2) },
  { id: 4, name: "밥", quantity: "2공기", expiry: addDays(7) }
];

const menusByFilter = {
  balanced: [
    {
      id: "tofu-kimchi-bowl",
      badge: "냉장고 활용도 높음",
      name: "두부 김치 덮밥",
      time: "15분",
      balance: "탄수화물 + 단백질 균형",
      used: ["두부", "김치", "밥", "계란"],
      missing: ["대파"],
      summary: "임박 재료인 두부를 먼저 사용하고, 김치와 밥으로 든든하게 완성하는 한 그릇 메뉴입니다.",
      level: "쉬움",
      steps: [
        "두부는 키친타월로 물기를 제거한 뒤 먹기 좋은 크기로 자릅니다.",
        "팬에 김치를 볶고 두부를 넣어 3분 정도 더 익힙니다.",
        "밥 위에 볶은 두부 김치를 올리고 계란프라이를 얹습니다.",
        "대파가 있으면 잘게 썰어 마지막에 올려 향을 더합니다."
      ],
      substitutes: "대파가 없다면 양파, 부추, 김가루로 향과 식감을 보완할 수 있습니다."
    },
    {
      id: "egg-rice",
      badge: "아침 식사 추천",
      name: "계란 간장밥",
      time: "8분",
      balance: "빠른 에너지 보충",
      used: ["계란", "밥"],
      missing: ["간장", "참기름"],
      summary: "바쁜 날에도 바로 만들 수 있는 초간단 메뉴입니다. 재료가 적어 자취생에게 잘 맞습니다.",
      level: "매우 쉬움",
      steps: [
        "따뜻한 밥을 그릇에 담습니다.",
        "계란프라이를 반숙으로 익혀 밥 위에 올립니다.",
        "간장과 참기름을 넣고 골고루 비빕니다."
      ],
      substitutes: "참기름이 없으면 버터나 들기름을 조금 넣어도 고소한 맛을 낼 수 있습니다."
    },
    {
      id: "kimchi-soup",
      badge: "따뜻한 국물",
      name: "김치 두부국",
      time: "18분",
      balance: "가벼운 단백질 보충",
      used: ["김치", "두부"],
      missing: ["멸치육수", "양파"],
      summary: "김치와 두부를 중심으로 끓이는 국물 메뉴입니다. 남은 밥과 함께 먹기 좋습니다.",
      level: "보통",
      steps: [
        "냄비에 김치와 물을 넣고 8분 정도 끓입니다.",
        "두부와 양파를 넣고 중불에서 더 끓입니다.",
        "간을 보고 부족하면 소금이나 국간장을 조금 추가합니다."
      ],
      substitutes: "멸치육수가 없다면 물에 참치액, 다시다, 간장을 소량 넣어 감칠맛을 보완할 수 있습니다."
    }
  ],
  quick: [
    {
      id: "quick-egg-rice",
      badge: "최단 시간",
      name: "계란 간장밥",
      time: "8분",
      balance: "탄수화물 + 단백질",
      used: ["계란", "밥"],
      missing: ["간장", "참기름"],
      summary: "설거지와 조리 시간을 줄이고 싶을 때 가장 빠르게 만들 수 있는 메뉴입니다.",
      level: "매우 쉬움",
      steps: ["밥을 데웁니다.", "계란프라이를 만듭니다.", "간장과 참기름을 넣고 비빕니다."],
      substitutes: "참기름 대신 버터를 넣으면 부드러운 맛이 납니다."
    },
    {
      id: "kimchi-fried-rice",
      badge: "팬 하나 조리",
      name: "김치 볶음밥",
      time: "12분",
      balance: "든든한 한 끼",
      used: ["김치", "밥", "계란"],
      missing: ["스팸"],
      summary: "김치와 밥만 있어도 만들 수 있고, 계란을 올리면 포만감이 좋아집니다.",
      level: "쉬움",
      steps: ["김치를 잘게 썰어 볶습니다.", "밥을 넣고 고르게 볶습니다.", "계란프라이를 올려 마무리합니다."],
      substitutes: "스팸이 없다면 참치캔, 햄, 두부를 넣어도 좋습니다."
    },
    {
      id: "tofu-scramble",
      badge: "가벼운 식사",
      name: "두부 계란 스크램블",
      time: "10분",
      balance: "단백질 중심",
      used: ["두부", "계란"],
      missing: ["소금", "후추"],
      summary: "두부를 먼저 소비하면서 단백질을 챙길 수 있는 간단한 팬 조리 메뉴입니다.",
      level: "쉬움",
      steps: ["두부를 으깨 물기를 제거합니다.", "계란과 섞어 팬에 볶습니다.", "소금과 후추로 간합니다."],
      substitutes: "후추가 없다면 김가루나 깨를 뿌려 풍미를 더할 수 있습니다."
    }
  ],
  urgent: [
    {
      id: "urgent-tofu",
      badge: "D-2 두부 우선",
      name: "두부 김치 덮밥",
      time: "15분",
      balance: "단백질 + 탄수화물",
      used: ["두부", "김치", "밥"],
      missing: ["대파"],
      summary: "소비 권장일이 가장 가까운 두부를 중심으로 추천된 메뉴입니다.",
      level: "쉬움",
      steps: ["두부를 굽습니다.", "김치를 볶습니다.", "밥 위에 함께 올려 덮밥으로 완성합니다."],
      substitutes: "대파 대신 양파나 김가루를 사용해도 좋습니다."
    },
    {
      id: "urgent-soup",
      badge: "두부 넉넉히 사용",
      name: "두부 계란국",
      time: "14분",
      balance: "따뜻한 단백질 보충",
      used: ["두부", "계란"],
      missing: ["국간장", "대파"],
      summary: "남은 두부를 많이 넣어 빠르게 소비할 수 있는 따뜻한 국물 메뉴입니다.",
      level: "쉬움",
      steps: ["물을 끓이고 두부를 넣습니다.", "계란을 풀어 천천히 붓습니다.", "국간장으로 간합니다."],
      substitutes: "국간장이 없으면 소금과 간장 소량을 섞어 간을 맞춥니다."
    },
    {
      id: "urgent-pan-tofu",
      badge: "반찬형 추천",
      name: "두부 부침",
      time: "12분",
      balance: "단백질 반찬",
      used: ["두부", "계란"],
      missing: ["부침가루"],
      summary: "두부를 도톰하게 부쳐 밥과 김치에 곁들이기 좋은 반찬형 메뉴입니다.",
      level: "쉬움",
      steps: ["두부의 물기를 제거합니다.", "계란물을 입혀 팬에 굽습니다.", "앞뒤로 노릇하게 익힙니다."],
      substitutes: "부침가루가 없다면 계란물만 입혀도 충분히 부칠 수 있습니다."
    }
  ],
  nutrition: [
    {
      id: "protein-bowl",
      badge: "영양 균형",
      name: "두부 계란 비빔밥",
      time: "16분",
      balance: "탄수화물 + 단백질 + 채소",
      used: ["두부", "계란", "밥", "김치"],
      missing: ["상추", "고추장"],
      summary: "밥, 계란, 두부에 채소를 더해 균형 잡힌 한 끼로 구성한 메뉴입니다.",
      level: "쉬움",
      steps: ["두부와 계란을 각각 익힙니다.", "밥 위에 김치와 재료를 올립니다.", "고추장을 넣고 비빕니다."],
      substitutes: "상추가 없다면 깻잎, 양배추, 오이를 넣어도 좋습니다."
    },
    {
      id: "warm-soup-set",
      badge: "가벼운 균형식",
      name: "김치 두부국 정식",
      time: "20분",
      balance: "국물 + 밥 + 단백질",
      used: ["김치", "두부", "밥"],
      missing: ["양파", "버섯"],
      summary: "국물과 밥을 함께 구성해 부담 없는 저녁 식사로 보여주기 좋은 메뉴입니다.",
      level: "보통",
      steps: ["김치국을 먼저 끓입니다.", "두부와 채소를 넣습니다.", "밥과 함께 한 상으로 구성합니다."],
      substitutes: "버섯이 없다면 애호박이나 대파로 식감을 더할 수 있습니다."
    },
    {
      id: "light-scramble",
      badge: "저녁 추천",
      name: "두부 스크램블 플레이트",
      time: "13분",
      balance: "단백질 중심 가벼운 식사",
      used: ["두부", "계란", "김치"],
      missing: ["방울토마토"],
      summary: "탄수화물을 줄이고 싶을 때 두부와 계란을 중심으로 구성하는 메뉴입니다.",
      level: "쉬움",
      steps: ["두부와 계란을 섞어 볶습니다.", "김치를 곁들입니다.", "토마토를 추가해 산뜻하게 마무리합니다."],
      substitutes: "방울토마토 대신 오이, 양배추, 사과 조각을 곁들여도 좋습니다."
    }
  ]
};

let selectedFilter = "balanced";
let selectedMenuId = null;
let isIngredientFormOpen = false;
let editingIngredientId = null;
let nextIngredientId = 5;

const ingredientForm = document.querySelector("#ingredientForm");
const ingredientFormPanel = document.querySelector("#ingredientFormPanel");
const toggleIngredientForm = document.querySelector("#toggleIngredientForm");
const closeIngredientForm = document.querySelector("#closeIngredientForm");
const formPanelTitle = document.querySelector("#formPanelTitle");
const submitIngredient = document.querySelector("#submitIngredient");
const ingredientInput = document.querySelector("#ingredientInput");
const quantityInput = document.querySelector("#quantityInput");
const expiryInput = document.querySelector("#expiryInput");
const ingredientMessage = document.querySelector("#ingredientMessage");
const ingredientTiles = document.querySelector("#ingredientTiles");
const urgentCount = document.querySelector("#urgentCount");
const totalCount = document.querySelector("#totalCount");
const summaryUrgentCount = document.querySelector("#summaryUrgentCount");
const todayRecommendation = document.querySelector("#todayRecommendation");
const tabButtons = document.querySelectorAll(".tab-button");
const menuCards = document.querySelector("#menuCards");
const recipeDetail = document.querySelector("#recipeDetail");
const shoppingPanel = document.querySelector("#shoppingPanel");

function getDday(expiry) {
  const today = new Date();
  const target = new Date(`${expiry}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / MS_PER_DAY);
}

function formatDday(days) {
  if (days < 0) return `D+${Math.abs(days)}`;
  if (days === 0) return "D-Day";
  return `D-${days}`;
}

function setMessage(text) {
  ingredientMessage.textContent = text;
  if (!text) return;
  window.setTimeout(() => {
    ingredientMessage.textContent = "";
  }, 2200);
}

function setIngredientFormOpen(open) {
  isIngredientFormOpen = open;
  ingredientFormPanel.hidden = !open;
  toggleIngredientForm.classList.toggle("active", open);
  toggleIngredientForm.setAttribute("aria-expanded", String(open));
  toggleIngredientForm.textContent = open ? "입력 닫기" : "+ 재료 추가";

  if (open) {
    ingredientInput.focus();
  }
}

function resetForm(options = {}) {
  ingredientForm.reset();
  expiryInput.value = addDays(5);
  editingIngredientId = null;
  formPanelTitle.textContent = "새 재료 타일 만들기";
  submitIngredient.textContent = "타일 추가";

  if (options.close) {
    setIngredientFormOpen(false);
  }
}

function renderIngredients() {
  ingredientTiles.innerHTML = ingredients
    .map((ingredient) => {
      const dday = getDday(ingredient.expiry);
      const isUrgent = dday <= 2;
      return `
        <article class="ingredient-tile ${isUrgent ? "urgent" : ""}">
          <div class="tile-top">
            <span class="ingredient-name">${ingredient.name}</span>
            <span class="ingredient-dday">${formatDday(dday)}</span>
          </div>
          ${isUrgent ? `<span class="use-first-label">먼저 사용</span>` : ""}
          <div class="tile-meta">
            <span>수량 <strong>${ingredient.quantity}</strong></span>
            <span>예상 소비 권장일 <strong>${ingredient.expiry}</strong></span>
          </div>
          <div class="tile-actions">
            <button type="button" data-action="edit" data-id="${ingredient.id}">수정</button>
            <button class="delete-button" type="button" data-action="delete" data-id="${ingredient.id}">삭제</button>
          </div>
        </article>
      `;
    })
    .join("");

  const urgentItems = ingredients.filter((ingredient) => getDday(ingredient.expiry) <= 2).length;
  urgentCount.textContent = `${urgentItems}개`;
  totalCount.textContent = `${ingredients.length}개`;
  summaryUrgentCount.textContent = `${urgentItems}개`;
  todayRecommendation.textContent = urgentItems > 0 ? "임박 재료 우선" : "종합 추천";
}

function renderMenus() {
  const menus = menusByFilter[selectedFilter];
  menuCards.innerHTML = menus
    .map((menu) => {
      const used = menu.used.map((item) => `<span class="chip">${item}</span>`).join("");
      const missing = menu.missing.length
        ? menu.missing.map((item) => `<span class="chip missing">${item}</span>`).join("")
        : `<span class="chip">부족 재료 없음</span>`;

      return `
        <article class="menu-card ${selectedMenuId === menu.id ? "selected" : ""}" data-menu-id="${menu.id}">
          <span class="menu-badge">${menu.badge}</span>
          <h3>${menu.name}</h3>
          <div class="menu-meta">
            <div class="meta-box">
              <span>조리 시간</span>
              <strong>${menu.time}</strong>
            </div>
            <div class="meta-box">
              <span>영양 균형</span>
              <strong>${menu.balance}</strong>
            </div>
          </div>
          <span class="label">사용 재료</span>
          <div class="ingredient-list">${used}</div>
          <span class="label">부족 재료</span>
          <div class="ingredient-list">${missing}</div>
          <button class="recipe-button" type="button" data-menu-id="${menu.id}">레시피 보기</button>
        </article>
      `;
    })
    .join("");
}

function findMenu(menuId) {
  return Object.values(menusByFilter).flat().find((menu) => menu.id === menuId);
}

function renderRecipe(menu) {
  recipeDetail.innerHTML = `
    <div class="recipe-header">
      <div>
        <p class="eyebrow">레시피 상세</p>
        <h2>${menu.name}</h2>
        <p class="summary-text">${menu.summary}</p>
      </div>
      <div class="recipe-stats">
        <div class="stat-card">
          <span class="label">조리 시간</span>
          <strong>${menu.time}</strong>
        </div>
        <div class="stat-card">
          <span class="label">난이도</span>
          <strong>${menu.level}</strong>
        </div>
      </div>
    </div>

    <ol class="steps">
      ${menu.steps
        .map(
          (step, index) => `
            <li>
              <span class="step-number">${index + 1}</span>
              <span>${step}</span>
            </li>
          `
        )
        .join("")}
    </ol>

    ${
      menu.missing.length
        ? `<div class="substitute-box"><strong>대체 재료 안내</strong><br>${menu.substitutes}</div>`
        : ""
    }
  `;
}

function renderShopping(menu) {
  const missingItems = menu.missing;

  shoppingPanel.innerHTML = `
    <div class="section-title">
      <div>
        <p class="eyebrow">Step 4</p>
        <h2>부족 재료 구매 추천</h2>
      </div>
    </div>
    ${
      missingItems.length
        ? `<div class="shopping-list">
            ${missingItems
              .map(
                (item) => `
                  <div class="shopping-card">
                    <h3>${item}</h3>
                    <p>${menu.name}에 넣으면 맛과 완성도가 올라가는 추천 구매 재료입니다.</p>
                    <button class="buy-button" type="button">더미 구매 버튼</button>
                  </div>
                `
              )
              .join("")}
          </div>`
        : `<div class="empty-shopping">이 메뉴는 현재 재료만으로 만들 수 있습니다.</div>`
    }
  `;
}

function selectMenu(menuId) {
  selectedMenuId = menuId;
  const menu = findMenu(menuId);
  renderMenus();
  renderRecipe(menu);
  renderShopping(menu);
}

toggleIngredientForm.addEventListener("click", () => {
  if (isIngredientFormOpen && !editingIngredientId) {
    setIngredientFormOpen(false);
    return;
  }

  if (editingIngredientId) {
    resetForm();
  }

  setIngredientFormOpen(true);
});

closeIngredientForm.addEventListener("click", () => {
  resetForm({ close: true });
});

ingredientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = ingredientInput.value.trim();
  const quantity = quantityInput.value.trim();
  const expiry = expiryInput.value;

  if (!name || !quantity || !expiry) {
    setMessage("재료명, 수량, 유통기한을 모두 입력해주세요.");
    return;
  }

  const duplicated = ingredients.some(
    (ingredient) => ingredient.name === name && ingredient.id !== editingIngredientId
  );

  if (duplicated) {
    setMessage("이미 등록된 재료입니다. 수정 버튼을 사용해주세요.");
    return;
  }

  if (editingIngredientId) {
    const target = ingredients.find((ingredient) => ingredient.id === editingIngredientId);
    target.name = name;
    target.quantity = quantity;
    target.expiry = expiry;
    setMessage("재료 타일을 수정했습니다.");
  } else {
    ingredients.unshift({ id: nextIngredientId, name, quantity, expiry });
    nextIngredientId += 1;
    setMessage("새 재료 타일을 추가했습니다.");
  }

  resetForm({ close: true });
  renderIngredients();
});

ingredientTiles.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const ingredient = ingredients.find((item) => item.id === id);
  if (!ingredient) return;

  if (button.dataset.action === "delete") {
    const index = ingredients.findIndex((item) => item.id === id);
    ingredients.splice(index, 1);
    setMessage("재료 타일을 삭제했습니다.");
    if (editingIngredientId === id) resetForm({ close: true });
    renderIngredients();
    return;
  }

  editingIngredientId = id;
  ingredientInput.value = ingredient.name;
  quantityInput.value = ingredient.quantity;
  expiryInput.value = ingredient.expiry;
  formPanelTitle.textContent = "재료 타일 수정하기";
  submitIngredient.textContent = "수정 완료";
  setIngredientFormOpen(true);
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedFilter = button.dataset.filter;
    selectedMenuId = null;
    tabButtons.forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    renderMenus();
  });
});

menuCards.addEventListener("click", (event) => {
  const target = event.target.closest("[data-menu-id]");
  if (!target) return;
  selectMenu(target.dataset.menuId);
});

resetForm({ close: true });
renderIngredients();
renderMenus();
