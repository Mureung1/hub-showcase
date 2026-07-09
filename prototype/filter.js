(function () {
  var CHECKBOX_GROUPS = ["type", "ing", "time"];

  function checkedValues(prefix) {
    var boxes = document.querySelectorAll('.filters input[type="checkbox"][id^="' + prefix + '-"]:checked');
    return Array.from(boxes).map(function (box) {
      return box.id.slice(prefix.length + 1);
    });
  }

  function activeCuisineValues() {
    return Array.from(document.querySelectorAll(".quick-tab.is-active"))
      .map(function (tab) {
        return tab.dataset.cuisineTab;
      })
      .filter(function (value) {
        return value && value !== "all";
      });
  }

  function matchesGroup(item, key, checked) {
    if (checked.length === 0) return true;
    var itemValues = (item.dataset[key] || "").split(" ");
    return checked.some(function (value) {
      return itemValues.includes(value);
    });
  }

  function applyFilters() {
    var checkedByGroup = {};
    CHECKBOX_GROUPS.forEach(function (prefix) {
      checkedByGroup[prefix] = checkedValues(prefix);
    });
    var cuisineChecked = activeCuisineValues();

    document.querySelectorAll(".results li").forEach(function (item) {
      var visible =
        CHECKBOX_GROUPS.every(function (prefix) {
          return matchesGroup(item, prefix, checkedByGroup[prefix]);
        }) && matchesGroup(item, "cuisine", cuisineChecked);
      item.style.display = visible ? "" : "none";
    });
  }

  document.querySelectorAll('.filters input[type="checkbox"]').forEach(function (box) {
    box.addEventListener("change", applyFilters);
  });

  document.querySelectorAll(".quick-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var key = tab.dataset.cuisineTab;
      if (key === "all") {
        document.querySelectorAll(".quick-tab").forEach(function (t) {
          t.classList.toggle("is-active", t.dataset.cuisineTab === "all");
        });
      } else {
        tab.classList.toggle("is-active");
        var anyActive = Array.from(document.querySelectorAll(".quick-tab")).some(function (t) {
          return t.dataset.cuisineTab !== "all" && t.classList.contains("is-active");
        });
        document.querySelector('.quick-tab[data-cuisine-tab="all"]').classList.toggle("is-active", !anyActive);
      }
      applyFilters();
    });
  });

  applyFilters();
})();
