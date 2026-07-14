(function () {
  var STORAGE_KEY = "kkinipick.fridge";

  function selectedIds() {
    return Array.from(document.querySelectorAll('.chip-row input[type="checkbox"]:checked')).map(function (box) {
      return box.value;
    });
  }

  function updateCount() {
    var count = selectedIds().length;
    var badge = document.querySelector(".fridge-count");
    if (badge) badge.textContent = count + "개";
    var clearBtn = document.querySelector(".fridge-clear");
    if (clearBtn) clearBtn.style.display = count > 0 ? "" : "none";
  }

  // 페이지를 새로 열었을 때 이전에 고른 재료를 그대로 복원.
  // 저장된 게 아예 없으면(첫 방문) 조미료는 기본으로 체크해둔다 — 매번 새로 누르기 귀찮지 않게.
  function restore() {
    var saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      /* 저장된 값이 깨졌으면 빈 상태로 시작 */
    }

    if (saved.length === 0) {
      document.querySelectorAll('.chip-row input[data-seasoning="true"]').forEach(function (box) {
        box.checked = true;
      });
    } else {
      saved.forEach(function (id) {
        var box = document.querySelector('.chip-row input[value="' + id + '"]');
        if (box) box.checked = true;
      });
    }
    updateCount();
  }

  document.querySelectorAll('.chip-row input[type="checkbox"]').forEach(function (box) {
    box.addEventListener("change", updateCount);
  });

  var clearBtn = document.querySelector(".fridge-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      document.querySelectorAll('.chip-row input[type="checkbox"]').forEach(function (box) {
        box.checked = false;
      });
      updateCount();
    });
  }

  var completeBtn = document.querySelector(".btn-complete");
  if (completeBtn) {
    completeBtn.addEventListener("click", function () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds()));
      window.location.href = "home.html";
    });
  }

  // 재료 검색: label 텍스트 또는 data-group(예: 두부/순두부 → "두부")에 부분일치하면 남기고 나머지는 숨김
  var searchInput = document.getElementById("ingredient-search");
  var emptyMessage = document.querySelector(".fridge-search-empty");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var query = searchInput.value.trim().toLowerCase();
      var visibleCount = 0;
      document.querySelectorAll(".chip-row input[type=\"checkbox\"]").forEach(function (box) {
        var label = document.querySelector('label[for="' + box.id + '"]');
        var group = box.getAttribute("data-group") || "";
        var haystack = ((label ? label.textContent : "") + " " + group).toLowerCase();
        var visible = query === "" || haystack.indexOf(query) !== -1;
        box.style.display = visible ? "" : "none";
        if (label) label.style.display = visible ? "" : "none";
        if (visible) visibleCount++;
      });
      if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
    });
  }

  restore();
})();
