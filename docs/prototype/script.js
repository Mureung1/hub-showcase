/* One-Step 프로토타입 로직 — Warm Achievement 디자인
   핵심 기능 2개: ① AI 도전 분해  ② 퀘스트 실행 루프(보상/성장)
   색 역할: 🟢 성장/완료 · 🔵 AI/정보 · 🟡 코인/보상(전용) */

// ===== 상태 =====
const state = {
  level: 12,
  xp: 4,
  coin: 120,
  rebirth: 3,
  quests: [
    { id: 1, title: "공고 페이지 열어보기", diff: "easy", done: false },
    { id: 2, title: "아이디어 3줄 메모하기", diff: "normal", done: false },
    { id: 3, title: "지원서 초안 쓰기", diff: "hard", done: false },
  ],
  archive: [
    { icon: "🏆", title: "공모전 최종 제출", date: "2026.07.10", diff: "hard", desc: "국내 학술 공모전에 최종 프로젝트를 성공적으로 제출했다." },
    { icon: "🏃", title: "운동 30분 완료", date: "2026.07.09", diff: "normal", desc: "미루던 운동 루틴을 다시 시작했다." },
    { icon: "🔍", title: "공고 탐색", date: "2026.07.08", diff: "easy", desc: "관심 대외활동 공고 3개를 살펴봤다." },
  ],
  aiResult: [],
  shopFilter: "전체",
  pendingQuestId: null,
};

// 난이도별 보상 (plan.md 기준)
const REWARD = {
  easy:   { coin: 3,  xp: 5,  label: "쉬움" },
  normal: { coin: 5,  xp: 10, label: "보통" },
  hard:   { coin: 10, xp: 20, label: "어려움" },
};
const PHOTO_BONUS = { coin: 3, xp: 3 };

// 진화 단계 (레벨 구간 → 단계명/이모지/레벨당 필요 XP)
function stageOf(level) {
  if (level <= 9)  return { name: "알", emoji: "🥚", need: 5 };
  if (level <= 19) return { name: "참새", emoji: "🐤", need: 10 };
  if (level <= 29) return { name: "매", emoji: "🕊️", need: 20 };
  if (level <= 44) return { name: "독수리", emoji: "🦅", need: 40 };
  return { name: "이펙트 독수리", emoji: "🦅", need: 80 };
}

// 환생 등급 타이틀
function rebirthTitle(n) {
  return ["Novice", "Apprentice", "Adept", "Master Scholar", "Grand Scholar", "Sage", "Archmage"][Math.min(n, 6)];
}

let questSeq = 100;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmt = (n) => n.toLocaleString("en-US");

// ===== 화면 전환 =====
const TAB_OF = { home: "home", quest: "quest", "ai-result": "quest", shop: "shop", storage: "storage", my: "my" };
function go(screen) {
  $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === screen));
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
  toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
}

// ===== 코인 표시 동기화 =====
function renderCoins() {
  const c = fmt(state.coin);
  $("#hdr-coin").textContent = c;
  $("#home-coin").textContent = c;
  $("#shop-coin").textContent = c;
}

// ===== 홈 =====
function renderHome() {
  const st = stageOf(state.level);
  $("#home-char").textContent = st.emoji;
  $("#home-level").textContent = state.level;
  $("#home-stage").textContent = st.name;
  $("#my-level").textContent = state.level;
  $("#home-xptext").textContent = `${state.xp} / ${st.need} XP`;
  $("#home-xpfill").style.width = Math.min(100, Math.round((state.xp / st.need) * 100)) + "%";
  renderCoins();

  const rb = $("#btn-rebirth");
  const lbl = $("#rebirth-label");
  if (state.level >= 50) { rb.disabled = false; lbl.textContent = "환생하기!"; }
  else { rb.disabled = true; lbl.textContent = `환생 (Lv.${state.level})`; }

  // 홈 미리보기 (미완료 2개)
  const preview = state.quests.filter((q) => !q.done).slice(0, 2);
  $("#home-quest-preview").innerHTML = preview.map(questRow).join("") ||
    `<p class="muted center">모든 퀘스트를 완료했어요! 🎉</p>`;
}

// ===== 퀘스트 =====
function questRow(q) {
  const r = REWARD[q.diff];
  return `
    <div class="quest ${q.diff} ${q.done ? "done" : ""}" data-qid="${q.id}">
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
  renderHome();
}

// ===== AI 분해 결과 =====
function aiItemRow(item, idx) {
  const r = REWARD[item.diff];
  return `
    <div class="ai-item" data-idx="${idx}">
      <div class="row">
        <input class="title-edit" value="${item.title.replace(/"/g, "&quot;")}" data-edit="${idx}" />
        <div class="ai-item__actions"><button data-del="${idx}" title="삭제"><span class="material-symbols-outlined">delete</span></button></div>
      </div>
      <div class="row mt10">
        <select class="diff-select" data-diff="${idx}">
          <option value="easy"   ${item.diff==="easy"?"selected":""}>쉬움</option>
          <option value="normal" ${item.diff==="normal"?"selected":""}>보통</option>
          <option value="hard"   ${item.diff==="hard"?"selected":""}>어려움</option>
        </select>
        <span class="muted">🪙 +${r.coin} · XP +${r.xp}</span>
      </div>
    </div>`;
}
function renderAiResult() {
  $("#ai-result-list").innerHTML = state.aiResult.map(aiItemRow).join("");
}

function decompose(goal) {
  const g = (goal || "이 목표").trim();
  const isContest = /공모전|대회|지원|공고|취업|인턴/.test(g);
  return isContest
    ? [
        { title: "공고 페이지 열어 지원 조건 확인하기", diff: "easy" },
        { title: "마감일·제출물 목록 정리하기", diff: "easy" },
        { title: "핵심 아이디어 3줄 메모하기", diff: "normal" },
        { title: "지원서 초안 1단락 작성하기", diff: "normal" },
        { title: "최종 검토 후 제출·완료하기", diff: "hard" },
      ]
    : [
        { title: `${g} 관련 정보 검색하기`, diff: "easy" },
        { title: `${g}, 오늘 할 첫 단계 정하기`, diff: "easy" },
        { title: `${g} 핵심 3줄 메모하기`, diff: "normal" },
        { title: `${g} 초안/1차 시도하기`, diff: "normal" },
        { title: `${g} 마무리·완료하기`, diff: "hard" },
      ];
}

// ===== 상점 =====
const SHOP_ITEMS = [
  { name: "배경 테마",       cat: "배경",   price: 10,  icon: "🌌", desc: "캐릭터 뒤 하늘·숲·우주 배경" },
  { name: "발판 / 바닥",     cat: "발판",   price: 20,  icon: "🌿", desc: "구름, 잔디, 돌단상 등 서 있는 자리" },
  { name: "파티클 이펙트",   cat: "이펙트", price: 30,  icon: "✨", desc: "주변에 떠다니는 반짝이·나뭇잎" },
  { name: "이름표 꾸미기",   cat: "이름표", price: 40,  icon: "🏷️", desc: "이름 옆 칭호·아이콘·말풍선" },
  { name: "오라 / 후광",     cat: "오라",   price: 50,  icon: "🌟", desc: "캐릭터를 감싸는 빛 효과" },
  { name: "미스틱 스칼라",   cat: "배경",   price: 200, icon: "🧙", desc: "환생 3회 달성 시 해금되는 특별 캐릭터", epic: true },
];
function renderShop() {
  renderCoins();
  const list = SHOP_ITEMS.filter((it) => state.shopFilter === "전체" || it.cat === state.shopFilter);
  $("#shop-grid").innerHTML = list.map((it) => `
    <div class="shop-item" data-name="${it.name}" data-price="${it.price}">
      <div class="shop-item__img">
        ${it.epic ? '<span class="badge-epic epic">EPIC</span>' : ""}
        <span class="lvl">Lv.${it.epic ? "20" : "1"}</span>
        ${it.icon}
      </div>
      <div class="shop-item__title">${it.name}</div>
      <div class="shop-item__desc">${it.desc}</div>
      <div class="row">
        <span class="price-tag"><span class="dot"></span>${fmt(it.price)}</span>
        <button class="btn btn--primary" style="width:auto; padding:9px 18px; font-size:13px">구매</button>
      </div>
    </div>`).join("");
}

// ===== 보관함 =====
function renderStorage() {
  $("#vault-count").textContent = 139 + state.archive.length;
  $("#vault-streak").textContent = 14;
  $("#rebirth-stars").textContent = "★".repeat(Math.max(1, state.rebirth));
  $("#rebirth-title").textContent = rebirthTitle(state.rebirth);
  $("#timeline-list").innerHTML = state.archive.map((a) => {
    const r = REWARD[a.diff];
    return `
    <div class="timeline-item">
      <div class="row">
        <span class="ms-chip">마일스톤</span>
        <span class="date">📅 ${a.date}</span>
      </div>
      <h4>${a.title}</h4>
      <div class="muted">${a.desc || ""}</div>
      <div class="xp-tag"><span class="tro">${a.icon}</span> +${r.xp} XP</div>
    </div>`;
  }).join("");
}

// ===== 보상 지급 & 레벨업 =====
function grantReward(diff, withPhoto) {
  const r = REWARD[diff];
  let coin = r.coin, xp = r.xp;
  if (withPhoto) { coin += PHOTO_BONUS.coin; xp += PHOTO_BONUS.xp; }
  state.coin += coin;
  state.xp += xp;

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
  if (evolved) toast(`✨ 진화! ${stageOf(state.level).name} (Lv.${state.level})`);
  else if (leveled) toast(`⬆️ 레벨업! Lv.${state.level} · 🪙 +${coin}`);
  else toast(`🪙 +${coin} · XP +${xp} 획득!`);
}

// ===== 완료 모달 =====
function openComplete(q) {
  state.pendingQuestId = q.id;
  const r = REWARD[q.diff];
  $("#complete-desc").innerHTML = `"<b>${q.title}</b>" 을(를) 완료합니다.`;
  $("#reward-coin").textContent = `+${r.coin}`;
  $("#reward-xp").textContent = `+${r.xp}`;
  $("#complete-modal").classList.add("show");
}
function finishQuest(withPhoto) {
  const q = state.quests.find((x) => x.id === state.pendingQuestId);
  $("#complete-modal").classList.remove("show");
  if (!q) return;
  q.done = true;
  grantReward(q.diff, withPhoto);
  state.archive.unshift({
    icon: withPhoto ? "📸" : "✅", title: q.title, date: "2026.07.09", diff: q.diff,
    desc: withPhoto ? "사진 인증과 함께 완료했다." : "퀘스트를 완료했다.",
  });
  renderQuests(); renderStorage(); renderShop();
  state.pendingQuestId = null;
}

// ===== 이벤트 =====
function bind() {
  $("#tabbar").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); });
  $$("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));

  // AI 실행
  $("#btn-run-ai").addEventListener("click", () => {
    const goal = $("#ai-goal").value.trim();
    if (!goal) { toast("목표를 입력해 주세요"); return; }
    const btn = $("#btn-run-ai");
    const html = btn.innerHTML;
    btn.innerHTML = "분해 중…"; btn.disabled = true;
    setTimeout(() => {
      state.aiResult = decompose(goal);
      $("#ai-result-goal").textContent = `"${goal}" → ${state.aiResult.length}단계로 분해됨`;
      renderAiResult();
      btn.innerHTML = html; btn.disabled = false;
      go("ai-result");
    }, 650);
  });

  // AI 결과 편집
  $("#ai-result-list").addEventListener("input", (e) => {
    if (e.target.dataset.edit !== undefined) state.aiResult[e.target.dataset.edit].title = e.target.value;
    if (e.target.dataset.diff !== undefined) { state.aiResult[e.target.dataset.diff].diff = e.target.value; renderAiResult(); }
  });
  $("#ai-result-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (btn) { state.aiResult.splice(btn.dataset.del, 1); renderAiResult(); }
  });

  // 재생성
  $("#btn-regenerate").addEventListener("click", () => {
    if (state.aiResult.length) {
      const diffs = ["easy", "normal", "hard"];
      state.aiResult.forEach((it, i) => it.diff = diffs[Math.min(2, Math.floor(i * 3 / state.aiResult.length))]);
    }
    renderAiResult();
    toast("↻ 다시 분해했어요");
  });

  // 확정 → 퀘스트 등록
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

  // 퀘스트 완료 (목록 + 홈 미리보기 공용)
  function questClick(e) {
    const row = e.target.closest(".quest"); if (!row) return;
    const q = state.quests.find((x) => x.id == row.dataset.qid);
    if (q && !q.done) openComplete(q);
  }
  $("#quest-list").addEventListener("click", questClick);
  $("#home-quest-preview").addEventListener("click", questClick);

  // 완료 모달
  $("#btn-complete-confirm").addEventListener("click", () => finishQuest(true));
  $("#btn-complete-skip").addEventListener("click", () => finishQuest(false));
  $("#complete-x").addEventListener("click", () => $("#complete-modal").classList.remove("show"));

  // 상점 카테고리 필터
  $("#shop-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip"); if (!chip) return;
    $$("#shop-chips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.shopFilter = chip.textContent.trim();
    renderShop();
  });

  // 상점 구매
  $("#shop-grid").addEventListener("click", (e) => {
    const it = e.target.closest(".shop-item"); if (!it) return;
    const price = +it.dataset.price;
    if (state.coin < price) { toast("코인이 부족해요"); return; }
    state.coin -= price;
    renderShop(); renderHome();
    toast(`${it.dataset.name} 구매! 🪙 -${price}`);
  });

  // 환생
  $("#btn-rebirth").addEventListener("click", () => {
    if (state.level < 50) return;
    state.level = 1; state.xp = 0; state.rebirth += 1;
    renderHome(); renderStorage();
    toast(`🌟 환생 완료! 표식 +1 (총 ${state.rebirth}회) · 코인/아이템 유지`);
  });

  // 스위치
  $$("[data-toggle]").forEach((sw) => sw.addEventListener("click", () => sw.classList.toggle("on")));
}

// ===== 초기화 =====
renderHome();
renderQuests();
renderShop();
renderStorage();
bind();
go("home");
