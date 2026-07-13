(function () {
  var STORAGE_KEY = "kkinipick.fridge";

  // src/data/fridgeIngredients.js의 id → matchNames를 그대로 포팅 (프로토타입은 별도 JS라 중복 유지).
  var MATCH_NAMES = {
    egg: ["계란"],
    kimchi: ["신김치"],
    tofu: ["두부", "순두부"],
    pork: ["돼지고기"],
    beef: ["소고기"],
    "green-onion": ["대파"],
    onion: ["양파"],
    garlic: ["마늘", "다진마늘"],
    potato: ["감자"],
    carrot: ["당근"],
    rice: ["밥", "즉석밥", "쌀"],
    ramyeon: ["라면사리", "신라면", "짜파게티", "너구리", "육개장사발면"],
    tuna: ["참치캔"],
    spam: ["스팸", "햄"],
    bread: ["식빵"],
    shrimp: ["새우"],
    squid: ["오징어"],
    zucchini: ["애호박"],
    "bean-sprout": ["콩나물"],
    spinach: ["시금치"],
    radish: ["무"],
    cucumber: ["오이"],
    "fish-cake": ["어묵"],
    sausage: ["소시지"],
    spaghetti: ["스파게티면"],
    tomato: ["토마토", "토마토소스"],
    bacon: ["베이컨"],
    cheese: ["치즈"],
    lettuce: ["양상추"],
  };

  function ownedMatchNames() {
    var ids;
    try {
      ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      ids = [];
    }
    return ids.reduce(function (names, id) {
      return names.concat(MATCH_NAMES[id] || []);
    }, []);
  }

  var owned = ownedMatchNames();
  var rows = Array.from(document.querySelectorAll(".ingredient-row"));
  if (rows.length === 0) return;

  var container = rows[0].parentElement;
  var totalEl = container.querySelector(".ingredient-total");

  rows.forEach(function (row) {
    var ingredient = row.dataset.ingredient;
    var isOwned = Boolean(ingredient) && owned.includes(ingredient);
    row.dataset.owned = isOwned ? "1" : "0";
    row.classList.toggle("is-owned", isOwned);

    var check = document.createElement("input");
    check.type = "checkbox";
    check.className = "check";
    check.checked = !isOwned; // 구매 필요는 기본 체크, 보유는 기본 해제 — 필요하면 직접 체크해서 같이 산다
    check.addEventListener("change", function () {
      row.classList.toggle("is-owned", !check.checked);
    });
    row.insertBefore(check, row.firstChild);

    var badge = document.createElement("span");
    badge.className = "status-badge " + (isOwned ? "owned" : "need");
    badge.textContent = isOwned ? "보유" : "구매 필요";
    row.querySelector(".name").appendChild(badge);
  });

  // 구매 필요 재료를 먼저, 보유 재료를 그 아래로 — ingredient-total은 항상 맨 아래 유지
  rows
    .slice()
    .sort(function (a, b) {
      return Number(a.dataset.owned) - Number(b.dataset.owned);
    })
    .forEach(function (row) {
      container.insertBefore(row, totalEl);
    });
})();
