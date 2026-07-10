/* =========================================================
   PREFER 프로토타입 — 재사용 위젯 (바닐라 JS, 빌드 도구 없음)
   mock-data.js 다음, main.js 이전에 로드된다.
   ========================================================= */

/* ---------- 진행률 바 ---------- */

function renderProgressBar(container, submitted, total) {
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  container.innerHTML = `
    <div class="progress-row"><span>${total}명 중 ${submitted}명 완료</span><span>${pct}%</span></div>
    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
  `;
}

/* ---------- 링크 복사 버튼 공통 동작 ---------- */

function wireCopyButton(btn, label) {
  btn.addEventListener("click", () => {
    const original = label || "링크 복사";
    btn.textContent = "복사됨!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

/* ---------- 날짜 범위 피커 ---------- */

function createDateRangePicker(wrapEl, { initialMonth, onChange }) {
  const fieldBtn = wrapEl.querySelector(".field-btn");
  const popover = wrapEl.querySelector(".popover");
  let viewYear = initialMonth.getFullYear();
  let viewMonthIdx = initialMonth.getMonth();
  let start = null;
  let end = null;

  function pad(n) { return String(n).padStart(2, "0"); }
  function dateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function render() {
    const first = new Date(viewYear, viewMonthIdx, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonthIdx + 1, 0).getDate();
    let cellsHtml = "";
    for (let i = 0; i < startWeekday; i++) cellsHtml += `<button type="button" disabled></button>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(viewYear, viewMonthIdx, d);
      let cls = "";
      if (start && end && ds >= start && ds <= end) cls = "in-range";
      if (ds === start || ds === end) cls = "range-end";
      cellsHtml += `<button type="button" data-date="${ds}" class="${cls}">${d}</button>`;
    }
    let hint = "";
    if (!start) hint = "시작일을 선택하세요";
    else if (!end) hint = "종료일을 선택하세요";

    popover.innerHTML = `
      <div class="popover-cal-header">
        <button type="button" class="popover-nav-btn" data-nav="-1">‹</button>
        <span>${viewYear}년 ${viewMonthIdx + 1}월</span>
        <button type="button" class="popover-nav-btn" data-nav="1">›</button>
      </div>
      <div class="popover-weekday-row">${WEEKDAY_LABELS.map((w) => `<span>${w}</span>`).join("")}</div>
      <div class="popover-day-grid">${cellsHtml}</div>
      <div class="popover-hint">${hint}</div>
    `;

    popover.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonthIdx += Number(btn.dataset.nav);
        if (viewMonthIdx < 0) { viewMonthIdx = 11; viewYear--; }
        if (viewMonthIdx > 11) { viewMonthIdx = 0; viewYear++; }
        render();
      });
    });

    popover.querySelectorAll("[data-date]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ds = btn.dataset.date;
        if (!start || (start && end)) { start = ds; end = null; }
        else if (ds < start) { start = ds; }
        else { end = ds; }
        render();
        if (start && end) {
          fieldBtn.textContent = `${start.replaceAll("-", ".")} ~ ${end.replaceAll("-", ".")}`;
          fieldBtn.classList.remove("placeholder");
          if (onChange) onChange(start, end);
          popover.hidden = true;
        }
      });
    });
  }

  fieldBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.hidden = !popover.hidden;
    if (!popover.hidden) render();
  });
  document.addEventListener("click", (e) => {
    if (!wrapEl.contains(e.target)) popover.hidden = true;
  });

  return { getRange: () => ({ start, end }) };
}

/* ---------- 시간 범위 피커 ---------- */

function createTimeRangePicker(wrapEl, { onChange }) {
  const fieldBtn = wrapEl.querySelector(".field-btn");
  const popover = wrapEl.querySelector(".popover");
  const times = buildFullDayTimeAxis();
  let start = null;
  let end = null;

  function render() {
    const cells = times.map((t) => {
      let cls = "";
      if (start && end && t >= start && t <= end) cls = "in-range";
      if (t === start || t === end) cls = "range-end";
      return `<button type="button" data-time="${t}" class="popover-time-cell ${cls}">${t}</button>`;
    }).join("");
    popover.innerHTML = `<div class="popover-time-list">${cells}</div>`;

    popover.querySelectorAll("[data-time]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const t = btn.dataset.time;
        if (!start || (start && end)) { start = t; end = null; }
        else if (t < start) { start = t; }
        else { end = t; }
        render();
        if (start && end) {
          fieldBtn.textContent = `${start} ~ ${end}`;
          fieldBtn.classList.remove("placeholder");
          if (onChange) onChange(start, end);
          popover.hidden = true;
        }
      });
    });
  }

  fieldBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.hidden = !popover.hidden;
    if (!popover.hidden) render();
  });
  document.addEventListener("click", (e) => {
    if (!wrapEl.contains(e.target)) popover.hidden = true;
  });

  return { getRange: () => ({ start, end }) };
}

/* ---------- 약속 만들기 모달 ---------- */

function buildCreateModal({ onSubmit }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-label="새 약속 만들기">
      <div class="modal-title">새 약속 만들기</div>
      <div class="form-group">
        <label class="form-label">약속 제목</label>
        <input class="input" type="text" placeholder="예) 팀 프로젝트 회의">
      </div>
      <div class="form-group">
        <label class="form-label">후보 날짜</label>
        <div class="field-wrap">
          <button type="button" class="field-btn placeholder">날짜 범위를 선택하세요</button>
          <div class="popover" hidden></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">만남 가능 시간대</label>
        <div class="field-wrap">
          <button type="button" class="field-btn placeholder">시간대를 선택하세요</button>
          <div class="popover" hidden></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">응답 마감 (선택)</label>
        <input class="input" type="datetime-local">
      </div>
      <div class="form-group">
        <label class="form-label">약속 전체 인원수</label>
        <input class="input" type="number" min="1" placeholder="예) 5">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">생성자 이름</label>
          <input class="input" type="text" data-field="creator-name">
        </div>
        <div class="form-group">
          <label class="form-label">관리자 비밀번호</label>
          <input class="input" type="password">
        </div>
      </div>
      <div class="form-hint">⚠ 비밀번호를 잊으면 관리자로 다시 접속할 수 없어요. 꼭 기억해주세요.</div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-grow" data-action="submit">약속 만들기</button>
        <button type="button" class="btn btn-secondary" data-action="cancel">취소</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fieldWraps = overlay.querySelectorAll(".field-wrap");
  createDateRangePicker(fieldWraps[0], { initialMonth: new Date(mockMeeting.startDate + "T00:00:00") });
  createTimeRangePicker(fieldWraps[1], {});

  overlay.querySelector('[data-action="submit"]').addEventListener("click", () => onSubmit());
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => { overlay.hidden = true; });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });

  return {
    open: () => { overlay.hidden = false; },
    close: () => { overlay.hidden = true; },
  };
}

/* ---------- 참여하기 / 인라인 로그인 모달 ---------- */

function buildJoinModal({ withLinkField = true, title = "약속 참여하기", onSubmit }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-label="${title}">
      <div class="modal-title">${title}</div>
      ${withLinkField ? `
      <div class="form-group">
        <label class="form-label">참여 링크</label>
        <input class="input" type="text" placeholder="공유받은 링크를 붙여넣으세요" data-field="link">
      </div>` : ""}
      <div class="form-group">
        <label class="form-label">이름</label>
        <input class="input" type="text" data-field="name">
      </div>
      <div class="form-group">
        <label class="form-label">간편 비밀번호</label>
        <input class="input" type="password" data-field="password">
      </div>
      <div class="form-hint">이름과 비밀번호로 나중에 다시 참여하면 재투표(응답 수정)할 수 있어요. 생성자 이름과 관리자 비밀번호를 입력하면 관리자로 접속돼요.</div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-grow" data-action="submit">${withLinkField ? "참여하기" : "참여하고 시작하기"}</button>
        ${withLinkField ? `<button type="button" class="btn btn-secondary" data-action="cancel">취소</button>` : ""}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector('[data-field="name"]');
  overlay.querySelector('[data-action="submit"]').addEventListener("click", () => {
    const name = nameInput.value.trim() || "참여자";
    onSubmit(name);
  });
  const cancelBtn = overlay.querySelector('[data-action="cancel"]');
  if (cancelBtn) cancelBtn.addEventListener("click", () => { overlay.hidden = true; });
  if (withLinkField) {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });
  }

  return {
    open: () => { overlay.hidden = false; },
    close: () => { overlay.hidden = true; },
  };
}

/* ---------- 생성 완료 모달 ---------- */

function buildCompletionModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-label="약속 생성 완료">
      <div class="modal-title">약속이 생성되었어요 🎉</div>
      <div class="modal-desc">아래 링크를 참여자에게 공유해주세요.</div>
      <div class="form-group">
        <label class="form-label">참여 링크</label>
        <div class="link-box">${mockMeeting.joinLink}</div>
        <button type="button" class="btn btn-secondary btn-small" data-action="copy">링크 복사</button>
      </div>
      <div class="form-hint">관리자는 같은 링크에서 생성자 이름과 관리자 비밀번호로 접속할 수 있어요.</div>
      <button type="button" class="btn btn-primary btn-block" data-action="close">닫기</button>
    </div>
  `;
  document.body.appendChild(overlay);
  wireCopyButton(overlay.querySelector('[data-action="copy"]'), "링크 복사");
  overlay.querySelector('[data-action="close"]').addEventListener("click", () => { overlay.hidden = true; });

  return {
    open: () => { overlay.hidden = false; },
    close: () => { overlay.hidden = true; },
  };
}

/* ---------- 투표 마감 확인 모달 ---------- */

function buildCloseConfirmModal({ onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-label="투표 마감 확인">
      <div class="modal-title">투표를 마감할까요?</div>
      <div data-progress></div>
      <div class="modal-desc">정말 마감하시겠어요? 마감 후에도 필요하면 언제든 다시 열 수 있어요.</div>
      <div class="btn-row">
        <button type="button" class="btn btn-danger btn-grow" data-action="confirm">마감할게요</button>
        <button type="button" class="btn btn-secondary" data-action="cancel">취소</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderProgressBar(overlay.querySelector("[data-progress]"), mockMeeting.submittedCount, mockMeeting.totalParticipants);
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => { overlay.hidden = true; });
  overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => onConfirm());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });

  return {
    open: () => { overlay.hidden = false; },
    close: () => { overlay.hidden = true; },
  };
}

/* ---------- 프로토타입 상태 전환 패널 (개발 보조 UI) ---------- */

function mountProtoSwitcher() {
  const state = getProtoState();
  const el = document.createElement("div");
  el.className = "proto-switcher";
  el.innerHTML = `
    <div class="proto-switcher-label">⚙ 프로토타입 상태 전환</div>
    <div class="proto-switcher-row">
      <button type="button" data-role="admin">관리자로 보기</button>
      <button type="button" data-role="participant">참여자로 보기</button>
    </div>
    <select data-status-select>
      <option value="collecting">응답 중</option>
      <option value="closed">응답 마감</option>
      <option value="recommended">추천 결과 생성됨</option>
      <option value="finalized">최종 확정</option>
    </select>
  `;
  document.body.appendChild(el);

  const currentPage = location.pathname.split("/").pop();
  el.querySelectorAll("[data-role]").forEach((btn) => {
    if (btn.dataset.role === state.role) btn.classList.add("active");
    btn.addEventListener("click", () => {
      location.href = withProtoQuery(currentPage, { role: btn.dataset.role });
    });
  });
  const select = el.querySelector("[data-status-select]");
  select.value = state.status;
  select.addEventListener("change", () => {
    location.href = withProtoQuery(currentPage, { status: select.value });
  });
}

/* ---------- 채팅 패널 (목업) ---------- */

function mountChatPanel(container) {
  container.innerHTML = `
    <div class="chat-panel">
      <div class="chat-messages">
        <div class="chat-bubble assistant">후보 일정 중 참석할 수 없는 날짜나 시간이 있나요? 채팅으로 편하게 알려주거나 아래 시간표를 드래그해서 직접 선택할 수 있어요.</div>
      </div>
      <div class="chat-input-row">
        <input type="text" placeholder="필요한 일정을 편하게 적어주세요">
        <button type="button" class="btn btn-primary btn-small">전송</button>
      </div>
    </div>
  `;
  const messages = container.querySelector(".chat-messages");
  const input = container.querySelector("input");
  const sendBtn = container.querySelector(".chat-input-row button");

  function send() {
    const text = input.value.trim();
    if (!text) return;
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    userBubble.textContent = text;
    messages.appendChild(userBubble);
    input.value = "";
    messages.scrollTop = messages.scrollHeight;
    setTimeout(() => {
      const aiBubble = document.createElement("div");
      aiBubble.className = "chat-bubble assistant";
      aiBubble.textContent = "AI 연동은 이 프로토타입에서 생략했어요. 아래 시간표에서 직접 선택해주세요.";
      messages.appendChild(aiBubble);
      messages.scrollTop = messages.scrollHeight;
    }, 400);
  }

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
}

/* ---------- 주간(달력) 페이지네이션 헬퍼 ----------
   dateAxis 전체를 일요일 시작 7일 단위로 묶는다. 페이지 안에는 항상 7개의
   요일 슬롯이 채워지며, 실제 약속 날짜 범위 밖인 슬롯은 inRange:false로
   표시되어 비활성 칸으로 렌더링된다. */

function buildCalendarPages(dateAxis) {
  const first = new Date(dateAxis[0] + "T00:00:00");
  const last = new Date(dateAxis[dateAxis.length - 1] + "T00:00:00");
  const firstSunday = new Date(first);
  firstSunday.setDate(first.getDate() - first.getDay());
  const lastSaturday = new Date(last);
  lastSaturday.setDate(last.getDate() + (6 - last.getDay()));

  const pages = [];
  const cursor = new Date(firstSunday);
  while (cursor <= lastSaturday) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      const ds = `${y}-${m}-${d}`;
      week.push({ dateStr: ds, dateIdx: dateAxis.indexOf(ds), inRange: dateAxis.includes(ds) });
      cursor.setDate(cursor.getDate() + 1);
    }
    pages.push(week);
  }
  return pages;
}

/* ---------- PreferenceGrid: 날짜×시간 드래그 선택 그리드 ---------- */

function mountPreferenceGrid(container, { dateAxis, timeAxis, prefill }) {
  const state = dateAxis.map(() => timeAxis.map(() => "available"));
  if (prefill) prefill.forEach(({ dateIdx, slotIdx, status }) => { state[dateIdx][slotIdx] = status; });

  const pages = buildCalendarPages(dateAxis);
  let pageIdx = 0;

  let historyStack = [];
  let dragging = false;
  let dragStart = null;
  let lastRangeCells = [];
  let cellEls = {};

  container.innerHTML = `
    <div class="grid-legend">
      <span class="badge badge-undesired">비선호</span>
      <span class="badge badge-available">가능</span>
      <span class="badge badge-preferred">선호</span>
      <span class="badge badge-unavailable">불가능</span>
      <span class="grid-hint">드래그로 범위를 선택해보세요. (날짜 클릭 시 전체 시간 선택)</span>
      <button type="button" class="grid-undo-btn" disabled>↺ 실행 취소</button>
    </div>
    <div class="grid-week-nav">
      <button type="button" class="grid-week-nav-btn" data-week-nav="-1">‹ 이전 주</button>
      <span class="grid-week-label"></span>
      <button type="button" class="grid-week-nav-btn" data-week-nav="1">다음 주 ›</button>
    </div>
    <div class="grid-scroll"><div class="pref-grid"></div></div>
  `;

  const gridEl = container.querySelector(".pref-grid");
  const undoBtn = container.querySelector(".grid-undo-btn");
  const weekLabel = container.querySelector(".grid-week-label");
  const prevBtn = container.querySelector('[data-week-nav="-1"]');
  const nextBtn = container.querySelector('[data-week-nav="1"]');

  function updateUndoBtn() { undoBtn.disabled = historyStack.length === 0; }

  function renderCells() {
    Object.keys(cellEls).forEach((key) => {
      const [di, si] = key.split("-").map(Number);
      cellEls[key].className = `grid-cell status-${state[di][si]}`;
    });
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    cellEls = {};
    const week = pages[pageIdx];
    gridEl.style.gridTemplateColumns = `52px repeat(7, minmax(46px, 1fr))`;

    weekLabel.textContent = `${formatDateLabel(week[0].dateStr)} ~ ${formatDateLabel(week[6].dateStr)}`;
    prevBtn.disabled = pageIdx === 0;
    nextBtn.disabled = pageIdx === pages.length - 1;

    const corner = document.createElement("div");
    corner.className = "grid-corner";
    corner.style.gridColumn = "1";
    corner.style.gridRow = "1";
    gridEl.appendChild(corner);

    week.forEach((day, col) => {
      const header = document.createElement("div");
      header.style.gridColumn = String(col + 2);
      header.style.gridRow = "1";
      if (day.inRange) {
        header.className = "grid-date-header";
        header.innerHTML = `<button type="button" class="grid-date-label">${formatDateLabel(day.dateStr)}</button>`;
        header.querySelector(".grid-date-label").addEventListener("click", (e) => {
          const di = day.dateIdx;
          const range = timeAxis.map((_, si) => ({ dateIdx: di, slotIdx: si }));
          openPopup(e.clientX, e.clientY, range);
        });
      } else {
        header.className = "grid-date-header day-disabled";
        header.innerHTML = `<div class="grid-date-label">${formatDateLabel(day.dateStr)}</div>`;
      }
      gridEl.appendChild(header);
    });

    timeAxis.forEach((t, si) => {
      const label = document.createElement("div");
      label.className = "grid-time-label";
      label.style.gridColumn = "1";
      label.style.gridRow = String(si + 2);
      label.textContent = t;
      gridEl.appendChild(label);

      week.forEach((day, col) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.style.gridColumn = String(col + 2);
        cell.style.gridRow = String(si + 2);
        if (day.inRange) {
          const di = day.dateIdx;
          cell.className = `grid-cell status-${state[di][si]}`;
          cell.dataset.dateIdx = String(di);
          cell.dataset.slotIdx = String(si);
          cellEls[`${di}-${si}`] = cell;
        } else {
          cell.className = "grid-cell cell-disabled";
          cell.disabled = true;
        }
        gridEl.appendChild(cell);
      });
    });
  }

  prevBtn.addEventListener("click", () => { if (pageIdx > 0) { pageIdx--; renderGrid(); } });
  nextBtn.addEventListener("click", () => { if (pageIdx < pages.length - 1) { pageIdx++; renderGrid(); } });

  function clearSelecting() {
    lastRangeCells.forEach(({ dateIdx, slotIdx }) => {
      const el = cellEls[`${dateIdx}-${slotIdx}`];
      if (el) el.classList.remove("selecting");
    });
    lastRangeCells = [];
  }

  function applySelecting(range) {
    clearSelecting();
    range.forEach(({ dateIdx, slotIdx }) => {
      const el = cellEls[`${dateIdx}-${slotIdx}`];
      if (el) el.classList.add("selecting");
    });
    lastRangeCells = range;
  }

  function computeRange(a, b) {
    const dMin = Math.min(a.dateIdx, b.dateIdx), dMax = Math.max(a.dateIdx, b.dateIdx);
    const sMin = Math.min(a.slotIdx, b.slotIdx), sMax = Math.max(a.slotIdx, b.slotIdx);
    const cells = [];
    for (let di = dMin; di <= dMax; di++) for (let si = sMin; si <= sMax; si++) cells.push({ dateIdx: di, slotIdx: si });
    return cells;
  }

  gridEl.addEventListener("mousedown", (e) => {
    const cell = e.target.closest(".grid-cell");
    if (!cell || cell.disabled) return;
    dragStart = { dateIdx: Number(cell.dataset.dateIdx), slotIdx: Number(cell.dataset.slotIdx) };
    dragging = true;
    applySelecting([dragStart]);
    e.preventDefault();
  });

  gridEl.addEventListener("mouseover", (e) => {
    if (!dragging) return;
    const cell = e.target.closest(".grid-cell");
    if (!cell || cell.disabled) return;
    const cur = { dateIdx: Number(cell.dataset.dateIdx), slotIdx: Number(cell.dataset.slotIdx) };
    applySelecting(computeRange(dragStart, cur));
  });

  const popup = document.createElement("div");
  popup.className = "status-popup";
  popup.hidden = true;
  popup.innerHTML = `
    <div class="status-popup-title">어떤 상태로 지정할까요?</div>
    <div class="status-popup-grid">
      <button type="button" class="opt-preferred" data-status="preferred">선호</button>
      <button type="button" class="opt-available" data-status="available">가능</button>
      <button type="button" class="opt-undesired" data-status="undesired">비선호</button>
      <button type="button" class="opt-unavailable" data-status="unavailable">불가능</button>
    </div>
  `;
  document.body.appendChild(popup);
  let popupCells = [];

  function openPopup(x, y, cells) {
    popupCells = cells;
    popup.style.left = Math.min(x, window.innerWidth - 220) + "px";
    popup.style.top = Math.min(y, window.innerHeight - 150) + "px";
    popup.hidden = false;
  }
  function closePopup() { popup.hidden = true; popupCells = []; }

  popup.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.dataset.status;
      const record = popupCells.map((c) => ({ ...c, prevStatus: state[c.dateIdx][c.slotIdx] }));
      record.forEach((r) => { state[r.dateIdx][r.slotIdx] = status; });
      historyStack.push(record);
      updateUndoBtn();
      renderCells();
      closePopup();
    });
  });

  document.addEventListener("mouseup", (e) => {
    if (!dragging) return;
    dragging = false;
    const range = lastRangeCells.slice();
    clearSelecting();
    dragStart = null;
    if (range.length === 0) return;
    openPopup(e.clientX, e.clientY, range);
  });

  document.addEventListener("mousedown", (e) => {
    if (!popup.hidden && !popup.contains(e.target)) closePopup();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
  });

  undoBtn.addEventListener("click", () => {
    const record = historyStack.pop();
    if (!record) return;
    record.forEach((r) => { state[r.dateIdx][r.slotIdx] = r.prevStatus; });
    updateUndoBtn();
    renderCells();
  });

  renderGrid();
  updateUndoBtn();

  return { getState: () => state };
}

/* ---------- RecommendationGrid: 추천 결과 순위 그리드 ---------- */

function mountRecommendationGrid(container, { dateAxis, timeAxis, candidates, role }) {
  const rankMap = dateAxis.map(() => timeAxis.map(() => null));
  candidates.forEach((c) => {
    const di = dateAxis.indexOf(c.date);
    const si = timeAxis.indexOf(c.time);
    if (di >= 0 && si >= 0) rankMap[di][si] = c;
  });

  const pages = buildCalendarPages(dateAxis);
  let pageIdx = 0;

  container.innerHTML = `
    <div class="grid-legend">
      <span class="badge" style="background:var(--rank-1-bg);color:var(--rank-1-text)">1순위</span>
      <span class="badge" style="background:var(--rank-2-bg);color:var(--rank-2-text)">2순위</span>
      <span class="badge" style="background:var(--rank-3-bg);color:var(--rank-3-text)">3순위</span>
      <span class="badge" style="background:var(--rank-4-bg);color:var(--rank-4-text)">4순위</span>
      <span class="badge" style="background:var(--rank-5-bg);color:var(--rank-5-text)">5순위</span>
      <span class="badge" style="background:#eceef2;color:#8a93a3">해당 없음</span>
    </div>
    <div class="grid-week-nav">
      <button type="button" class="grid-week-nav-btn" data-week-nav="-1">‹ 이전 주</button>
      <span class="grid-week-label"></span>
      <button type="button" class="grid-week-nav-btn" data-week-nav="1">다음 주 ›</button>
    </div>
    <div class="grid-scroll"><div class="rec-grid"></div></div>
  `;

  const gridEl = container.querySelector(".rec-grid");
  const weekLabel = container.querySelector(".grid-week-label");
  const prevBtn = container.querySelector('[data-week-nav="-1"]');
  const nextBtn = container.querySelector('[data-week-nav="1"]');

  const popup = document.createElement("div");
  popup.className = "rec-popup";
  popup.hidden = true;
  document.body.appendChild(popup);

  function openRecPopup(e, candidate) {
    popup.innerHTML = `
      <div class="rec-popup-title">${candidate.rank}순위</div>
      <div class="rec-popup-datetime">${formatDateLabel(candidate.date)} ${candidate.time}</div>
      <div class="rec-popup-reason">${candidate.reason}</div>
      <div class="rec-popup-badges">
        <span class="badge badge-available">가능 ${candidate.availableCount}</span>
        <span class="badge badge-preferred">선호 ${candidate.preferredCount}</span>
        <span class="badge badge-undesired">비선호 ${candidate.undesiredCount}</span>
      </div>
      ${role === "admin" ? `<button type="button" class="btn btn-primary btn-block" data-confirm>이 시간으로 확정</button>` : ""}
    `;
    popup.style.left = Math.min(e.clientX, window.innerWidth - 260) + "px";
    popup.style.top = Math.min(e.clientY, window.innerHeight - 220) + "px";
    popup.hidden = false;
    const confirmBtn = popup.querySelector("[data-confirm]");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        location.href = withProtoQuery(PAGE.final, { status: "finalized" });
      });
    }
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `52px repeat(7, minmax(46px, 1fr))`;
    const week = pages[pageIdx];

    weekLabel.textContent = `${formatDateLabel(week[0].dateStr)} ~ ${formatDateLabel(week[6].dateStr)}`;
    prevBtn.disabled = pageIdx === 0;
    nextBtn.disabled = pageIdx === pages.length - 1;

    const corner = document.createElement("div");
    corner.className = "grid-corner";
    corner.style.gridColumn = "1";
    corner.style.gridRow = "1";
    gridEl.appendChild(corner);

    week.forEach((day, col) => {
      const header = document.createElement("div");
      header.className = `grid-date-header${day.inRange ? "" : " day-disabled"}`;
      header.style.gridColumn = String(col + 2);
      header.style.gridRow = "1";
      header.innerHTML = `<div class="grid-date-label">${formatDateLabel(day.dateStr)}</div>`;
      gridEl.appendChild(header);
    });

    timeAxis.forEach((t, si) => {
      const label = document.createElement("div");
      label.className = "grid-time-label";
      label.style.gridColumn = "1";
      label.style.gridRow = String(si + 2);
      label.textContent = t;
      gridEl.appendChild(label);

      week.forEach((day, col) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.style.gridColumn = String(col + 2);
        cell.style.gridRow = String(si + 2);
        if (!day.inRange) {
          cell.className = "grid-cell cell-disabled";
          cell.disabled = true;
          gridEl.appendChild(cell);
          return;
        }
        const candidate = rankMap[day.dateIdx][si];
        if (candidate) {
          cell.className = `grid-cell rec-candidate rank-${candidate.rank}`;
          cell.textContent = String(candidate.rank);
          cell.addEventListener("click", (e) => openRecPopup(e, candidate));
        } else {
          cell.className = "grid-cell cell-disabled";
          cell.disabled = true;
        }
        gridEl.appendChild(cell);
      });
    });
  }

  prevBtn.addEventListener("click", () => { if (pageIdx > 0) { pageIdx--; renderGrid(); } });
  nextBtn.addEventListener("click", () => { if (pageIdx < pages.length - 1) { pageIdx++; renderGrid(); } });

  document.addEventListener("mousedown", (e) => {
    if (!popup.hidden && !popup.contains(e.target) && !e.target.closest(".rec-candidate")) popup.hidden = true;
  });

  renderGrid();
}
