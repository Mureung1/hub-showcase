// 홈택스 AI 가이드 콘텐츠 스크립트.
// 고정된 스텝 시퀀스 대신, 매 턴마다 "지금 화면에 보이는 클릭 가능한 요소 목록"을 LLM에게 보내
// "다음에 뭘 눌러야 하는지" 동적으로 판단받는다.
// 이 스크립트는 어떤 요소도 대신 클릭하지 않는다 — 하이라이트만 하고, 실제 클릭은 항상 사용자가 한다.

const CLICKABLE_SELECTOR = 'button, a, [role="button"], [role="tab"], span, div, td, li, label';
// WebSquare의 "전체메뉴" 팝업은 이 클래스를 가진 컨테이너로 뜬다(실측 확인, tax-agent-research.md §1-6와 동일 계열).
// 팝업이 열려 있으면 그 안에서만 찾아서, 헤더의 숨은 미리보기 메뉴 등 팝업 바깥의 동일 텍스트에 걸리지 않게 한다.
const POPUP_SELECTOR = '.w2popup_window';
const MAX_TURNS = 12;

function getSearchRoot() {
  const popups = Array.from(document.querySelectorAll(POPUP_SELECTOR)).filter((popup) => {
    const rect = popup.getBoundingClientRect();
    const style = getComputedStyle(popup);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  return popups.length > 0 ? popups[popups.length - 1] : document;
}

// 화면 구조가 바뀌어도(홈 화면/팝업/다른 메뉴 등) 하드코딩된 가정 없이 "지금 실제로 뭐가 있는지" 훑는다.
// 메인 문서/팝업 하나 + 같은 출처(same-origin)이고 실제로 렌더링된 iframe 전부를 컨텍스트로 모은다.
// (실측 확인: txppIframe처럼 항상 about:blank인 빈 iframe은 body가 비어있거나 크기가 0이라 자동으로 제외됨 — 이름을 몰라도 됨.)
function getRootContexts() {
  const contexts = [
    {
      root: getSearchRoot(),
      elementFromPointDoc: document,
      offsetX: 0,
      offsetY: 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    },
  ];

  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    let doc;
    try {
      doc = iframe.contentDocument;
    } catch {
      continue; // cross-origin iframe — 접근 불가, 건너뜀
    }
    if (!doc || !doc.body || doc.body.children.length === 0) continue;

    const iframeRect = iframe.getBoundingClientRect();
    if (iframeRect.width === 0 || iframeRect.height === 0) continue;

    contexts.push({
      root: doc,
      elementFromPointDoc: doc,
      offsetX: iframeRect.left,
      offsetY: iframeRect.top,
      viewportWidth: iframe.contentWindow ? iframe.contentWindow.innerWidth : iframeRect.width,
      viewportHeight: iframe.contentWindow ? iframe.contentWindow.innerHeight : iframeRect.height,
    });
  }
  return contexts;
}

let running = false;
let shadowHost = null;
let shadowRoot = null;
let highlightBox = null;
let labelBubble = null;
let panel = null;
let currentTargetEl = null;
let rafId = null;
let elementRegistry = [];

// --- 1. 화면 요소 직렬화 (LLM에게 "지금 뭘 누를 수 있는지" 알려주는 목록 생성) ---

function isLeafLike(el) {
  if (el.children.length === 0) return true;
  const ownText = (el.textContent || '').trim();
  const childrenWithText = Array.from(el.children).filter((child) => (child.textContent || '').trim().length > 0);
  // 자식 중 하나가 이 요소와 완전히 동일한 텍스트를 갖고 있다면, 그 자식이 진짜 본체이고 el은 감싸는 wrapper일 뿐이다.
  if (childrenWithText.some((child) => child.textContent.trim() === ownText)) return false;
  // 자식 여러 개가 각자 자기 글자를 갖고 있으면(예: "130%/120%/..." 배율 목록처럼 여러 항목을 감싼 목록),
  // el은 leaf가 아니라 그 항목들을 하나로 뭉친 컨테이너다 — 실측 확인: 이걸 걸러내지 않으면
  // "화면크기130%120%110%..." 같이 여러 항목이 뒤섞인 라벨이 생긴다.
  if (childrenWithText.length >= 2) return false;
  return true;
}

const MAX_ELEMENTS = 120;
const MAX_GOAL_PRIORITY = 40;

// goal을 2글자 조각(2-gram)으로 쪼갠다 — "세금계산서 발행" → 세금/금계/계산/산서/발행…
// 조각 하나라도 요소 텍스트에 들어 있으면 "목표 관련" 요소로 본다. 과하게 잡혀도
// 목록에 몇 개 더 들어갈 뿐이라 안전한 방향의 오차다.
function goalBigrams(goal) {
  const compact = (goal || '').replace(/\s+/g, '');
  const grams = new Set();
  for (let i = 0; i + 1 < compact.length; i++) grams.add(compact.slice(i, i + 2));
  return grams;
}

function serializeInteractiveElements(goal) {
  const contexts = getRootContexts();
  const seen = new Set();
  const passed = [];
  elementRegistry = [];

  for (const context of contexts) {
    const candidates = context.root.querySelectorAll(CLICKABLE_SELECTOR);

    for (const el of candidates) {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 60) continue;
      if (!isLeafLike(el)) continue;

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible =
        rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      if (!visible) continue;

      const localCx = rect.left + rect.width / 2;
      const localCy = rect.top + rect.height / 2;
      const globalCx = context.offsetX + localCx;
      const globalCy = context.offsetY + localCy;

      const inViewport =
        localCx >= 0 && localCy >= 0 && localCx <= context.viewportWidth && localCy <= context.viewportHeight;

      if (inViewport) {
        // 홈택스는 겹친 팝업/즐겨찾기 패널 뒤에 동일 텍스트 요소가 숨어있는 경우가 있다(§1-6 occlusion 이슈).
        // 실제로 해당 좌표에서 맨 위에 있는 요소인지 반드시 확인한다.
        const topEl = context.elementFromPointDoc.elementFromPoint(localCx, localCy);
        if (!(topEl && (el.contains(topEl) || topEl.contains(el)))) continue;
      }
      // 화면 밖(스크롤해야 보이는 영역)이면 elementFromPoint가 의미가 없으므로 occlusion 체크를 건너뛰고,
      // CSS 가시성만으로 후보에 포함한다 — 실측 확인: 홈 화면 하나에서만 전체 후보의 절반 가까이가
      // 화면 밖에 있어서, 이걸 빼면 AI가 "스크롤하면 있는" 버튼을 아예 모르게 된다.

      const key = `${text}|${Math.round(globalCy)}|${Math.round(globalCx)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      passed.push({
        el,
        text,
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        offscreen: !inViewport,
        seq: passed.length,
      });
    }
  }

  // 예전에는 DOM 순서로 120개에서 조기 중단해서, 메뉴가 많은 화면에서는 정작 목표와 관련된
  // 항목이 목록에 못 들어가는 문제가 있었다(Step 15). 이제 통과 후보를 전부 모은 뒤
  // 목표 관련 요소를 먼저 확보하고, 남은 자리를 DOM 순서로 채운다.
  const grams = goalBigrams(goal);
  const isRelevant = (item) => {
    for (const g of grams) if (item.text.includes(g)) return true;
    return false;
  };
  const priority = [];
  const rest = [];
  for (const item of passed) {
    if (priority.length < MAX_GOAL_PRIORITY && isRelevant(item)) priority.push(item);
    else rest.push(item);
  }
  const selected = priority.concat(rest).slice(0, MAX_ELEMENTS);
  selected.sort((a, b) => a.seq - b.seq); // AI에게 보여줄 목록은 화면(DOM) 순서를 유지

  return selected.map((item) => {
    const index = elementRegistry.length;
    elementRegistry.push(item.el);
    return { index, text: item.text, role: item.role, offscreen: item.offscreen };
  });
}

function getResultRowCount() {
  const rows = Array.from(document.querySelectorAll('table tbody tr'));
  return rows.filter((row) => row.querySelectorAll('td').length > 1).length;
}

function waitForRealClick(el) {
  return new Promise((resolve) => {
    el.addEventListener(
      'click',
      function onClick() {
        el.removeEventListener('click', onClick, true);
        resolve();
      },
      { capture: true, once: true }
    );
  });
}

// WebSquare는 클릭 후에도 한참 더 렌더링되므로, 고정 시간 대기 대신 "DOM 변이가 quietMs 동안
// 잠잠해질 때까지" 기다린다 — 빠른 화면은 빨리 넘어가고, 느린 화면은 다 그려질 때까지 기다려서
// 매 턴 AI에게 가는 화면 목록이 '완성된 화면' 기준으로 일정해진다.
// maxWaitMs는 시계처럼 끝없이 변하는 요소 때문에 영원히 잠잠해지지 않는 경우의 안전장치.
function waitForScreenSettle({ quietMs = 600, maxWaitMs = 5000 } = {}) {
  return new Promise((resolve) => {
    let quietTimer = null;
    const observer = new MutationObserver(restartQuietTimer);
    const maxTimer = setTimeout(finish, maxWaitMs);

    function finish() {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    }
    function restartQuietTimer() {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quietMs);
    }

    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    restartQuietTimer();
  });
}

function askLlmForNextStep(goal, elements, history, { screenChanged, newElementTexts } = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'NEXT_STEP',
        goal,
        currentUrl: location.href,
        resultRowCount: getResultRowCount(),
        elements,
        history,
        screenChanged,
        newElementTexts,
      },
      (response) => resolve(response)
    );
  });
}

// --- 2. 오버레이 렌더링 (Shadow DOM — 홈택스 자체 CSS와 충돌 방지) ---

function ensureOverlayRoot() {
  if (shadowHost) return;

  shadowHost = document.createElement('div');
  shadowHost.id = '__hometax_guide_overlay_host__';
  shadowHost.style.all = 'initial';
  document.documentElement.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .box {
      position: fixed;
      border: 3px solid #4FC3E8;
      border-radius: 8px;
      box-shadow: 0 0 0 4px rgba(79,195,232,0.25), 0 0 16px rgba(79,195,232,0.6);
      pointer-events: none;
      z-index: 2147483000;
    }
    .label {
      position: fixed;
      background: #0A0D22;
      color: #FFFFFF;
      border: 1px solid #4FC3E8;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-family: "Poppins", "Pretendard", sans-serif;
      pointer-events: none;
      z-index: 2147483001;
      white-space: nowrap;
    }
    .panel {
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 320px;
      max-height: 260px;
      overflow-y: auto;
      background: linear-gradient(160deg, #2E3A7A, #141A3A 100%);
      color: #9AA5C4;
      border-radius: 16px;
      padding: 16px 18px;
      font-family: "Poppins", "Pretendard", sans-serif;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 2147483002;
    }
    .panel h4 { margin: 0 0 8px; color: #FFFFFF; font-size: 15px; }
    .panel .accent { color: #4FC3E8; }
  `;
  shadowRoot.appendChild(style);

  highlightBox = document.createElement('div');
  highlightBox.className = 'box';
  highlightBox.style.display = 'none';
  shadowRoot.appendChild(highlightBox);

  labelBubble = document.createElement('div');
  labelBubble.className = 'label';
  labelBubble.style.display = 'none';
  shadowRoot.appendChild(labelBubble);

  panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.display = 'none';
  shadowRoot.appendChild(panel);
}

function updatePosition() {
  if (!currentTargetEl) return;
  const rect = currentTargetEl.getBoundingClientRect();
  highlightBox.style.left = `${rect.left - 4}px`;
  highlightBox.style.top = `${rect.top - 4}px`;
  highlightBox.style.width = `${rect.width + 8}px`;
  highlightBox.style.height = `${rect.height + 8}px`;
  labelBubble.style.left = `${rect.left}px`;
  labelBubble.style.top = `${Math.max(rect.top - 36, 4)}px`;
}

function loopPosition() {
  updatePosition();
  rafId = requestAnimationFrame(loopPosition);
}

function highlightElement(el, label) {
  currentTargetEl = el;
  labelBubble.textContent = label;

  // 대상이 지금 화면 밖(스크롤해야 보이는 곳)에 있으면 먼저 스크롤해서 보이게 한다.
  // 이후 loopPosition()이 매 프레임 getBoundingClientRect()를 다시 재서 스크롤 애니메이션을 따라간다.
  const rect = el.getBoundingClientRect();
  const needsScroll = rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth;
  if (needsScroll) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }

  highlightBox.style.display = 'block';
  labelBubble.style.display = 'block';
  if (!rafId) loopPosition();
}

function clearHighlight() {
  currentTargetEl = null;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (highlightBox) highlightBox.style.display = 'none';
  if (labelBubble) labelBubble.style.display = 'none';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showPanelMessage(text) {
  ensureOverlayRoot();
  panel.innerHTML = `<h4><span class="accent">홈택스 AI 가이드</span></h4><div>${escapeHtml(text)}</div>`;
  panel.style.display = 'block';
}

// --- 3. 동적 가이드 루프 ---

async function startDynamicGuide(goal) {
  if (running) return;
  running = true;
  ensureOverlayRoot();
  clearHighlight();

  const history = [];
  let finished = false;
  let prevTextSet = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    showPanelMessage('다음 단계를 생각하는 중이에요...');

    const elements = serializeInteractiveElements(goal);

    // 직전 턴과 화면 목록을 비교해 "클릭이 실제로 효과가 있었는지"를 계산한다 —
    // 이 신호가 없으면 AI는 같은 화면에서 맴돌아도 알아챌 방법이 없다.
    const textSet = new Set(elements.map((e) => e.text));
    let screenChanged = null; // 첫 턴은 비교 대상이 없음
    let newElementTexts = [];
    if (prevTextSet) {
      newElementTexts = [...textSet].filter((t) => !prevTextSet.has(t)).slice(0, 10);
      const removedCount = [...prevTextSet].filter((t) => !textSet.has(t)).length;
      screenChanged = newElementTexts.length > 0 || removedCount > 0;
      if (history.length > 0) history[history.length - 1].screenChanged = screenChanged;
      // ↑ 직전에 클릭한 항목에 "그 클릭으로 화면이 바뀌었는지"를 뒤늦게 채워 넣는다
    }
    prevTextSet = textSet;

    const response = await askLlmForNextStep(goal, elements, history, { screenChanged, newElementTexts });

    if (!response || !response.ok) {
      showPanelMessage('AI 서버에 연결할 수 없어요. 프록시 서버(localhost:4000)가 켜져 있는지 확인해주세요.');
      finished = true;
      break;
    }

    const { index, label, done, message } = response.data || {};

    if (done) {
      clearHighlight();
      showPanelMessage(message || '완료됐습니다.');
      finished = true;
      break;
    }

    const target = typeof index === 'number' ? elementRegistry[index] : null;
    if (!target) {
      clearHighlight();
      showPanelMessage(message || '더 이상 클릭할 요소를 찾지 못했어요. 여기서 안내를 마칠게요.');
      finished = true;
      break;
    }

    highlightElement(target, label || '이 버튼을 클릭하세요');
    panel.style.display = 'none';

    await waitForRealClick(target);
    clearHighlight();
    history.push({ label: label || target.textContent.trim(), screenChanged: null });
    // ↑ screenChanged는 아직 모름(null) — 다음 턴 직렬화 시점에 화면을 비교해서 채운다

    // 고정 1.2초 대기 대신, 화면 렌더링이 실제로 끝날 때까지 기다린다.
    await waitForScreenSettle();
  }

  // for 루프가 break 없이 MAX_TURNS를 다 채우고 끝난 경우에도 반드시 뭔가 보여준다 —
  // 그렇지 않으면 하이라이트만 조용히 사라지고 사용자에게 아무 안내도 안 남는다.
  if (!finished) {
    clearHighlight();
    showPanelMessage('안내 가능한 단계 수(12단계)를 다 사용했어요. 화면을 확인해보시고, 필요하면 가이드를 다시 시작해주세요.');
  }

  running = false;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'START_GUIDE') {
    if (!message.goal) {
      showPanelMessage('먼저 팝업에서 하고 싶은 일을 입력해주세요.');
      return;
    }
    startDynamicGuide(message.goal);
  }
});
