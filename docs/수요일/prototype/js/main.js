/* =========================================================
   PREFER 프로토타입 — 페이지별 부트스트랩
   mock-data.js, components.js 다음에 로드된다.
   ========================================================= */

const STATUS_LABEL = {
  collecting: "응답 중",
  closed: "응답 마감",
  recommended: "추천 결과 생성됨",
  finalized: "최종 확정",
};

function buildPrefillRanges(dateAxis, timeAxis, ranges) {
  const prefill = [];
  ranges.forEach((r) => {
    const di = dateAxis.indexOf(r.date);
    if (di < 0) return;
    timeAxis.forEach((t, si) => {
      if (t >= r.from && t < r.to) prefill.push({ dateIdx: di, slotIdx: si, status: r.status });
    });
  });
  return prefill;
}

function getDisplayName(role) {
  return role === "admin" ? mockMeeting.creatorName : "민수";
}

function renderRoleBadge(container, role, name) {
  container.innerHTML = `<span class="badge badge-role">${name}님으로 참여 중 (${role === "admin" ? "관리자" : "참여자"})</span>`;
}

/* ---------- index.html ---------- */

function initIndexPage() {
  const createModal = buildCreateModal({
    onSubmit: () => {
      location.href = withProtoQuery(PAGE.hub, { role: "admin", status: "collecting" }) + "&justCreated=1";
    },
  });
  const joinModal = buildJoinModal({
    withLinkField: true,
    title: "약속 참여하기",
    onSubmit: (name) => {
      const role = name === mockMeeting.creatorName ? "admin" : "participant";
      location.href = withProtoQuery(PAGE.hub, { role, status: "collecting" });
    },
  });

  document.getElementById("btn-open-create").addEventListener("click", () => createModal.open());
  document.getElementById("btn-open-join").addEventListener("click", () => joinModal.open());
}

/* ---------- hub.html ---------- */

function buildHubActions({ role, status }) {
  const actions = [];
  if (status === "collecting") {
    actions.push({ label: "약속 투표하기", variant: "btn-primary", grow: true, action: "vote" });
    actions.push({ label: "투표 마감하기", variant: "btn-danger", grow: false, action: "close" });
  } else if (status === "closed" || status === "recommended") {
    actions.push({ label: "추천 결과 보기", variant: "btn-secondary", grow: true, action: "results" });
    if (role === "admin") {
      actions.push({ label: "투표 다시 열기", variant: "btn-secondary", grow: false, action: "reopen" });
    }
  } else if (status === "finalized") {
    actions.push({ label: "추천 결과 보기", variant: "btn-secondary", grow: true, action: "results" });
    actions.push({ label: "최종 결과 보기", variant: "btn-secondary", grow: false, action: "final" });
  }
  return actions;
}

function initHubPage() {
  const params = new URLSearchParams(location.search);

  if (!params.has("loggedIn")) {
    document.getElementById("hub-loading").hidden = false;
    const inlineJoin = buildJoinModal({
      withLinkField: false,
      title: "이 약속에 참여하려면 이름과 비밀번호를 알려주세요",
      onSubmit: (name) => {
        const role = name === mockMeeting.creatorName ? "admin" : "participant";
        location.href = withProtoQuery(PAGE.hub, { role, status: "collecting" });
      },
    });
    inlineJoin.open();
    return;
  }

  const { role, status } = getProtoState();
  const name = getDisplayName(role);

  document.getElementById("hub-content").style.display = "contents";
  renderRoleBadge(document.getElementById("hub-role-badge"), role, name);
  document.getElementById("hub-title").textContent = mockMeeting.title;
  document.getElementById("hub-sub").textContent =
    `${formatDateLabel(mockMeeting.startDate)} ~ ${formatDateLabel(mockMeeting.endDate)} · ${mockMeeting.startTime}~${mockMeeting.endTime}`;

  document.getElementById("hub-status-badge").textContent = STATUS_LABEL[status];
  renderProgressBar(document.getElementById("hub-progress"), mockMeeting.submittedCount, mockMeeting.totalParticipants);
  document.getElementById("hub-link-box").textContent = mockMeeting.joinLink;
  wireCopyButton(document.getElementById("hub-copy-btn"), "링크 복사");

  const actionsRow = document.getElementById("hub-actions");
  const errorText = document.getElementById("hub-error-text");
  const closeModal = buildCloseConfirmModal({
    onConfirm: () => { location.href = withProtoQuery(PAGE.results, { status: "recommended" }); },
  });

  actionsRow.innerHTML = "";
  buildHubActions({ role, status }).forEach((a) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${a.variant} ${a.grow ? "btn-grow" : ""}`;
    btn.textContent = a.label;
    btn.addEventListener("click", () => {
      if (a.action === "vote") location.href = withProtoQuery(PAGE.vote, {});
      else if (a.action === "close") {
        if (role === "admin") {
          closeModal.open();
        } else {
          errorText.hidden = false;
          setTimeout(() => { errorText.hidden = true; }, 2500);
        }
      } else if (a.action === "results") location.href = withProtoQuery(PAGE.results, {});
      else if (a.action === "reopen") location.href = withProtoQuery(PAGE.hub, { status: "collecting" });
      else if (a.action === "final") location.href = withProtoQuery(PAGE.final, {});
    });
    actionsRow.appendChild(btn);
  });

  // 참여 현황: 관리자·참여자 모두에게 노출한다 (수정 요구사항 반영).
  const participantList = document.getElementById("hub-participant-list");
  participantList.innerHTML = mockParticipants.map((p) => `
    <div class="participant-row">
      <span>${p.name}</span>
      <span class="badge ${p.submitted ? "badge-preferred" : "badge-unavailable"}">${p.submitted ? "완료" : "미완료"}</span>
    </div>
  `).join("");

  if (params.get("justCreated") === "1") {
    const completionModal = buildCompletionModal();
    completionModal.open();
    const url = new URL(location.href);
    url.searchParams.delete("justCreated");
    history.replaceState(null, "", url);
  }

  mountProtoSwitcher();
}

/* ---------- vote.html / vote-confirm.html ---------- */

function initVotePage({ withChat, prefill, nextPage }) {
  const { role, status } = getProtoState();
  const name = getDisplayName(role);

  if (withChat) document.getElementById("vote-heading").textContent = `${mockMeeting.title} · 일정 입력`;
  document.getElementById("vote-sub").textContent = withChat
    ? `${name}님, 시간표를 드래그해서 범위를 선택하면 상태를 고를 수 있어요.`
    : "입력하신 내용을 색으로 정리했어요. 잘못된 부분이 있으면 드래그해서 다시 지정할 수 있어요.";

  const dateAxis = buildDateAxis(mockMeeting.startDate, mockMeeting.endDate);
  const timeAxis = buildTimeAxis(mockMeeting.startTime, mockMeeting.endTime);

  if (withChat) mountChatPanel(document.getElementById("vote-chat"));
  mountPreferenceGrid(document.getElementById("vote-grid"), { dateAxis, timeAxis, prefill });

  document.getElementById("vote-submit").addEventListener("click", () => {
    location.href = withProtoQuery(nextPage, { role, status });
  });
  document.getElementById("vote-back").addEventListener("click", () => {
    location.href = withProtoQuery(PAGE.hub, {});
  });

  mountProtoSwitcher();
}

/* ---------- vote-done.html ---------- */

function initVoteDonePage() {
  const summary = document.getElementById("vote-done-summary");
  summary.innerHTML = `
    <div class="participant-row"><span>불가능 · 7/14 09:00~12:00</span><span class="badge badge-unavailable">불가능</span></div>
    <div class="participant-row"><span>선호 · 7/16 18:00~19:00</span><span class="badge badge-preferred">선호</span></div>
    <div class="participant-row"><span>비선호 · 7/15 13:00~15:00</span><span class="badge badge-undesired">비선호</span></div>
  `;
  document.getElementById("vote-done-edit").addEventListener("click", () => {
    location.href = withProtoQuery(PAGE.vote, {});
  });
  const shareBtn = document.getElementById("vote-done-share");
  wireCopyButton(shareBtn, "약속 링크 공유하기");
  document.getElementById("vote-done-home").addEventListener("click", () => {
    location.href = withProtoQuery(PAGE.hub, {});
  });
}

/* ---------- results.html ---------- */

function initResultsPage() {
  const { role } = getProtoState();
  const dateAxis = buildDateAxis(mockMeeting.startDate, mockMeeting.endDate);
  const timeAxis = buildTimeAxis(mockMeeting.startTime, mockMeeting.endTime);
  mountRecommendationGrid(document.getElementById("results-grid"), { dateAxis, timeAxis, candidates: mockCandidates, role });

  document.getElementById("results-caption").hidden = role === "admin";
  document.getElementById("results-back").addEventListener("click", () => {
    location.href = withProtoQuery(PAGE.hub, {});
  });

  mountProtoSwitcher();
}

/* ---------- final.html ---------- */

function initFinalPage() {
  document.getElementById("final-datetime").textContent = `${formatDateLong(mockFinalResult.date)} ${mockFinalResult.time}`;
  document.getElementById("final-rationale").textContent = mockFinalResult.rationale;
  document.getElementById("final-link-box").textContent = mockMeeting.joinLink + "/final";
  wireCopyButton(document.getElementById("final-copy-btn"), "링크 복사");
  document.getElementById("final-back").addEventListener("click", () => {
    location.href = withProtoQuery(PAGE.hub, { status: "finalized" });
  });

  mountProtoSwitcher();
}
