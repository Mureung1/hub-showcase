document.addEventListener("click", (e) => {
  const seg = e.target.closest(".segmented button");
  if (seg) {
    seg.parentElement
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("active"));
    seg.classList.add("active");
  }

  const sw = e.target.closest(".switch");
  if (sw) sw.classList.toggle("on");

  const openBtn = e.target.closest("[data-open-sheet]");
  if (openBtn) {
    const sheet = document.getElementById(openBtn.dataset.openSheet);
    const backdrop = document.getElementById("sheetBackdrop");
    if (sheet) sheet.classList.add("is-open");
    if (backdrop) backdrop.classList.add("is-open");
  }

  const closeBtn = e.target.closest("[data-close-sheet]");
  if (closeBtn || e.target.id === "sheetBackdrop") {
    document
      .querySelectorAll(".sheet.is-open")
      .forEach((s) => s.classList.remove("is-open"));
    document.getElementById("sheetBackdrop")?.classList.remove("is-open");
  }
});

document.querySelectorAll("input[type=range]").forEach((r) => {
  const out = document.querySelector(`[data-range-out="${r.id}"]`);
  if (!out) return;
  const update = () => {
    out.textContent = r.dataset.suffix
      ? `${r.value}${r.dataset.suffix}`
      : r.value;
  };
  r.addEventListener("input", update);
  update();
});
