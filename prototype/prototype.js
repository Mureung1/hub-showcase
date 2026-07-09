const STORAGE_KEY = 'saisai_prototype11_state_v1';

const iconByTab = {
  board: 'chat_bubble_outline',
  help: 'volunteer_activism',
  groupbuy: 'local_mall',
  mypage: 'person_outline',
};

const tabLabel = {
  board: '자유게시판',
  help: '도와주세요',
  groupbuy: '공동구매',
  mypage: '마이페이지',
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatWon(value) {
  return `${Math.ceil(Number(value) || 0).toLocaleString('ko-KR')}원`;
}

function initials(name) {
  const text = String(name || '이웃').trim();
  return text.slice(0, 1);
}

function createComment(authorId, authorNickname, body) {
  return {
    id: makeId('comment'),
    authorId,
    authorNickname,
    body,
    createdAt: '방금 전',
  };
}

function createDefaultState() {
  return {
    version: 1,
    session: {
      completed: false,
      step: 'nickname',
      dwellingType: '',
      addressQuery: '',
      selectedCommunityId: '',
    },
    currentUser: {
      id: 'user-me',
      nickname: '',
    },
    currentCommunityId: '',
    activeTab: 'board',
    modal: null,
    users: [
      { id: 'u-minji', nickname: '민지' },
      { id: 'u-junho', nickname: '준호' },
      { id: 'u-seoyeon', nickname: '서연' },
      { id: 'u-haneul', nickname: '하늘' },
      { id: 'u-dabin', nickname: '다빈' },
    ],
    communities: [
      {
        id: 'community-neulbom',
        name: '늘봄오피스텔 A동',
        type: 'building',
        regionLabel: '낙성대역 근처',
        description: '같은 건물 주민 중심',
        memberCount: 46,
      },
      {
        id: 'community-haetsal',
        name: '햇살아파트 103동',
        type: 'building',
        regionLabel: '봉천로 12길',
        description: '같은 동과 가까운 단지 이웃',
        memberCount: 82,
      },
      {
        id: 'community-bongcheon-block',
        name: '봉천역 2번 출구 생활권',
        type: 'block',
        regionLabel: '봉천동 원룸 골목',
        description: '편의점과 골목을 함께 쓰는 이웃',
        memberCount: 58,
      },
      {
        id: 'community-cheongun-block',
        name: '청운대 후문 원룸 블록',
        type: 'block',
        regionLabel: '청운대 후문',
        description: '학교 뒤 원룸과 빌라 생활권',
        memberCount: 39,
      },
    ],
    posts: [
      {
        id: 'post-1',
        communityId: 'community-neulbom',
        authorId: 'u-minji',
        authorNickname: '민지',
        title: '분리수거장 박스 오늘은 좀 많아요',
        body: '택배 박스가 많이 쌓여 있어서 저녁에 버리실 분들은 접어서 가져가면 좋을 것 같아요.',
        createdAt: '12분 전',
        comments: [
          {
            id: 'comment-1',
            authorId: 'u-junho',
            authorNickname: '준호',
            body: '방금 내려갔다 왔는데 종이류 칸은 아직 여유 있어요.',
            createdAt: '8분 전',
          },
        ],
      },
      {
        id: 'post-2',
        communityId: 'community-neulbom',
        authorId: 'u-seoyeon',
        authorNickname: '서연',
        title: '근처에 늦게까지 하는 약국 있을까요?',
        body: '감기약을 사야 하는데 지금 문 연 곳 아시는 분 계실까요?',
        createdAt: '34분 전',
        comments: [
          {
            id: 'comment-2',
            authorId: 'u-haneul',
            authorNickname: '하늘',
            body: '역 앞 큰길 약국 10시까지 하는 걸로 봤어요.',
            createdAt: '30분 전',
          },
        ],
      },
      {
        id: 'post-3',
        communityId: 'community-bongcheon-block',
        authorId: 'u-dabin',
        authorNickname: '다빈',
        title: '골목 입구 편의점 택배 마감 빠르네요',
        body: '오늘은 6시쯤 갔는데 이미 마감이라고 하셨어요. 급한 분들은 역 쪽으로 가시는 게 나을 듯해요.',
        createdAt: '1시간 전',
        comments: [],
      },
    ],
    helps: [
      {
        id: 'help-1',
        communityId: 'community-neulbom',
        authorId: 'u-junho',
        authorNickname: '준호',
        title: '현관 센서등 교체 도와주실 분',
        body: '전구는 사뒀는데 의자가 낮아서 손이 안 닿아요. 오늘 저녁 잠깐만 부탁드려요.',
        status: 'open',
        createdAt: '5분 전',
        resolvedAt: '',
        comments: [
          {
            id: 'comment-3',
            authorId: 'u-minji',
            authorNickname: '민지',
            body: '저 8시쯤 가능해요. 사다리 작은 거 있어요.',
            createdAt: '3분 전',
          },
        ],
      },
      {
        id: 'help-2',
        communityId: 'community-neulbom',
        authorId: 'u-haneul',
        authorNickname: '하늘',
        title: '택배 대신 받아주셔서 감사합니다',
        body: '어제 급하게 부탁드렸는데 바로 도와주셔서 살았습니다.',
        status: 'resolved',
        createdAt: '어제',
        resolvedAt: '어제',
        comments: [
          {
            id: 'comment-4',
            authorId: 'u-seoyeon',
            authorNickname: '서연',
            body: '다음에도 시간 맞으면 맡아드릴게요.',
            createdAt: '어제',
          },
        ],
      },
      {
        id: 'help-3',
        communityId: 'community-bongcheon-block',
        authorId: 'u-seoyeon',
        authorNickname: '서연',
        title: '큰 캐리어 2층까지만 같이 들어주실 분',
        body: '엘리베이터 없는 빌라라 혼자 들기 애매해요. 사례로 커피 드릴게요.',
        status: 'open',
        createdAt: '18분 전',
        resolvedAt: '',
        comments: [],
      },
    ],
    groupBuys: [
      {
        id: 'buy-1',
        communityId: 'community-neulbom',
        hostId: 'u-minji',
        hostNickname: '민지',
        title: '생수 2L 12개 묶음',
        description: '편의점보다 저렴해서 같이 나누면 좋아요. 배송 오면 1층 로비에서 각자 가져가요.',
        icon: 'water_drop',
        totalAmount: 24000,
        goalCount: 4,
        deadlineAt: '오늘 22:00',
        pickupLocation: '1층 로비 택배 선반 앞',
        distributionNote: '도착하면 댓글로 시간 맞춰서 나눠요.',
        status: 'open',
        participantIds: ['u-minji', 'u-junho'],
        createdAt: '오늘',
      },
      {
        id: 'buy-2',
        communityId: 'community-neulbom',
        hostId: 'u-seoyeon',
        hostNickname: '서연',
        title: '대용량 세탁세제 3개입',
        description: '세제 3개 세트라 한 개씩 나누면 딱 맞아요. 향은 무난한 걸로 주문하려고 합니다.',
        icon: 'inventory_2',
        totalAmount: 36000,
        goalCount: 3,
        deadlineAt: '내일 12:00',
        pickupLocation: '공동현관 안쪽 우편함 앞',
        distributionNote: '입금은 별도로 확인하고, 물건은 저녁에 나눠요.',
        status: 'open',
        participantIds: ['u-seoyeon', 'u-haneul', 'u-dabin'],
        createdAt: '어제',
      },
      {
        id: 'buy-3',
        communityId: 'community-bongcheon-block',
        hostId: 'u-dabin',
        hostNickname: '다빈',
        title: '야식 떡볶이 세트',
        description: '배달비 나누려고 같이 주문합니다. 맵기는 보통으로 할게요.',
        icon: 'ramen_dining',
        totalAmount: 28000,
        goalCount: 4,
        deadlineAt: '오늘 21:30',
        pickupLocation: '골목 입구 CU 앞',
        distributionNote: '받자마자 나누고 각자 가져가요.',
        status: 'closed',
        participantIds: ['u-dabin', 'u-minji', 'u-junho', 'u-seoyeon'],
        createdAt: '오늘',
      },
    ],
  };
}

const app = {
  state: createDefaultState(),
  toastTimer: null,

  init() {
    this.state = this.loadState();
    this.render();
    this.bindEvents();
  },

  loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1 || !saved.session || !saved.communities) {
        return createDefaultState();
      }
      return saved;
    } catch {
      return createDefaultState();
    }
  },

  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  bindEvents() {
    document.addEventListener('click', (event) => {
      const actionTarget = event.target.closest('[data-action]');
      if (!actionTarget) return;
      const { action } = actionTarget.dataset;

      if (action === 'select-dwelling') this.selectDwelling(actionTarget.dataset.type);
      if (action === 'back-onboarding') this.backOnboarding();
      if (action === 'select-community') this.selectCommunity(actionTarget.dataset.id);
      if (action === 'enter-community') this.enterCommunity();
      if (action === 'switch-tab') this.switchTab(actionTarget.dataset.tab);
      if (action === 'open-post') this.openModal('post-detail', actionTarget.dataset.id);
      if (action === 'open-help') this.openModal('help-detail', actionTarget.dataset.id);
      if (action === 'open-buy') this.openModal('buy-detail', actionTarget.dataset.id);
      if (action === 'open-form') this.openModal(actionTarget.dataset.form);
      if (action === 'close-modal') this.closeModal();
      if (action === 'resolve-help') this.resolveHelp(actionTarget.dataset.id);
      if (action === 'join-buy') this.joinBuy(actionTarget.dataset.id);
      if (action === 'close-buy') this.closeBuy(actionTarget.dataset.id);
      if (action === 'reset-demo') this.resetDemo();
    });

    document.addEventListener('submit', (event) => {
      const form = event.target.closest('form[data-form]');
      if (!form) return;
      event.preventDefault();
      const formType = form.dataset.form;

      if (formType === 'nickname') this.submitNickname(form);
      if (formType === 'address') this.submitAddress(form);
      if (formType === 'create-post') this.createPost(form);
      if (formType === 'create-help') this.createHelp(form);
      if (formType === 'create-buy') this.createBuy(form);
      if (formType === 'post-comment') this.addPostComment(form);
      if (formType === 'help-comment') this.addHelpComment(form);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.state.modal) {
        this.closeModal();
      }
    });

    document.getElementById('modal-root').addEventListener('click', (event) => {
      if (event.target.classList.contains('modal-backdrop')) {
        this.closeModal();
      }
    });
  },

  render() {
    const root = document.getElementById('app');
    root.className = this.state.session.completed ? 'app-shell app-shell-main' : 'app-shell app-shell-onboarding';
    root.innerHTML = this.state.session.completed ? this.renderApp() : this.renderOnboarding();
    this.renderModal();
  },

  renderOnboarding() {
    const { step } = this.state.session;
    const stepIndex = ['nickname', 'dwelling', 'address', 'confirm'].indexOf(step);

    return `
      <section class="onboarding">
        <div class="onboarding-card">
          <div class="brand" style="margin-bottom: 22px;">
            <div class="brand-mark"><span class="material-icons">home</span></div>
            <div class="brand-copy">
              <strong>사이사이</strong>
              <span>같은 생활권 이웃</span>
            </div>
          </div>
          <div class="step-line" aria-label="진행 단계">
            ${[0, 1, 2, 3].map((index) => `<span class="step-dot ${index <= stepIndex ? 'active' : ''}"></span>`).join('')}
          </div>
          ${this.renderOnboardingStep()}
        </div>
      </section>
    `;
  },

  renderOnboardingStep() {
    if (this.state.session.step === 'nickname') {
      return `
        <h1 class="hero-title">오늘은 어떤 이름으로 들어갈까요?</h1>
        <p class="hero-sub">닉네임만 정하면 바로 시작할 수 있어요.</p>
        <form class="form-stack" data-form="nickname">
          <label>
            <span class="field-label">닉네임</span>
            <input class="input" name="nickname" value="${escapeHtml(this.state.currentUser.nickname)}" maxlength="12" placeholder="예: 민지" autocomplete="off" />
          </label>
          <button class="btn btn-primary btn-full" type="submit">다음</button>
        </form>
      `;
    }

    if (this.state.session.step === 'dwelling') {
      return `
        <h1 class="hero-title">사는 곳을 골라주세요</h1>
        <p class="hero-sub">선택한 주거 형태에 맞는 생활권을 먼저 보여드릴게요.</p>
        <div class="choice-grid">
          ${this.renderDwellingChoice('apartment', 'apartment', '아파트/오피스텔', '같은 건물이나 같은 동 이웃')}
          ${this.renderDwellingChoice('villa', 'holiday_village', '주택/빌라', '가까운 골목과 블록 이웃')}
        </div>
        <div class="button-row">
          <button class="btn btn-plain" type="button" data-action="back-onboarding">이전</button>
        </div>
      `;
    }

    if (this.state.session.step === 'address') {
      return `
        <h1 class="hero-title">주소나 건물명을 입력해주세요</h1>
        <p class="hero-sub">정확하지 않아도 괜찮아요. 어울리는 생활권을 보여드릴게요.</p>
        <form class="form-stack" data-form="address">
          <label>
            <span class="field-label">주소/건물명</span>
            <input class="input" name="addressQuery" value="${escapeHtml(this.state.session.addressQuery)}" placeholder="예: 늘봄오피스텔, 봉천동 12길" autocomplete="off" />
          </label>
          <button class="btn btn-primary btn-full" type="submit">검색</button>
        </form>
        <div class="community-results">
          ${this.renderCommunityResults()}
        </div>
        <div class="button-row">
          <button class="btn btn-plain" type="button" data-action="back-onboarding">이전</button>
        </div>
      `;
    }

    const community = this.getCommunity(this.state.session.selectedCommunityId);
    return `
      <h1 class="hero-title">${escapeHtml(community?.name || '커뮤니티')}에 들어갈게요</h1>
      <p class="hero-sub">${escapeHtml(community?.regionLabel || '')} · ${community?.type === 'building' ? '건물형' : '블록형'} 커뮤니티</p>
      <div class="card notice-card">
        ${escapeHtml(community?.description || '가까운 이웃들과 이야기할 수 있어요.')} · 이웃 ${community?.memberCount || 0}명
      </div>
      <div class="button-row">
        <button class="btn btn-plain" type="button" data-action="back-onboarding">다시 고르기</button>
        <button class="btn btn-primary" type="button" data-action="enter-community">입장하기</button>
      </div>
    `;
  },

  renderDwellingChoice(type, icon, title, body) {
    const selected = this.state.session.dwellingType === type ? 'selected' : '';
    return `
      <button class="choice-card ${selected}" type="button" data-action="select-dwelling" data-type="${type}">
        <span class="choice-icon"><span class="material-icons">${icon}</span></span>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(body)}</span>
      </button>
    `;
  },

  renderCommunityResults() {
    const results = this.getRecommendedCommunities();
    return results.map((community) => {
      const selected = this.state.session.selectedCommunityId === community.id ? 'selected' : '';
      const typeLabel = community.type === 'building' ? '건물형' : '블록형';
      return `
        <button class="result-card ${selected}" type="button" data-action="select-community" data-id="${escapeHtml(community.id)}">
          <span class="result-icon"><span class="material-icons">${community.type === 'building' ? 'apartment' : 'location_on'}</span></span>
          <span class="result-meta">
            <strong>${escapeHtml(community.name)}</strong>
            <span>${escapeHtml(community.regionLabel)} · ${typeLabel} · ${community.memberCount}명</span>
          </span>
          <span class="material-icons">chevron_right</span>
        </button>
      `;
    }).join('');
  },

  renderApp() {
    const community = this.getCurrentCommunity();
    return `
      <header class="topbar app-topbar">
        <div class="app-header-copy">
          <div class="community-title">
            <span class="location-pin" aria-hidden="true"></span>
            <strong class="community-main">${escapeHtml(community?.name || '커뮤니티')}</strong>
          </div>
        </div>
      </header>
      <main class="main-grid">
        ${this.renderActiveTab()}
      </main>
      ${this.renderBottomNav()}
      ${this.renderFab()}
    `;
  },

  renderActiveTab() {
    if (this.state.activeTab === 'board') return this.renderBoardTab();
    if (this.state.activeTab === 'help') return this.renderHelpTab();
    if (this.state.activeTab === 'groupbuy') return this.renderGroupBuyTab();
    return this.renderMyPageTab();
  },

  renderBoardTab() {
    const posts = this.getPosts();
    const featuredBuy = this.getGroupBuys().find((buy) => buy.status === 'open') || this.getGroupBuys()[0];
    return `
      ${featuredBuy ? this.renderBoardBanner(featuredBuy) : ''}
      <div class="section-head">
        <div>
          <h2>오늘의 동네생활</h2>
          <p>${escapeHtml(this.getCurrentCommunity()?.name || '')} 이웃 이야기</p>
        </div>
      </div>
      <div class="feed-list">
        ${posts.length ? posts.map((post) => this.renderPostCard(post)).join('') : this.renderEmpty('아직 올라온 글이 없어요.')}
      </div>
    `;
  },

  renderBoardBanner(buy) {
    return `
      <section class="card banner-card">
        <span class="badge primary">오늘 우리 동네 소식</span>
        <h2>${escapeHtml(buy.title)}</h2>
        <p>${buy.participantIds.length}명 참여 중 · 1인 예상 부담금 ${formatWon(this.getShareAmount(buy))}</p>
        <button class="btn btn-primary" type="button" data-action="open-buy" data-id="${escapeHtml(buy.id)}">참여 보기</button>
        <div class="banner-graphics" aria-hidden="true">
          <span class="shape shape-one"></span>
          <span class="shape shape-two"></span>
        </div>
      </section>
    `;
  },

  renderPostCard(post) {
    return `
      <button class="card post-card clickable-card" type="button" data-action="open-post" data-id="${escapeHtml(post.id)}">
        <div class="card-top">
          ${this.renderAuthor(post.authorNickname, post.createdAt)}
          <span class="badge primary">게시글</span>
        </div>
        <h3 class="card-title">${escapeHtml(post.title)}</h3>
        <p class="card-body">${escapeHtml(post.body)}</p>
        <div class="card-footer">
          <span class="footer-chip"><span class="material-icons">chat_bubble_outline</span>${post.comments.length}</span>
          <span class="footer-chip"><span class="material-icons">favorite_border</span>공감</span>
        </div>
      </button>
    `;
  },

  renderHelpTab() {
    const helps = this.getHelps();
    return `
      <div class="section-head">
        <div>
          <h2>도와주세요</h2>
          <p>작은 일도 가까운 이웃에게</p>
        </div>
      </div>
      <div class="feed-list">
        ${helps.length ? helps.map((help) => this.renderHelpCard(help)).join('') : this.renderEmpty('아직 도움 요청이 없어요.')}
      </div>
    `;
  },

  renderHelpCard(help) {
    const resolved = help.status === 'resolved';
    return `
      <article class="card help-card">
        <button class="clickable-card" type="button" data-action="open-help" data-id="${escapeHtml(help.id)}">
          <div class="card-top">
            ${this.renderAuthor(help.authorNickname, help.createdAt, resolved ? 'green' : 'amber')}
            <span class="badge ${resolved ? 'green' : 'amber'}">${resolved ? '완료' : '진행중'}</span>
          </div>
          <h3 class="card-title">${escapeHtml(help.title)}</h3>
          <p class="card-body">${escapeHtml(help.body)}</p>
          <div class="card-footer">
            <span class="footer-chip"><span class="material-icons">chat_bubble_outline</span>${help.comments.length}</span>
            <span class="footer-chip">${resolved ? '도움 완료' : '도움 기다리는 중'}</span>
          </div>
        </button>
        ${resolved ? '<div class="resolved-line"><span class="material-icons">check_circle</span>따뜻한 이웃의 도움으로 해결됐어요</div>' : ''}
        ${!resolved ? `<div class="button-row"><button class="btn btn-green" type="button" data-action="resolve-help" data-id="${escapeHtml(help.id)}">도움 완료</button></div>` : ''}
      </article>
    `;
  },

  renderGroupBuyTab() {
    const buys = this.getGroupBuys();
    return `
      <div class="section-head">
        <div>
          <h2>공동구매</h2>
          <p>같이 사고 각자 나눠요</p>
        </div>
      </div>
      <div class="feed-list">
        ${buys.length ? buys.map((buy) => this.renderBuyCard(buy)).join('') : this.renderEmpty('열린 공동구매가 없어요.')}
      </div>
    `;
  },

  renderBuyCard(buy) {
    const joined = buy.participantIds.length;
    const percent = Math.min(100, Math.round((joined / buy.goalCount) * 100));
    const share = this.getShareAmount(buy);
    const status = this.getBuyStatusLabel(buy);
    return `
      <button class="card buy-card clickable-card" type="button" data-action="open-buy" data-id="${escapeHtml(buy.id)}">
        <div class="buy-visual">
          <span class="product-mark ${buy.status === 'closed' ? 'green' : ''}">
            <span class="material-icons">${escapeHtml(buy.icon || 'local_mall')}</span>
          </span>
          <span class="badge ${buy.status === 'open' ? 'primary' : 'green'}">${escapeHtml(status)}</span>
        </div>
        <div>
          <h3 class="card-title">${escapeHtml(buy.title)}</h3>
          <p class="card-body">${escapeHtml(buy.deadlineAt)} 마감 · ${escapeHtml(buy.pickupLocation)}</p>
        </div>
        <div>
          <div class="progress-meta"><span>${joined}명 / ${buy.goalCount}명</span><span>${percent}%</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
        </div>
        <div class="price-row">
          <span>1인 예상 부담금</span>
          <strong>${formatWon(share)}</strong>
        </div>
      </button>
    `;
  },

  renderMyPageTab() {
    const myPosts = this.getPosts().filter((post) => post.authorId === this.state.currentUser.id);
    const myHelps = this.getHelps().filter((help) => help.authorId === this.state.currentUser.id);
    const myBuys = this.getGroupBuys().filter((buy) => buy.participantIds.includes(this.state.currentUser.id));

    return `
      <div class="section-head">
        <div>
          <h2>마이페이지</h2>
          <p>내가 남긴 활동</p>
        </div>
      </div>
      <div class="activity-grid">
        <section class="card activity-card profile-card">
          <div class="avatar">${escapeHtml(initials(this.state.currentUser.nickname))}</div>
          <div>
            <h3>${escapeHtml(this.state.currentUser.nickname)}</h3>
            <p>${escapeHtml(this.getCurrentCommunity()?.name || '')}</p>
          </div>
        </section>
        ${this.renderActivityGroup('내가 쓴 글', myPosts, (post) => `
          <button class="activity-item clickable-card" type="button" data-action="open-post" data-id="${escapeHtml(post.id)}">
            <span><strong>${escapeHtml(post.title)}</strong><span>${escapeHtml(post.createdAt)}</span></span>
            <span class="material-icons">chevron_right</span>
          </button>
        `)}
        ${this.renderActivityGroup('요청한 도움', myHelps, (help) => `
          <button class="activity-item clickable-card" type="button" data-action="open-help" data-id="${escapeHtml(help.id)}">
            <span><strong>${escapeHtml(help.title)}</strong><span>${help.status === 'resolved' ? '완료' : '진행중'}</span></span>
            <span class="material-icons">chevron_right</span>
          </button>
        `)}
        ${this.renderActivityGroup('참여한 공동구매', myBuys, (buy) => `
          <button class="activity-item clickable-card" type="button" data-action="open-buy" data-id="${escapeHtml(buy.id)}">
            <span><strong>${escapeHtml(buy.title)}</strong><span>${buy.hostId === this.state.currentUser.id ? '모집자' : '참여자'} · ${formatWon(this.getShareAmount(buy))}</span></span>
            <span class="material-icons">chevron_right</span>
          </button>
        `)}
        <button class="btn btn-plain btn-full" type="button" data-action="reset-demo">처음으로 돌아가기</button>
      </div>
    `;
  },

  renderActivityGroup(title, items, renderItem) {
    return `
      <section class="card activity-card">
        <div class="card-top">
          <h3 class="card-title" style="margin:0;">${escapeHtml(title)}</h3>
          <span class="badge primary">${items.length}</span>
        </div>
        ${items.length ? items.map(renderItem).join('') : '<div class="empty-state" style="box-shadow:none;">내역이 없습니다.</div>'}
      </section>
    `;
  },

  renderSideProfile() {
    const community = this.getCurrentCommunity();
    return `
      <section class="card activity-card profile-card">
        <div class="avatar">${escapeHtml(initials(this.state.currentUser.nickname))}</div>
        <div>
          <h3>${escapeHtml(this.state.currentUser.nickname)}</h3>
          <p>${escapeHtml(community?.regionLabel || '')}</p>
        </div>
      </section>
    `;
  },

  renderSideNotice() {
    return `
      <section class="card notice-card">
        공동구매 정산은 사이사이 밖에서 따로 진행해요. 이 화면에서는 모집, 참여, 분배 안내만 다룹니다.
      </section>
    `;
  },

  renderBottomNav() {
    return `
      <nav class="bottom-nav" aria-label="주요 탭">
        ${Object.keys(tabLabel).map((tab) => `
          <button class="nav-item ${this.state.activeTab === tab ? 'active' : ''}" type="button" data-action="switch-tab" data-tab="${tab}">
            <span class="material-icons">${iconByTab[tab]}</span>
            <span class="nav-label">${tabLabel[tab]}</span>
          </button>
        `).join('')}
      </nav>
    `;
  },

  renderFab() {
    if (this.state.activeTab === 'mypage') return '<button class="fab hidden" type="button" aria-hidden="true"></button>';
    const formByTab = {
      board: 'post-form',
      help: 'help-form',
      groupbuy: 'buy-form',
    };
    const labelByTab = {
      board: '게시글 작성',
      help: '도움 요청',
      groupbuy: '공동구매 모집',
    };
    return `
      <button class="fab" type="button" data-action="open-form" data-form="${formByTab[this.state.activeTab]}" aria-label="${labelByTab[this.state.activeTab]}">
        <span class="material-icons">add</span>
      </button>
    `;
  },

  renderAuthor(name, time, color = '') {
    return `
      <div class="author">
        <div class="avatar ${color}">${escapeHtml(initials(name))}</div>
        <div class="author-meta">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(time)} · ${escapeHtml(this.getCurrentCommunity()?.name || '')}</span>
        </div>
      </div>
    `;
  },

  renderEmpty(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  },

  renderModal() {
    const root = document.getElementById('modal-root');
    if (!this.state.modal) {
      root.innerHTML = '';
      return;
    }

    const { type, id } = this.state.modal;
    const modal = {
      'post-form': this.renderPostForm(),
      'help-form': this.renderHelpForm(),
      'buy-form': this.renderBuyForm(),
      'post-detail': this.renderPostDetail(id),
      'help-detail': this.renderHelpDetail(id),
      'buy-detail': this.renderBuyDetail(id),
    }[type];

    root.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal-card" role="dialog" aria-modal="true">
          ${modal || ''}
        </section>
      </div>
    `;
  },

  renderModalHeader(title) {
    return `
      <header class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="modal-close" type="button" data-action="close-modal" aria-label="닫기">
          <span class="material-icons">close</span>
        </button>
      </header>
    `;
  },

  renderPostForm() {
    return `
      ${this.renderModalHeader('글쓰기')}
      <div class="modal-body">
        <form class="form-stack" data-form="create-post">
          <label><span class="field-label">제목</span><input class="input" name="title" maxlength="40" placeholder="예: 3층 복도 전등 봐주세요" required /></label>
          <label><span class="field-label">내용</span><textarea class="textarea" name="body" maxlength="500" placeholder="이웃에게 전하고 싶은 말을 적어주세요." required></textarea></label>
          <button class="btn btn-primary btn-full" type="submit">올리기</button>
        </form>
      </div>
    `;
  },

  renderHelpForm() {
    return `
      ${this.renderModalHeader('도움 요청')}
      <div class="modal-body">
        <form class="form-stack" data-form="create-help">
          <label><span class="field-label">제목</span><input class="input" name="title" maxlength="40" placeholder="예: 택배 잠깐 받아주실 분" required /></label>
          <label><span class="field-label">상세 내용</span><textarea class="textarea" name="body" maxlength="500" placeholder="시간대와 상황을 적어주세요." required></textarea></label>
          <button class="btn btn-primary btn-full" type="submit">요청하기</button>
        </form>
      </div>
    `;
  },

  renderBuyForm() {
    return `
      ${this.renderModalHeader('모집 만들기')}
      <div class="modal-body">
        <form class="form-stack" data-form="create-buy">
          <label><span class="field-label">상품명</span><input class="input" name="title" maxlength="42" placeholder="예: 대용량 세탁세제 3개입" required /></label>
          <div class="info-grid">
            <label><span class="field-label">총 금액</span><input class="input" name="totalAmount" type="number" min="1000" step="100" placeholder="24000" required /></label>
            <label><span class="field-label">목표 인원</span><input class="input" name="goalCount" type="number" min="2" max="20" value="3" required /></label>
          </div>
          <label><span class="field-label">마감 시간</span><input class="input" name="deadlineAt" maxlength="24" placeholder="오늘 22:00" required /></label>
          <label><span class="field-label">분배 위치</span><input class="input" name="pickupLocation" maxlength="50" placeholder="1층 로비 택배 선반 앞" required /></label>
          <label><span class="field-label">분배 안내</span><input class="input" name="distributionNote" maxlength="80" placeholder="도착하면 댓글로 시간 맞춰요." required /></label>
          <label><span class="field-label">설명</span><textarea class="textarea" name="description" maxlength="500" placeholder="상품 정보와 나누는 방식을 적어주세요." required></textarea></label>
          <button class="btn btn-primary btn-full" type="submit">모집 시작</button>
        </form>
      </div>
    `;
  },

  renderPostDetail(id) {
    const post = this.state.posts.find((item) => item.id === id);
    if (!post) return this.renderModalHeader('게시글');
    return `
      ${this.renderModalHeader('게시글')}
      <div class="modal-body">
        ${this.renderAuthor(post.authorNickname, post.createdAt)}
        <h3 class="detail-title">${escapeHtml(post.title)}</h3>
        <p class="detail-body">${escapeHtml(post.body)}</p>
        <div class="card-footer">
          <span class="footer-chip"><span class="material-icons">chat_bubble_outline</span>${post.comments.length}</span>
          <span class="footer-chip"><span class="material-icons">favorite_border</span>공감</span>
        </div>
        ${this.renderComments(post.comments)}
        <form class="comment-form" data-form="post-comment" data-id="${escapeHtml(post.id)}">
          <input class="input" name="body" maxlength="180" placeholder="댓글을 남겨주세요" autocomplete="off" required />
          <button class="btn btn-primary" type="submit">등록</button>
        </form>
      </div>
    `;
  },

  renderHelpDetail(id) {
    const help = this.state.helps.find((item) => item.id === id);
    if (!help) return this.renderModalHeader('도움 요청');
    const resolved = help.status === 'resolved';
    return `
      ${this.renderModalHeader('도움 요청')}
      <div class="modal-body">
        <div class="card-top">
          ${this.renderAuthor(help.authorNickname, help.createdAt, resolved ? 'green' : 'amber')}
          <span class="badge ${resolved ? 'green' : 'amber'}">${resolved ? '완료' : '진행중'}</span>
        </div>
        <h3 class="detail-title">${escapeHtml(help.title)}</h3>
        <p class="detail-body">${escapeHtml(help.body)}</p>
        ${resolved ? '<div class="resolved-line"><span class="material-icons">check_circle</span>도움이 완료됐어요</div>' : ''}
        ${!resolved ? `<div class="button-row"><button class="btn btn-green" type="button" data-action="resolve-help" data-id="${escapeHtml(help.id)}">도움 완료</button></div>` : ''}
        ${this.renderComments(help.comments)}
        <form class="comment-form" data-form="help-comment" data-id="${escapeHtml(help.id)}">
          <input class="input" name="body" maxlength="180" placeholder="도울 수 있는 시간을 남겨주세요" autocomplete="off" required />
          <button class="btn btn-primary" type="submit">등록</button>
        </form>
      </div>
    `;
  },

  renderBuyDetail(id) {
    const buy = this.state.groupBuys.find((item) => item.id === id);
    if (!buy) return this.renderModalHeader('공동구매');
    const joined = buy.participantIds.length;
    const share = this.getShareAmount(buy);
    const canJoin = this.canJoinBuy(buy);
    const isHost = buy.hostId === this.state.currentUser.id;
    return `
      ${this.renderModalHeader('공동구매')}
      <div class="modal-body">
        <div class="buy-visual">
          <span class="product-mark ${buy.status === 'closed' ? 'green' : ''}"><span class="material-icons">${escapeHtml(buy.icon || 'local_mall')}</span></span>
          <span class="badge ${buy.status === 'open' ? 'primary' : 'green'}">${escapeHtml(this.getBuyStatusLabel(buy))}</span>
        </div>
        <h3 class="detail-title">${escapeHtml(buy.title)}</h3>
        <p class="detail-body">${escapeHtml(buy.description)}</p>
        <div class="info-grid">
          <div class="info-tile"><span>총 금액</span><strong>${formatWon(buy.totalAmount)}</strong></div>
          <div class="info-tile"><span>1인 부담</span><strong>${formatWon(share)}</strong></div>
          <div class="info-tile"><span>참여 인원</span><strong>${joined} / ${buy.goalCount}명</strong></div>
          <div class="info-tile"><span>마감</span><strong>${escapeHtml(buy.deadlineAt)}</strong></div>
          <div class="info-tile"><span>분배 위치</span><strong>${escapeHtml(buy.pickupLocation)}</strong></div>
          <div class="info-tile"><span>모집자</span><strong>${escapeHtml(buy.hostNickname)}</strong></div>
        </div>
        <div class="card notice-card" style="margin-top:14px; box-shadow:none;">
          ${escapeHtml(buy.distributionNote)} 정산은 별도 송금 또는 오프라인 방식으로 진행해요.
        </div>
        <div class="participants">
          ${buy.participantIds.map((userId) => `
            <span class="participant-pill"><span class="mini-avatar">${escapeHtml(initials(this.getUserName(userId)))}</span>${escapeHtml(this.getUserName(userId))}</span>
          `).join('')}
        </div>
        <div class="button-row">
          <button class="btn btn-primary" type="button" data-action="join-buy" data-id="${escapeHtml(buy.id)}" ${canJoin ? '' : 'disabled'}>${this.getJoinButtonLabel(buy)}</button>
          ${isHost && buy.status === 'open' ? `<button class="btn btn-soft" type="button" data-action="close-buy" data-id="${escapeHtml(buy.id)}">모집 마감</button>` : ''}
        </div>
      </div>
    `;
  },

  renderComments(comments) {
    return `
      <div class="comment-list">
        ${comments.length ? comments.map((comment) => `
          <div class="comment-item">
            <div class="avatar">${escapeHtml(initials(comment.authorNickname))}</div>
            <div class="comment-copy">
              <strong>${escapeHtml(comment.authorNickname)}</strong><span>${escapeHtml(comment.createdAt)}</span>
              <p>${escapeHtml(comment.body)}</p>
            </div>
          </div>
        `).join('') : '<div class="empty-state" style="box-shadow:none;">아직 댓글이 없어요.</div>'}
      </div>
    `;
  },

  submitNickname(form) {
    const nickname = form.nickname.value.trim();
    if (!nickname) {
      this.showToast('닉네임을 입력해주세요.');
      return;
    }
    this.state.currentUser.nickname = nickname;
    this.state.session.step = 'dwelling';
    this.saveState();
    this.render();
  },

  selectDwelling(type) {
    this.state.session.dwellingType = type;
    this.state.session.step = 'address';
    this.state.session.selectedCommunityId = '';
    this.saveState();
    this.render();
  },

  submitAddress(form) {
    this.state.session.addressQuery = form.addressQuery.value.trim();
    const first = this.getRecommendedCommunities()[0];
    this.state.session.selectedCommunityId = first?.id || '';
    this.state.session.step = 'confirm';
    this.saveState();
    this.render();
  },

  selectCommunity(id) {
    this.state.session.selectedCommunityId = id;
    this.state.session.step = 'confirm';
    this.saveState();
    this.render();
  },

  enterCommunity() {
    const id = this.state.session.selectedCommunityId || this.getRecommendedCommunities()[0]?.id;
    if (!id) {
      this.showToast('입장할 커뮤니티를 골라주세요.');
      return;
    }
    this.state.currentCommunityId = id;
    this.state.session.selectedCommunityId = id;
    this.state.session.completed = true;
    this.state.activeTab = 'board';
    this.ensureCommunitySeed(id);
    this.saveState();
    this.render();
  },

  backOnboarding() {
    const order = ['nickname', 'dwelling', 'address', 'confirm'];
    const index = order.indexOf(this.state.session.step);
    this.state.session.step = order[Math.max(0, index - 1)];
    this.saveState();
    this.render();
  },

  switchTab(tab) {
    this.state.activeTab = tab;
    this.closeModal(false);
    this.saveState();
    this.render();
  },

  openModal(type, id = '') {
    this.state.modal = { type, id };
    this.renderModal();
  },

  closeModal(shouldRender = true) {
    this.state.modal = null;
    if (shouldRender) this.renderModal();
  },

  createPost(form) {
    const title = form.title.value.trim();
    const body = form.body.value.trim();
    if (!title || !body) return;
    this.state.posts.unshift({
      id: makeId('post'),
      communityId: this.state.currentCommunityId,
      authorId: this.state.currentUser.id,
      authorNickname: this.state.currentUser.nickname,
      title,
      body,
      createdAt: '방금 전',
      comments: [],
    });
    this.afterMutation('게시글을 올렸어요.');
  },

  createHelp(form) {
    const title = form.title.value.trim();
    const body = form.body.value.trim();
    if (!title || !body) return;
    this.state.helps.unshift({
      id: makeId('help'),
      communityId: this.state.currentCommunityId,
      authorId: this.state.currentUser.id,
      authorNickname: this.state.currentUser.nickname,
      title,
      body,
      status: 'open',
      createdAt: '방금 전',
      resolvedAt: '',
      comments: [],
    });
    this.afterMutation('도움 요청을 올렸어요.');
  },

  createBuy(form) {
    const title = form.title.value.trim();
    const totalAmount = Number(form.totalAmount.value);
    const goalCount = Number(form.goalCount.value);
    const deadlineAt = form.deadlineAt.value.trim();
    const pickupLocation = form.pickupLocation.value.trim();
    const distributionNote = form.distributionNote.value.trim();
    const description = form.description.value.trim();
    if (!title || !totalAmount || !goalCount || !deadlineAt || !pickupLocation || !distributionNote || !description) return;

    this.state.groupBuys.unshift({
      id: makeId('buy'),
      communityId: this.state.currentCommunityId,
      hostId: this.state.currentUser.id,
      hostNickname: this.state.currentUser.nickname,
      title,
      description,
      icon: 'local_mall',
      totalAmount,
      goalCount,
      deadlineAt,
      pickupLocation,
      distributionNote,
      status: 'open',
      participantIds: [this.state.currentUser.id],
      createdAt: '방금 전',
    });
    this.afterMutation('공동구매 모집을 시작했어요.');
  },

  addPostComment(form) {
    const post = this.state.posts.find((item) => item.id === form.dataset.id);
    const body = form.body.value.trim();
    if (!post || !body) return;
    post.comments.push(createComment(this.state.currentUser.id, this.state.currentUser.nickname, body));
    this.state.modal = { type: 'post-detail', id: post.id };
    this.saveState();
    this.render();
    this.showToast('댓글을 남겼어요.');
  },

  addHelpComment(form) {
    const help = this.state.helps.find((item) => item.id === form.dataset.id);
    const body = form.body.value.trim();
    if (!help || !body) return;
    help.comments.push(createComment(this.state.currentUser.id, this.state.currentUser.nickname, body));
    this.state.modal = { type: 'help-detail', id: help.id };
    this.saveState();
    this.render();
    this.showToast('댓글을 남겼어요.');
  },

  resolveHelp(id) {
    const help = this.state.helps.find((item) => item.id === id);
    if (!help || help.status === 'resolved') return;
    help.status = 'resolved';
    help.resolvedAt = '방금 전';
    this.saveState();
    this.render();
    this.showToast('도움 요청을 완료했어요.');
  },

  joinBuy(id) {
    const buy = this.state.groupBuys.find((item) => item.id === id);
    if (!buy || !this.canJoinBuy(buy)) return;
    buy.participantIds.push(this.state.currentUser.id);
    this.state.modal = { type: 'buy-detail', id: buy.id };
    this.saveState();
    this.render();
    this.showToast('공동구매에 참여했어요.');
  },

  closeBuy(id) {
    const buy = this.state.groupBuys.find((item) => item.id === id);
    if (!buy || buy.hostId !== this.state.currentUser.id) return;
    buy.status = 'closed';
    this.state.modal = { type: 'buy-detail', id: buy.id };
    this.saveState();
    this.render();
    this.showToast('모집을 마감했어요.');
  },

  resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = createDefaultState();
    this.render();
    this.showToast('처음 화면으로 돌아왔어요.');
  },

  afterMutation(message) {
    this.state.modal = null;
    this.saveState();
    this.render();
    this.showToast(message);
  },

  getRecommendedCommunities() {
    const type = this.state.session.dwellingType === 'villa' ? 'block' : 'building';
    const query = this.state.session.addressQuery.trim();
    const communities = clone(this.state.communities);
    return communities
      .sort((a, b) => {
        const typeScore = Number(b.type === type) - Number(a.type === type);
        if (typeScore !== 0) return typeScore;
        if (!query) return b.memberCount - a.memberCount;
        const aHit = `${a.name} ${a.regionLabel}`.includes(query);
        const bHit = `${b.name} ${b.regionLabel}`.includes(query);
        return Number(bHit) - Number(aHit);
      });
  },

  ensureCommunitySeed(communityId) {
    if (this.state.posts.some((item) => item.communityId === communityId)) return;
    const community = this.getCommunity(communityId);
    const isBlock = community?.type === 'block';
    this.state.posts.push({
      id: makeId('post'),
      communityId,
      authorId: 'u-minji',
      authorNickname: '민지',
      title: isBlock ? '골목 입구 택배함 비었어요' : '엘리베이터 점검 안내 붙었어요',
      body: isBlock ? '아침엔 꽉 차 있었는데 지금은 비어 있어요. 택배 찾으실 분들 참고하세요.' : '내일 오전 10시부터 30분 정도 멈춘다고 합니다. 출근 시간은 피해서 다행이에요.',
      createdAt: '방금 전',
      comments: [],
    });
    this.state.helps.push({
      id: makeId('help'),
      communityId,
      authorId: 'u-junho',
      authorNickname: '준호',
      title: isBlock ? '무거운 쌀 포대 같이 들어주실 분' : '현관문 도어락 건전지 봐주실 분',
      body: isBlock ? '골목 앞까지는 왔는데 방까지 들고 가기가 어렵네요. 잠깐만 부탁드려요.' : '도어락 경고음이 계속 나는데 건전지 방향을 잘 모르겠어요.',
      status: 'open',
      createdAt: '7분 전',
      resolvedAt: '',
      comments: [],
    });
    this.state.groupBuys.push({
      id: makeId('buy'),
      communityId,
      hostId: 'u-seoyeon',
      hostNickname: '서연',
      title: isBlock ? '편의점 도시락 묶음 주문' : '휴지 30롤 묶음',
      description: isBlock ? '저녁에 같이 주문하면 배달비가 줄어서 모집해요.' : '한 번에 사면 싸서 같이 나눌 분 찾아요.',
      icon: isBlock ? 'restaurant' : 'inventory_2',
      totalAmount: isBlock ? 32000 : 25500,
      goalCount: isBlock ? 4 : 3,
      deadlineAt: isBlock ? '오늘 19:30' : '내일 12:00',
      pickupLocation: isBlock ? '골목 입구 편의점 앞' : '1층 공동현관',
      distributionNote: '물건 도착하면 시간 맞춰서 나눠요.',
      status: 'open',
      participantIds: ['u-seoyeon'],
      createdAt: '방금 전',
    });
  },

  getCommunity(id) {
    return this.state.communities.find((community) => community.id === id);
  },

  getCurrentCommunity() {
    return this.getCommunity(this.state.currentCommunityId);
  },

  getPosts() {
    return this.state.posts.filter((post) => post.communityId === this.state.currentCommunityId);
  },

  getHelps() {
    return this.state.helps.filter((help) => help.communityId === this.state.currentCommunityId);
  },

  getGroupBuys() {
    return this.state.groupBuys.filter((buy) => buy.communityId === this.state.currentCommunityId);
  },

  getUserName(id) {
    if (id === this.state.currentUser.id) return this.state.currentUser.nickname;
    return this.state.users.find((user) => user.id === id)?.nickname || '이웃';
  },

  getShareAmount(buy) {
    return Math.ceil(Number(buy.totalAmount) / Math.max(buy.participantIds.length, 1));
  },

  getBuyStatusLabel(buy) {
    if (buy.status === 'closed') return '모집 마감';
    if (buy.status === 'cancelled') return '취소됨';
    if (buy.participantIds.length >= buy.goalCount) return '목표 인원';
    return '모집중';
  },

  canJoinBuy(buy) {
    return buy.status === 'open'
      && buy.participantIds.length < buy.goalCount
      && !buy.participantIds.includes(this.state.currentUser.id);
  },

  getJoinButtonLabel(buy) {
    if (buy.status !== 'open') return '마감된 모집입니다';
    if (buy.participantIds.includes(this.state.currentUser.id)) return '참여 중입니다';
    if (buy.participantIds.length >= buy.goalCount) return '목표 인원이 찼어요';
    return '참여하기';
  },

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 1800);
  },
};

document.addEventListener('DOMContentLoaded', () => app.init());
