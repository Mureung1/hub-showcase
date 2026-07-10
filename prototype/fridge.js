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

  // 페이지를 새로 열었을 때 이전에 고른 재료를 그대로 복원
  function restore() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      saved.forEach(function (id) {
        var box = document.querySelector('.chip-row input[value="' + id + '"]');
        if (box) box.checked = true;
      });
    } catch (e) {
      /* 저장된 값이 없거나 깨졌으면 그냥 빈 상태로 시작 */
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

  restore();
})();
