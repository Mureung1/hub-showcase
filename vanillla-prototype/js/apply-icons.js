document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-icon]').forEach(function (el) {
    var key = el.getAttribute('data-icon');
    if (window.ICONS && ICONS[key]) {
      el.innerHTML = ICONS[key];
    }
  });
});
