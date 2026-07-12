const TIMES = ["01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30"];
const DAYS = ["7/1(화)", "7/2(수)", "7/3(목)", "7/4(금)"];
const CELL_STATES = ["none", "ok", "pref", "no"];

let currentHub = 6;

function goToScreen(n) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.dataset.screen === String(n));
  });
}

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}

document.addEventListener("click", (e) => {
  const gotoBtn = e.target.closest("[data-goto]");
  if (gotoBtn) {
    if (gotoBtn.dataset.hub) currentHub = Number(gotoBtn.dataset.hub);
    goToScreen(gotoBtn.dataset.goto);
    return;
  }

  const hubBtn = e.target.closest("[data-goto-hub]");
  if (hubBtn) {
    goToScreen(currentHub);
    return;
  }

  const modalBtn = e.target.closest("[data-modal]");
  if (modalBtn) {
    openModal(modalBtn.dataset.modal);
    return;
  }

  const modalCloseBtn = e.target.closest("[data-modal-close]");
  if (modalCloseBtn) {
    closeModal(modalCloseBtn.dataset.modalClose);
    return;
  }

  const dateTab = e.target.closest(".date-tab");
  if (dateTab) {
    dateTab.parentElement
      .querySelectorAll(".date-tab")
      .forEach((t) => t.classList.remove("active"));
    dateTab.classList.add("active");
    return;
  }
});

document.getElementById("copy-link-btn")?.addEventListener("click", () => {
  const text = document.getElementById("share-link").textContent;
  const btn = document.getElementById("copy-link-btn");
  navigator.clipboard?.writeText(text).finally(() => {
    const original = btn.textContent;
    btn.textContent = "복사됐어요!";
    setTimeout(() => (btn.textContent = original), 1500);
  });
});

function buildGridHeader(container) {
  container.appendChild(document.createElement("div"));
  DAYS.forEach((day) => {
    const head = document.createElement("div");
    head.className = "grid-head";
    head.textContent = day;
    container.appendChild(head);
  });
}

function buildInputGrid(id) {
  const container = document.getElementById(id);
  if (!container) return;
  buildGridHeader(container);

  TIMES.forEach((time) => {
    const timeLabel = document.createElement("div");
    timeLabel.className = "grid-time";
    timeLabel.textContent = time;
    container.appendChild(timeLabel);

    DAYS.forEach(() => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.state = "none";
      cell.addEventListener("click", () => {
        const next = (CELL_STATES.indexOf(cell.dataset.state) + 1) % CELL_STATES.length;
        cell.dataset.state = CELL_STATES[next];
      });
      container.appendChild(cell);
    });
  });
}

function buildPresetGrid(id, matrix) {
  const container = document.getElementById(id);
  if (!container) return;
  buildGridHeader(container);

  TIMES.forEach((time, rowIndex) => {
    const timeLabel = document.createElement("div");
    timeLabel.className = "grid-time";
    timeLabel.textContent = time;
    container.appendChild(timeLabel);

    DAYS.forEach((_, colIndex) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.state = matrix[rowIndex][colIndex];
      container.appendChild(cell);
    });
  });
}

function buildHeatmapGrid(id, matrix) {
  const container = document.getElementById(id);
  if (!container) return;
  buildGridHeader(container);

  TIMES.forEach((time, rowIndex) => {
    const timeLabel = document.createElement("div");
    timeLabel.className = "grid-time";
    timeLabel.textContent = time;
    container.appendChild(timeLabel);

    DAYS.forEach((_, colIndex) => {
      const count = matrix[rowIndex][colIndex];
      const cell = document.createElement("div");
      cell.className = `heat-cell heat-${count}`;
      cell.textContent = count > 0 ? count : "";
      container.appendChild(cell);
    });
  });
}

const AI_PRESET = [
  ["none", "ok", "pref", "none"],
  ["ok", "pref", "pref", "ok"],
  ["pref", "pref", "no", "ok"],
  ["ok", "pref", "ok", "none"],
  ["none", "ok", "ok", "none"],
  ["no", "none", "none", "none"],
  ["none", "none", "none", "none"],
];

const RESULT_PRESET = [
  [1, 2, 3, 1],
  [2, 4, 4, 2],
  [3, 5, 4, 3],
  [2, 5, 3, 2],
  [1, 3, 2, 1],
  [0, 2, 1, 0],
  [0, 1, 0, 0],
];

buildInputGrid("grid-input");
buildPresetGrid("grid-ai", AI_PRESET);
buildHeatmapGrid("grid-result", RESULT_PRESET);
