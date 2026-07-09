// AI 논문 브리핑 — S1 프로토타입 (목 데이터 기반)
// 파이프라인 연동 전: data/YYYY-MM-DD.json 을 읽어 렌더링한다.

const DATA_URL = "../data/2026-07-09.json";
const BOOKMARK_KEY = "briefing.bookmarks";
const IMPORTANCE_RANK = { high: 3, medium: 2, low: 1 };

// "2026-07-09" → "2026년 7월 9일"
function formatDate(iso) {
  const [y, m, d] = String(iso).split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

const state = {
  data: null,          // { date, count, papers[] }
  view: "feed",        // "feed" | "detail" | "saved"
  activeTag: "전체",    // 피드 카테고리 필터
  currentId: null,     // 상세 뷰 대상 논문 id
  abstractOpen: false, // 상세 뷰 원문 초록 토글
};

const app = document.getElementById("app");

/* ── 북마크 (F4, localStorage) ─────────────────────── */
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || []; }
  catch { return []; }
}
function isBookmarked(id) { return getBookmarks().includes(id); }
function toggleBookmark(id) {
  const marks = getBookmarks();
  const next = marks.includes(id) ? marks.filter((x) => x !== id) : [...marks, id];
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
  updateSavedCount();
}
function updateSavedCount() {
  const el = document.getElementById("nav-saved-count");
  if (el) el.textContent = getBookmarks().length;
}

/* ── 유틸 ───────────────────────────────────────────── */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function paperById(id) { return state.data.papers.find((p) => p.id === id); }

// 카테고리 탭 = 각 논문의 대표 태그(tags[0]) 집합
function categories() {
  const set = new Set();
  state.data.papers.forEach((p) => set.add(p.tags[0]));
  return ["전체", ...set];
}

function sortByImportance(papers) {
  return [...papers].sort(
    (a, b) => (IMPORTANCE_RANK[b.importance] || 0) - (IMPORTANCE_RANK[a.importance] || 0)
  );
}

/* ── 카드 (F2) ─────────────────────────────────────── */
function cardHTML(p) {
  const marked = isBookmarked(p.id);
  const isHigh = p.importance === "high";
  const tags = p.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("");
  return `
    <article class="card" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.title_ko)}">
      <div class="toprow">
        <span class="dot ${isHigh ? "high" : ""}"></span>
        ${isHigh ? `<span class="imp-lbl">중요</span>` : ""}
        <button class="bk ${marked ? "on" : ""}" data-bk="${esc(p.id)}" type="button"
          aria-pressed="${marked}" title="저장">🔖</button>
      </div>
      <div class="ttl">${esc(p.title_en)}</div>
      <div class="ko">${esc(p.one_liner)}</div>
      <div class="tags">${tags}</div>
    </article>`;
}

/* ── F1 피드 뷰 ────────────────────────────────────── */
function renderFeed() {
  const { data } = state;
  const tabs = categories()
    .map((t) => `<button class="tab ${t === state.activeTag ? "on" : ""}" data-tab="${esc(t)}" type="button">${esc(t)}</button>`)
    .join("");

  const filtered = state.activeTag === "전체"
    ? data.papers
    : data.papers.filter((p) => p.tags[0] === state.activeTag);
  const cards = sortByImportance(filtered).map(cardHTML).join("");

  app.innerHTML = `
    <section>
      <div class="feed-head">
        <p class="date-lbl">${esc(formatDate(data.date))}</p>
        <h1 class="title">오늘의 브리핑</h1>
        <p class="subcopy">오늘 <strong>${data.count}</strong>편의 새 논문을 정리했어요</p>
      </div>
      <div class="tabs">${tabs}</div>
      <div class="cards">${cards || `<p class="empty">이 카테고리에 논문이 없습니다.</p>`}</div>
    </section>`;
}

/* ── F3 상세 뷰 ────────────────────────────────────── */
function renderDetail() {
  const p = paperById(state.currentId);
  if (!p) { state.view = "feed"; return render(); }
  const marked = isBookmarked(p.id);
  const s = p.summary;
  const sec = (label, text) =>
    `<div class="sec"><span class="sec-lbl">${label}</span><p>${esc(text)}</p></div>`;

  app.innerHTML = `
    <section class="detail-wrap">
      <button class="back" type="button" data-back>← 오늘의 브리핑</button>
      <h1 class="d-title">${esc(p.title_en)}</h1>
      <p class="d-title-ko">${esc(p.title_ko)}</p>
      <div class="meta">
        <span>${esc(p.authors)}</span><span>·</span><span>${esc(p.published)}</span>
        <span>·</span><span>${p.tags.map((t) => "#" + esc(t)).join(" ")}</span>
      </div>
      ${sec("핵심 기여", s.contribution)}
      ${sec("방법", s.method)}
      ${sec("결과", s.result)}
      ${sec("배경 · 맥락", s.background)}
      <button class="toggle" type="button" data-toggle>
        <span>${state.abstractOpen ? "▾ 원문 초록 (English) 접기" : "▸ 원문 초록 (English) 펼치기"}</span><span>↔</span>
      </button>
      <div class="abstract" ${state.abstractOpen ? "" : "hidden"}>${esc(p.abstract)}</div>
      <div class="actionbar">
        <a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">↗ arXiv 원문</a>
        <button class="btn primary" type="button" data-bk="${esc(p.id)}" aria-pressed="${marked}">
          ${marked ? "🔖 저장됨" : "🔖 저장"}
        </button>
      </div>
    </section>`;
}

/* ── F4 저장 목록 뷰 ───────────────────────────────── */
function renderSaved() {
  const marks = getBookmarks();
  const saved = state.data.papers.filter((p) => marks.includes(p.id));
  const cards = saved.length
    ? sortByImportance(saved).map(cardHTML).join("")
    : `<p class="empty">저장한 논문이 없습니다. 카드의 🔖 를 눌러 저장해 보세요.</p>`;
  app.innerHTML = `
    <section>
      <div class="feed-head">
        <h1 class="title">🔖 저장한 논문</h1>
        <p class="subcopy"><strong>${saved.length}</strong>편</p>
      </div>
      <div class="cards">${cards}</div>
    </section>`;
}

/* ── 라우팅/렌더 ───────────────────────────────────── */
function render() {
  document.querySelectorAll(".navbtn").forEach((b) =>
    b.classList.toggle("on", b.dataset.view === (state.view === "detail" ? "feed" : state.view)));
  if (state.view === "detail") renderDetail();
  else if (state.view === "saved") renderSaved();
  else renderFeed();
  updateSavedCount();
}

function openDetail(id) {
  state.currentId = id;
  state.abstractOpen = false;
  state.view = "detail";
  window.scrollTo(0, 0);
  render();
}

/* ── 이벤트 위임 ───────────────────────────────────── */
app.addEventListener("click", (e) => {
  const bk = e.target.closest("[data-bk]");
  if (bk) { e.stopPropagation(); toggleBookmark(bk.dataset.bk); render(); return; }

  const tab = e.target.closest("[data-tab]");
  if (tab) { state.activeTag = tab.dataset.tab; render(); return; }

  if (e.target.closest("[data-back]")) { state.view = "feed"; render(); return; }
  if (e.target.closest("[data-toggle]")) { state.abstractOpen = !state.abstractOpen; renderDetail(); return; }

  const card = e.target.closest(".card");
  if (card) openDetail(card.dataset.id);
});

app.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
    e.preventDefault();
    openDetail(e.target.dataset.id);
  }
});

document.querySelector(".nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".navbtn");
  if (!btn) return;
  state.view = btn.dataset.view;
  render();
});

/* ── 부트스트랩 ───────────────────────────────────── */
fetch(DATA_URL)
  .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then((data) => { state.data = data; render(); })
  .catch((err) => {
    app.innerHTML = `<p class="error">데이터를 불러오지 못했습니다: ${esc(err.message)}<br>
      로컬에서는 저장소 루트에서 <code>python3 -m http.server</code> 로 서빙 후 <code>/web/</code> 로 접속하세요.</p>`;
  });
