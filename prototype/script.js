/* One-Step 프로토타입 로직 (바닐라 JS 목업)
   - plan.md 핵심 기능 2개를 동작으로 구현: ① AI 도전 분해  ② 퀘스트 실행 루프(보상) */

// ===== 상태 =====
const state = {
  level: 12,
  xp: 4,
  coin: 28,
  rebirth: 3,
  quests: [
    { id: 1, title: "공고 페이지 열어보기", diff: "easy", done: false },
    { id: 2, title: "아이디어 3줄 메모", diff: "normal", done: false },
    { id: 3, title: "지원서 초안 쓰기", diff: "hard", done: false },
  ],
  archive: [
    { icon: "📄", title: "공모전 제출", date: "2026.07.10", diff: "hard" },
    { icon: "🏃", title: "운동 30분", date: "2026.07.09", diff: "normal" },
    { icon: "🔍", title: "공고 탐색", date: "2026.07.08", diff: "easy" },
  ],
  aiResult: [],
  pendingQuestId: null,
};

// 난이도별 보상 (plan.md 기준)
const REWARD = {
  easy:   { coin: 3, xp: 5,  label: "쉬움" },
  normal: { coin: 5, xp: 10, label: "보통" },
  hard:   { coin: 10, xp: 20, label: "어려움" },
};
const PHOTO_BONUS = { coin: 3, xp: 3 };

// 진화 단계 (레벨 구간 → 단계명/이모지/레벨당 필요 XP)
function stageOf(level) {
  if (level <= 9)  return { name: "알", emoji: "🥚", need: 5 };
  if (level <= 19) return { name: "참새", emoji: "🐤", need: 10 };
  if (level <= 29) return { name: "매", emoji: "🕊️", need: 20 };
  if (level <= 44) return { name: "독수리", emoji: "🦅", need: 40 };
  return { name: "이펙트 독수리", emoji: "🦅✨", need: 80 };
}

let questSeq = 100;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 화면 전환 =====
const SCREEN_TITLE = {
  home: "홈 / 캐릭터", quest: "퀘스트", "ai-input": "★ AI 도전 분해",
  "ai-result": "★ AI 분해 결과", shop: "상점 / 꾸미기", archive: "성취 보관함", my: "마이페이지",
};
const TAB_OF = { home: "home", quest: "quest", "ai-input": "quest", "ai-result": "quest", shop: "shop", archive: "archive", my: "my" };

function go(screen) {
  $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === screen));
  $("#appbar").textContent = SCREEN_TITLE[screen];
  $$("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === TAB_OF[screen]));
  const scr = $(`.screen[data-screen="${screen}"]`);
  if (scr) scr.scrollTop = 0;
}

// ===== 토스트 =====
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1900);
}

// ===== 렌더링 =====
function renderHome() {
  const st = stageOf(state.level);
  $("#home-level").textContent = "Lv." + state.level;
  $("#home-stage").textContent = st.name;
  $("#home-char").textContent = st.emoji;
  $("#home-coin").textContent = state.coin;
  const pct = Math.min(100, Math.round((state.xp / st.need) * 100));
  $("#home-xpfill").style.width = pct + "%";
  $("#home-xptext").textContent = `XP ${state.xp} / ${st.need}`;
  // 환생 버튼
  const rb = $("#btn-rebirth");
  if (state.level >= 50) { rb.disabled = false; rb.textContent = "🌟 환생하기 (Lv.50 도달!)"; }
  else { rb.disabled = true; rb.textContent = `환생 (50Lv 도달 시 활성 · 현재 Lv.${state.level})`; }
}

function questRow(q) {
  const r = REWARD[q.diff];
  return `
    <div class="quest ${q.done ? "done" : ""}" data-qid="${q.id}">
      <div class="check">${q.done ? "✓" : ""}</div>
      <div style="flex:1">
        <div class="quest__title">${q.title}</div>
        <div class="quest__meta">🪙 +${r.coin} · XP +${r.xp}</div>
      </div>
      <span class="pill pill--${q.diff}">${r.label}</span>
    </div>`;
}
function renderQuests() {
  $("#quest-list").innerHTML = state.quests.map(questRow).join("") ||
    `<p class="muted center">퀘스트가 없어요. AI로 도전을 쪼개보세요!</p>`;
}

function aiItemRow(item, idx) {
  return `
    <div class="ai-item" data-idx="${idx}">
      <div class="row">
        <input value="${item.title}" data-edit="${idx}"
          style="flex:1; border:none; font-size:14px; font-weight:600; outline:none; background:none" />
        <div class="ai-item__actions">
          <button data-del="${idx}" title="삭제">🗑️</button>
        </div>
      </div>
      <div class="row mt8">
        <select class="diff-select" data-diff="${idx}">
          <option value="easy"   ${item.diff==="easy"?"selected":""}>쉬움 · +3</option>
          <option value="normal" ${item.diff==="normal"?"selected":""}>보통 · +5</option>
          <option value="hard"   ${item.diff==="hard"?"selected":""}>어려움 · +10</option>
        </select>
        <span class="muted">🪙 +${REWARD[item.diff].coin} · XP +${REWARD[item.diff].xp}</span>
      </div>
    </div>`;
}
function renderAiResult() {
  $("#ai-result-list").innerHTML = state.aiResult.map(aiItemRow).join("");
}

function renderShop() {
  $("#shop-coin").textContent = state.coin;
  const items = [
    { name: "배경 테마", price: 10, icon: "🌌" },
    { name: "발판/바닥", price: 20, icon: "🌿" },
    { name: "파티클 이펙트", price: 30, icon: "✨" },
    { name: "이름표 꾸미기", price: 40, icon: "🏷️" },
    { name: "오라/후광", price: 50, icon: "🌟" },
    { name: "캐릭터 해금", price: 0, icon: "🐉", locked: true },
  ];
  $("#shop-grid").innerHTML = items.map((it) => `
    <div class="shop-item ${it.locked ? "locked" : ""}" data-price="${it.price}" data-name="${it.name}">
      <div style="font-size:26px">${it.icon}</div>
      <div class="mt8" style="font-size:13px; font-weight:600">${it.name}</div>
      <div class="price">${it.locked ? "환생 3회 해금" : "🪙 " + it.price}</div>
    </div>`).join("");
}

function renderArchive() {
  $("#arc-count").textContent = state.archive.length + 1; // + 초기 누적 표현
  $("#archive-list").innerHTML = state.archive.map((a) => `
    <div class="rec">
      <div class="rec__thumb">${a.icon}</div>
      <div style="flex:1">
        <div style="font-weight:600; font-size:14px">${a.title}</div>
        <div class="muted">${a.date}</div>
      </div>
      <span class="pill pill--${a.diff}">${REWARD[a.diff].label}</span>
    </div>`).join("");
}

// ===== AI 도전 분해 (목업 엔진) =====
function decompose(goal) {
  const g = (goal || "이 목표").trim();
  const isContest = /공모전|대회|지원|공고/.test(g);
  const base = isContest
    ? [
        { title: "공고 페이지 열어 조건 확인하기", diff: "easy" },
        { title: "마감일·제출물 목록 정리하기", diff: "easy" },
        { title: "핵심 아이디어 3줄 메모하기", diff: "normal" },
        { title: "지원서 초안 1단락 쓰기", diff: "normal" },
        { title: "최종 제출·완료하기", diff: "hard" },
      ]
    : [
        { title: `${g} 관련 정보 검색하기`, diff: "easy" },
        { title: `${g}, 오늘 할 첫 단계 정하기`, diff: "easy" },
        { title: `${g} 핵심 3줄 메모하기`, diff: "normal" },
        { title: `${g} 초안/1차 시도하기`, diff: "normal" },
        { title: `${g} 마무리·완료하기`, diff: "hard" },
      ];
  return base;
}

// ===== 보상 지급 & 레벨업 =====
function grantReward(diff, withPhoto) {
  const r = REWARD[diff];
  let coin = r.coin, xp = r.xp;
  if (withPhoto) { coin += PHOTO_BONUS.coin; xp += PHOTO_BONUS.xp; }
  state.coin += coin;
  state.xp += xp;

  // 레벨업/진화 처리
  let leveled = false, evolved = false;
  let beforeStage = stageOf(state.level).name;
  while (state.xp >= stageOf(state.level).need && state.level < 50) {
    state.xp -= stageOf(state.level).need;
    state.level += 1;
    leveled = true;
    if (stageOf(state.level).name !== beforeStage) { evolved = true; beforeStage = stageOf(state.level).name; }
  }
  if (state.level >= 50) state.xp = 0;

  renderHome();
  let msg = `🪙 +${coin} · XP +${xp} 획득!`;
  if (evolved) msg = `✨ 진화! ${stageOf(state.level).name} (Lv.${state.level})`;
  else if (leveled) msg = `⬆️ 레벨업! Lv.${state.level} · 🪙 +${coin}`;
  toast(msg);
}

// ===== 이벤트 바인딩 =====
function bind() {
  // 탭
  $("#tabbar").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (b) go(b.dataset.tab);
  });
  // data-go 버튼
  $$("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));

  // AI 진입
  $("#ai-entry").addEventListener("click", () => { $("#ai-goal").value = ""; go("ai-input"); });

  // AI 실행
  $("#btn-run-ai").addEventListener("click", () => {
    const goal = $("#ai-goal").value.trim();
    if (!goal) { toast("목표를 입력해 주세요"); return; }
    const btn = $("#btn-run-ai");
    btn.textContent = "분해 중…"; btn.disabled = true;
    setTimeout(() => {                       // LLM 호출 흉내(지연)
      state.aiResult = decompose(goal);
      $("#ai-result-goal").textContent = `"${goal}" → ${state.aiResult.length}단계로 분해됨`;
      renderAiResult();
      btn.textContent = "AI로 분해하기"; btn.disabled = false;
      go("ai-result");
    }, 650);
  });

  // AI 결과 편집 (수정/삭제/난이도)
  $("#ai-result-list").addEventListener("input", (e) => {
    if (e.target.dataset.edit !== undefined) state.aiResult[e.target.dataset.edit].title = e.target.value;
    if (e.target.dataset.diff !== undefined) { state.aiResult[e.target.dataset.diff].diff = e.target.value; renderAiResult(); }
  });
  $("#ai-result-list").addEventListener("click", (e) => {
    const del = e.target.dataset.del;
    if (del !== undefined) { state.aiResult.splice(del, 1); renderAiResult(); }
  });

  // 재생성
  $("#btn-regenerate").addEventListener("click", () => {
    // 난이도를 살짝 흔들어 재생성 흉내
    state.aiResult = state.aiResult.map((it) => ({ ...it }));
    if (state.aiResult.length) {
      const diffs = ["easy", "normal", "hard"];
      state.aiResult.forEach((it, i) => it.diff = diffs[Math.min(2, Math.floor(i * 3 / state.aiResult.length))]);
    }
    renderAiResult();
    toast("↻ 다시 분해했어요");
  });

  // 확정 → 퀘스트로 일괄 등록
  $("#btn-confirm-quests").addEventListener("click", () => {
    if (!state.aiResult.length) { toast("등록할 퀘스트가 없어요"); return; }
    state.aiResult.forEach((it) => state.quests.push({ id: ++questSeq, title: it.title, diff: it.diff, done: false }));
    toast(`${state.aiResult.length}개 퀘스트 등록 완료!`);
    state.aiResult = [];
    renderQuests();
    go("quest");
  });

  // 직접 등록
  $("#btn-add-quest").addEventListener("click", () => {
    const title = prompt("새 퀘스트 제목을 입력하세요");
    if (!title) return;
    const diff = (prompt("난이도: easy / normal / hard", "normal") || "normal").toLowerCase();
    state.quests.push({ id: ++questSeq, title, diff: REWARD[diff] ? diff : "normal", done: false });
    renderQuests();
    toast("퀘스트 등록됨");
  });

  // 퀘스트 완료 체크 → 모달
  $("#quest-list").addEventListener("click", (e) => {
    const row = e.target.closest(".quest"); if (!row) return;
    const q = state.quests.find((x) => x.id == row.dataset.qid);
    if (!q || q.done) return;
    state.pendingQuestId = q.id;
    $("#complete-title").textContent = `"${q.title}" 완료`;
    $("#complete-modal").classList.add("show");
  });

  // 완료 모달 - 확정(인증 첨부) / 건너뛰기
  function finishQuest(withPhoto) {
    const q = state.quests.find((x) => x.id === state.pendingQuestId);
    $("#complete-modal").classList.remove("show");
    if (!q) return;
    q.done = true;
    grantReward(q.diff, withPhoto);
    // 보관함 기록 추가
    state.archive.unshift({ icon: withPhoto ? "📸" : "✅", title: q.title, date: "2026.07.08", diff: q.diff });
    renderQuests(); renderArchive(); renderShop();
    state.pendingQuestId = null;
  }
  $("#btn-complete-confirm").addEventListener("click", () => finishQuest(true));
  $("#btn-complete-skip").addEventListener("click", () => finishQuest(false));
  $("#complete-modal").addEventListener("click", (e) => {
    if (e.target.id === "complete-modal") $("#complete-modal").classList.remove("show");
  });

  // 상점 구매
  $("#shop-grid").addEventListener("click", (e) => {
    const it = e.target.closest(".shop-item"); if (!it) return;
    const price = +it.dataset.price;
    if (it.classList.contains("locked")) { toast("환생 3회 달성 시 해금됩니다"); return; }
    if (state.coin < price) { toast("코인이 부족해요"); return; }
    state.coin -= price;
    renderShop(); renderHome();
    toast(`${it.dataset.name} 구매! 🪙 -${price}`);
  });

  // 환생
  $("#btn-rebirth").addEventListener("click", () => {
    if (state.level < 50) return;
    state.level = 1; state.xp = 0; state.rebirth += 1;
    renderHome();
    toast(`🌟 환생 완료! 표식 +1 (총 ${state.rebirth}회) · 코인/아이템 유지`);
  });

  // 스위치 토글
  $$("[data-toggle]").forEach((sw) => sw.addEventListener("click", () => sw.classList.toggle("on")));
}

// ===== 초기화 =====
renderHome();
renderQuests();
renderShop();
renderArchive();
bind();
go("home");
