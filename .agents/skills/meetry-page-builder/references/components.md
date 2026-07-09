# meetry 반응형 컴포넌트 스니펫 레퍼런스

`docs/design.md` 및 `docs/community.html`에 완벽하게 구축된 반응형 웹/앱 하이브리드 컴포넌트 조립식 마크업 모음.

---

## Section 1: Responsive App Header

- **HTML:**
```html
<header class="app-header">
  <div class="app-header__title logo" onclick="navigateToTab('screen-glist')" style="cursor:pointer;">meetry</div>
  
  <!-- 데스크톱 전용 상단 탭 내비게이션 -->
  <nav class="web-nav" aria-label="데스크톱 네비게이션">
    <span class="web-nav__item active" data-target="screen-glist" id="web-nav-glist">글목록</span>
    <span class="web-nav__item" data-target="screen-talk" id="web-nav-talk">
      대화
      <span id="web-talk-badge" style="background: var(--color-primary-cta); color: white; border-radius: 10px; font-size: 9px; padding: 2px 6px; margin-left: 6px; display: none;">0</span>
    </span>
    <span class="web-nav__item" data-target="screen-profile" id="web-nav-profile">프로필</span>
  </nav>

  <div class="app-header__actions">
    <!-- 모바일 기기 대응 글쓰기 버튼 -->
    <button class="icon-btn" aria-label="글쓰기" onclick="openCreateModal()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
    <button class="icon-btn" aria-label="알림" onclick="showToastMessage('알림 기능은 준비 중입니다.')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="badge-dot"></span>
    </button>
  </div>
</header>
```

- **CSS:**
```css
.app-header {
  position: fixed;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 100%; height: var(--header-height);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; z-index: 100;
  border-bottom: 1px solid var(--color-divider);
}
@media (max-width: 767px) {
  .app-header { max-width: var(--max-width-mobile); }
}
@media (min-width: 768px) {
  .app-header {
    max-width: var(--max-width-web);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: 0 40px;
  }
}
.app-header__title.logo {
  font-family: var(--font-family-en);
  color: var(--color-primary-cta);
  font-size: 24px;
  font-weight: 700;
}
```

---

## Section 2: Filter Toggle Panel (접이식 태그 필터)

- **HTML:**
```html
<div class="search-box">
  <div class="search-input-wrapper">
    <span class="search-icon-inside">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    </span>
    <input type="text" id="search-input" class="search-input" placeholder="관심 학과, 키워드 검색...">
  </div>
  
  <button class="toggle-filter-btn active" id="btn-toggle-filter" aria-label="필터 접기">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
    <span>필터 접기</span>
  </button>
</div>

<!-- Tag Filters Container -->
<div class="tag-filter-container" id="tag-filter-panel">
  <div class="tag-row" id="grade-row">
    <span class="filter-label">학년</span>
    <button class="filter-chip" data-tag="1학년">#1학년</button>
    <button class="filter-chip" data-tag="2학년">#2학년</button>
  </div>
  <!-- 생략 (전공, 주제 동일 구조) -->
</div>
```

- **CSS & JS:**
```css
.tag-filter-container {
  padding: 4px 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px dashed var(--color-divider);
  overflow: hidden;
  max-height: 500px;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s, border 0.3s;
}
.tag-filter-container.hidden {
  max-height: 0; padding-top: 0; padding-bottom: 0;
  border-top-color: transparent;
}
```
```javascript
const toggleFilterBtn = document.getElementById('btn-toggle-filter');
const filterPanel = document.getElementById('tag-filter-panel');
toggleFilterBtn.addEventListener('click', () => {
  const isHidden = filterPanel.classList.toggle('hidden');
  toggleFilterBtn.querySelector('span').textContent = isHidden ? '필터 열기' : '필터 접기';
  toggleFilterBtn.classList.toggle('active', !isHidden);
});
```

---

## Section 3: 2-Column Glist Layout (웹 전용 레이아웃)

- **HTML:**
```html
<div class="glist-layout">
  <!-- 왼쪽: 피드 리스트 컬럼 (70%) -->
  <div class="feed-column">
    <div class="feed-list" id="feed-list"></div>
  </div>

  <!-- 오른쪽: 웹 전용 사이드바 (30%) -->
  <div class="sidebar-column">
    <div class="sidebar-widget">
      <!-- 프로필 정보 및 작성글/대화 통계 카드 -->
    </div>
  </div>
</div>
```

- **CSS:**
```css
.glist-layout { display: flex; flex-direction: column; width: 100%; }
@media (min-width: 768px) {
  .glist-layout { flex-direction: row; gap: 24px; align-items: flex-start; }
  .feed-column {
    background: #FFFFFF; border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm); overflow: hidden;
    border: 1px solid var(--color-divider);
  }
  .sidebar-column {
    display: flex; width: 320px; flex-shrink: 0;
    flex-direction: column; gap: 20px;
    position: sticky; top: calc(var(--header-height) + 20px);
  }
}
```

---

## Section 4: 1:1 채팅방 및 봇 답변 시뮬레이션

- **JS 실시간 렌더링 및 봇 피드백 로직:**
```javascript
function sendChatMessage() {
  const text = document.getElementById('chat-input-text').value.trim();
  if (!text) return;

  const newMsg = {
    id: 'm_' + Date.now(),
    senderId: currentUser.id,
    text: text,
    timestamp: Date.now(),
    read: true
  };
  
  activeChat.messages.push(newMsg);
  renderChatBubbles(activeChat);

  // 상대방 봇 자동 피드백 시뮬레이션 (1.5초 딜레이)
  setTimeout(() => {
    const botAnswers = [
      "네 선배님! 그럼 그때 뵙겠습니다. 감사해요!",
      "우와 정말요? 알려주신 전공 꿀팁들 너무나 유용할 것 같아요.",
      "시간대 말씀해주시면 제가 조율해서 장소 잡을게요!"
    ];
    const randomAnswer = botAnswers[Math.floor(Math.random() * botAnswers.length)];
    activeChat.messages.push({
      id: 'm_bot_' + Date.now(),
      senderId: activeChat.otherUser.id,
      text: randomAnswer,
      timestamp: Date.now(),
      read: true
    });
    renderChatBubbles(activeChat);
  }, 1500);
}
```

---

## Section 5: Responsive Dialog Modals (하이브리드 모달 팝업)

- **CSS (데스크톱에서 플로팅 다이얼로그로 변형):**
```css
.modal-view {
  position: fixed;
  top: 0; left: 50%; transform: translate(-50%, 100%);
  width: 100%; max-width: var(--max-width-mobile); height: 100%;
  background: white; z-index: 300;
  transition: transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94);
  display: flex; flex-direction: column;
}
.modal-view.active { transform: translate(-50%, 0); }

@media (min-width: 768px) {
  .modal-view {
    max-width: 600px; height: 85vh;
    top: 50%; transform: translate(-50%, 100%);
    border-radius: var(--radius-lg);
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  }
  .modal-view.active { transform: translate(-50%, -50%); }
}
```
- **HTML 구조:**
```html
<!-- 암전 처리 백드롭 -->
<div id="modal-backdrop" class="modal-backdrop" onclick="closeAllModals()"></div>

<!-- 모달 뷰 -->
<div id="modal-post-detail" class="modal-view">
  <!-- header / body / footer -->
</div>
```
