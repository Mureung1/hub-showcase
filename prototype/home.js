(function () {
  var STORAGE_KEY = "kkinipick.fridge";

  function ownedIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  var owned = ownedIds();
  var recommendSection = document.querySelector(".recommend-section");
  var recommendList = document.querySelector(".recommend-list");
  var browseItems = Array.from(document.querySelectorAll(".browse-list li"));

  if (owned.length === 0) {
    recommendSection.style.display = "none";
    return;
  }

  var matched = browseItems
    .filter(function (item) {
      var ing = (item.dataset.ing || "").split(" ");
      return ing.some(function (id) {
        return owned.includes(id);
      });
    })
    .sort(function (a, b) {
      return Number(a.dataset.price) - Number(b.dataset.price);
    });

  if (matched.length === 0) {
    recommendList.innerHTML = '<li class="recommend-empty">고른 재료로 만들 수 있는 요리를 아직 못 찾았어요. 재료를 더 골라보세요.</li>';
    return;
  }

  matched.forEach(function (item) {
    recommendList.appendChild(item.cloneNode(true));
  });
})();
