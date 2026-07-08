// Default Mock Data
const defaultState = {
  hasLoggedIn: false,
  currentUser: '민지',
  currentBuilding: '햇살원룸 3동',
  posts: [
    { id: 1, author: '민지', title: '도로 공사', body: '공사 소리 너무 시끄러운데 언제까지 하는지 아시는 분 계신가요 ㅠㅠ', createdAt: '방금 전' },
    { id: 2, author: '준호', title: '3층 복도 전등이 깜빡입니다', body: '관리실에 연락은 해뒀는데 밤에 지나갈 때 조심하세요.', createdAt: '12분 전' }
  ],
  helps: [
    { id: 1, author: '민지', title: '벌레 좀 잡아주세요 제발', body: '바선생때문에 집을 못 들어가고 있어요 살려주세요', status: '진행중', createdAt: '5분 전' },
    { id: 2, author: '서연', title: '화장실 전구 교체 도움', body: '사다리가 없어서 전구 교체가 어렵습니다. 잠깐 도와주시면 커피 드릴게요.', status: '완료', createdAt: '어제' }
  ],
  buys: [
    { id: 1, owner: '민지', name: '생수 2L 12개 묶음', total: 24000, goal: 4, joined: 2, deadline: '오늘 22:00', description: '편의점보다 저렴한 묶음 상품입니다. 1층 로비에서 나눠 가져가요.', closed: false, participants: ['민지', '준호'] },
    { id: 2, owner: '서연', name: '대용량 세탁세제', total: 36000, goal: 3, joined: 3, deadline: '내일 12:00', description: '세제 3개 세트라 각자 하나씩 나누면 됩니다. 구매 확정 직전입니다.', closed: false, participants: ['서연', '민지', '하늘'] },
    { id: 3, owner: '하늘', name: '야식 떡볶이 세트', total: 28000, goal: 4, joined: 4, deadline: '오늘 21:30', description: '배달비 아끼려고 같이 주문합니다. 맵기는 보통으로 주문 예정입니다.', closed: true, participants: ['하늘', '민지', '준호', '서연'] }
  ],
  selectedBuyId: null
};

// Load state from localStorage or use default
let state = JSON.parse(localStorage.getItem('saisai_state')) || defaultState;

// Ensure new field exists
if (state.hasLoggedIn === undefined) state.hasLoggedIn = false;

// Set initial selection
if (!state.selectedBuyId && state.buys.length > 0) {
  state.selectedBuyId = state.buys[0].id;
}

function saveState() {
  localStorage.setItem('saisai_state', JSON.stringify(state));
}

// Helpers
const formatWon = (val) => `${Math.ceil(val).toLocaleString('ko-KR')}원`;
const getBuyShare = (buy) => buy.total / Math.max(buy.joined, 1);
const byId = (id) => document.getElementById(id);

const getAvatarColor = (name) => {
  const colors = ['#0d9488', '#ea580c', '#3b82f6', '#8b5cf6', '#db2777', '#16a34a'];
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getProductVisual = (name) => {
  const n = name.toLowerCase();
  if (n.includes('수') || n.includes('음료') || n.includes('커피')) return { bg: '#eff6ff', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>' };
  if (n.includes('세제') || n.includes('휴지') || n.includes('생필품')) return { bg: '#f0fdfa', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' };
  if (n.includes('떡볶이') || n.includes('치킨') || n.includes('야식') || n.includes('밥')) return { bg: '#fff7ed', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' };
  return { bg: '#f8fafc', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' };
};

// Render Functions
function checkAuth() {
  if (state.hasLoggedIn) {
    document.body.classList.add('authenticated');
  } else {
    document.body.classList.remove('authenticated');
  }
}

function renderProfile() {
  if(byId('sidebar-username')) byId('sidebar-username').textContent = state.currentUser;
  if(byId('sidebar-building-name')) byId('sidebar-building-name').textContent = state.currentBuilding;
  if(byId('mobile-top-building')) byId('mobile-top-building').textContent = state.currentBuilding;
  
  if(byId('auth-user-name')) byId('auth-user-name').value = state.currentUser;
  if(byId('auth-building-select')) byId('auth-building-select').value = state.currentBuilding;
  if(byId('user-name')) byId('user-name').value = state.currentUser;
  if(byId('building-select')) byId('building-select').value = state.currentBuilding;
  
  const ava = byId('sidebar-avatar');
  if(ava) {
    ava.textContent = state.currentUser.charAt(0);
    ava.style.background = getAvatarColor(state.currentUser);
  }
}

function renderStats() {
  if(byId('stat-posts')) byId('stat-posts').textContent = state.posts.length;
  if(byId('stat-help')) byId('stat-help').textContent = state.helps.filter(h => h.status === '진행중').length;
  if(byId('stat-buys')) byId('stat-buys').textContent = state.buys.filter(b => !b.closed).length;
}

function renderPosts() {
  const container = byId('post-list');
  if(!container) return;
  container.innerHTML = state.posts.map(p => `
    <div class="card">
      <div class="card-top">
        <div class="author-meta">
          <div class="avatar" style="background:${getAvatarColor(p.author)}">${p.author.charAt(0)}</div>
          <div class="author-names">
            <strong>${p.author}</strong>
            <span>${p.createdAt} · ${state.currentBuilding}</span>
          </div>
        </div>
      </div>
      <h4 class="card-title">${p.title}</h4>
      <p class="card-body">${p.body}</p>
      <div class="card-actions">
        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> 공감
        </button>
        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> 댓글 0
        </button>
      </div>
    </div>
  `).join('');
}

function renderHelps() {
  const container = byId('help-list');
  if(!container) return;
  container.innerHTML = state.helps.map(h => `
    <div class="card">
      <div class="card-top">
        <div class="author-meta">
          <div class="avatar" style="background:${getAvatarColor(h.author)}">${h.author.charAt(0)}</div>
          <div class="author-names">
            <strong>${h.author}</strong>
            <span>${h.createdAt} · ${state.currentBuilding}</span>
          </div>
        </div>
        <span class="status-badge ${h.status === '완료' ? 'done' : 'ongoing'}">${h.status === '완료' ? '해결완료' : '도움요청'}</span>
      </div>
      <h4 class="card-title" style="${h.status === '완료' ? 'text-decoration:line-through; color:var(--text-light);' : ''}">${h.title}</h4>
      <p class="card-body" style="${h.status === '완료' ? 'color:var(--text-light);' : ''}">${h.body}</p>
      <div class="card-actions" style="padding-top:12px;">
        ${h.status === '진행중' ? `
          <button class="action-primary-btn" data-complete-help="${h.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> 도움받기 완료
          </button>
        ` : `
          <div class="action-done-text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> 따뜻한 이웃의 도움으로 해결됐어요
          </div>
        `}
      </div>
    </div>
  `).join('');
}

function renderBuys() {
  const container = byId('buy-list');
  if(!container) return;
  container.innerHTML = state.buys.map(b => {
    const visual = getProductVisual(b.name);
    const progress = Math.min(100, (b.joined / b.goal) * 100);
    return `
      <div class="buy-card ${b.id === state.selectedBuyId ? 'active' : ''} ${b.closed ? 'closed' : ''}" data-select-buy="${b.id}">
        <div class="buy-visual" style="background:${visual.bg}">
          ${visual.icon}
          <div class="buy-owner" style="background:${getAvatarColor(b.owner)}">${b.owner.charAt(0)}</div>
        </div>
        <div class="buy-info">
          <h4>${b.name}</h4>
          <span class="buy-deadline ${b.closed ? 'closed' : ''}">${b.closed ? '모집 마감' : b.deadline + ' 마감'}</span>
          
          <div class="progress-wrap">
            <div class="progress-meta">
              <span class="count">${b.joined}명 / ${b.goal}명</span>
              <span class="percent">${Math.round(progress)}%</span>
            </div>
            <div class="progress-bar"><div style="width:${progress}%"></div></div>
          </div>
          
          <div class="buy-price-row">
            <span>1인 예상가</span>
            <strong>${formatWon(getBuyShare(b))}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBuyDetail() {
  const container = byId('buy-detail');
  if(!container) return;
  
  const b = state.buys.find(x => x.id === state.selectedBuyId);
  if(!b) {
    container.innerHTML = `<div class="detail-empty">선택된 공동구매가 없습니다.</div>`;
    return;
  }
  
  const isJoined = b.participants.includes(state.currentUser);
  
  container.innerHTML = `
    <div class="detail-header">
      <div>
        <h3>${b.name}</h3>
        <span class="status-badge ${b.closed ? 'done' : 'ongoing'}">${b.closed ? '마감됨' : b.deadline + ' 마감'}</span>
      </div>
    </div>
    <div class="detail-desc">${b.description}</div>
    
    <div class="price-box">
      <div class="price-row"><span>총 상품 금액</span> <span>${formatWon(b.total)}</span></div>
      <div class="price-row"><span>모집 목표 인원</span> <span>${b.goal}명</span></div>
      <div class="price-row total"><span>1인 부담 금액</span> <strong>${formatWon(getBuyShare(b))}</strong></div>
    </div>
    
    <div>
      <div class="text-muted" style="font-size:13px; font-weight:700;">참여중인 이웃 (${b.joined}/${b.goal})</div>
      <div class="participant-list">
        ${b.participants.map(p => `
          <div class="participant-pill">
            <div class="ava" style="background:${getAvatarColor(p)}">${p.charAt(0)}</div>
            ${p} ${p === b.owner ? '<span style="color:var(--accent);font-size:10px;">(모집자)</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-top:auto;">
      ${!b.closed && !isJoined ? `<button class="btn-primary" data-join-buy="${b.id}">공동구매 참여하기</button>` : ''}
      ${isJoined && !b.closed ? `<button class="btn-disabled" disabled>참여 중인 공동구매입니다</button>` : ''}
      ${!b.closed ? `<button class="btn-secondary" style="margin-top:8px;" data-close-buy="${b.id}">모집 마감하기</button>` : ''}
      ${b.closed ? `<button class="btn-disabled" disabled>마감된 모집입니다</button>` : ''}
    </div>
  `;
}

function renderActivity() {
  const container = byId('activity-list');
  if(!container) return;
  
  const myPosts = state.posts.filter(p => p.author === state.currentUser);
  const myHelps = state.helps.filter(h => h.author === state.currentUser);
  const myBuys = state.buys.filter(b => b.participants.includes(state.currentUser));
  
  const groups = [
    { title: '내가 쓴 글', items: myPosts, render: i => `<div class="act-item"><span class="act-title">${i.title}</span><span class="act-meta">${i.createdAt}</span></div>` },
    { title: '요청한 도움', items: myHelps, render: i => `<div class="act-item"><span class="act-title">${i.title}</span><span class="status-badge-compact ${i.status==='완료'?'done':'ongoing'}">${i.status}</span></div>` },
    { title: '참여한 공동구매', items: myBuys, render: i => `<div class="act-item"><span class="act-title">${i.name}</span><span class="act-meta" style="color:var(--primary);font-weight:700;">${formatWon(getBuyShare(i))}</span></div>` }
  ];
  
  container.innerHTML = groups.map(g => `
    <div class="act-group">
      <h4>${g.title} <span>${g.items.length}</span></h4>
      ${g.items.length ? g.items.map(g.render).join('') : '<div class="text-light" style="font-size:13px;text-align:center;padding:10px 0;">내역이 없습니다.</div>'}
    </div>
  `).join('');
}

function renderAll() {
  checkAuth();
  renderProfile();
  renderStats();
  renderPosts();
  renderHelps();
  renderBuys();
  renderBuyDetail();
  renderActivity();
}

// Interaction & Tabs
function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tabName);
  });
  
  const titles = { 'feed': '동네생활', 'help': '도와주세요', 'group-buy': '공동구매', 'activity': '나의 활동' };
  const st = byId('screen-title');
  if(st) st.textContent = titles[tabName] || '사이사이';
  
  const fab = byId('fab');
  if(fab) {
    if(tabName === 'activity') fab.classList.add('hidden');
    else fab.classList.remove('hidden');
  }
  
  document.body.classList.remove('detail-open');
}

window.handleFabClick = function() {
  const activeTab = document.querySelector('.nav-item.active').dataset.tab;
  if(activeTab === 'feed') openModal('post-modal');
  if(activeTab === 'help') openModal('help-modal');
  if(activeTab === 'group-buy') openModal('buy-modal');
}

window.openModal = function(id) {
  const m = byId(id);
  if(m) {
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
    const input = m.querySelector('input');
    if(input) setTimeout(() => input.focus(), 100);
  }
}
window.closeAllModals = function() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}
window.closeBuyDetail = function() { document.body.classList.remove('detail-open'); }

window.logout = function() {
  state.hasLoggedIn = false;
  saveState();
  closeAllModals();
  renderAll();
}

// Form Submits
if(byId('auth-form')) byId('auth-form').onsubmit = (e) => {
  e.preventDefault();
  state.currentUser = byId('auth-user-name').value.trim() || '이웃';
  state.currentBuilding = byId('auth-building-select').value;
  state.hasLoggedIn = true;
  saveState();
  renderAll();
};

if(byId('profile-form')) byId('profile-form').onsubmit = (e) => {
  e.preventDefault();
  state.currentUser = byId('user-name').value.trim() || '이웃';
  state.currentBuilding = byId('building-select').value;
  saveState();
  closeAllModals();
  renderAll();
};

if(byId('post-form')) byId('post-form').onsubmit = (e) => {
  e.preventDefault();
  state.posts.unshift({ id: Date.now(), author: state.currentUser, title: byId('post-title').value.trim(), body: byId('post-body').value.trim(), createdAt: '방금 전' });
  e.target.reset(); saveState(); closeAllModals(); renderAll();
};

if(byId('help-form')) byId('help-form').onsubmit = (e) => {
  e.preventDefault();
  state.helps.unshift({ id: Date.now(), author: state.currentUser, title: byId('help-title').value.trim(), body: byId('help-body').value.trim(), status: '진행중', createdAt: '방금 전' });
  e.target.reset(); saveState(); closeAllModals(); renderAll();
};

if(byId('buy-form')) byId('buy-form').onsubmit = (e) => {
  e.preventDefault();
  const buy = {
    id: Date.now(), owner: state.currentUser, name: byId('buy-name').value.trim(),
    total: Number(byId('buy-total').value), goal: Number(byId('buy-goal').value), joined: 1,
    deadline: byId('buy-deadline').value.trim(), description: byId('buy-description').value.trim(),
    closed: false, participants: [state.currentUser]
  };
  state.buys.unshift(buy);
  state.selectedBuyId = buy.id;
  e.target.reset(); saveState(); closeAllModals(); renderAll();
};

// Global Events
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) closeAllModals();
  if (e.target.closest('[data-close-modal]')) closeAllModals();
  
  const tabBtn = e.target.closest('.nav-item');
  if (tabBtn) switchTab(tabBtn.dataset.tab);
  
  const selBuy = e.target.closest('[data-select-buy]');
  if(selBuy) {
    state.selectedBuyId = Number(selBuy.dataset.selectBuy);
    saveState();
    renderAll();
    document.body.classList.add('detail-open');
  }
  
  const joinBtn = e.target.closest('[data-join-buy]');
  if(joinBtn) {
    const id = Number(joinBtn.dataset.joinBuy);
    const b = state.buys.find(x => x.id === id);
    if(b && !b.closed && !b.participants.includes(state.currentUser)) {
      b.participants.push(state.currentUser);
      b.joined = b.participants.length;
      state.selectedBuyId = id;
      saveState(); renderAll();
    }
  }
  
  const closeBtn = e.target.closest('[data-close-buy]');
  if(closeBtn) {
    const b = state.buys.find(x => x.id === Number(closeBtn.dataset.closeBuy));
    if(b) { b.closed = true; saveState(); renderAll(); }
  }
  
  const compHelp = e.target.closest('[data-complete-help]');
  if(compHelp) {
    const h = state.helps.find(x => x.id === Number(compHelp.dataset.completeHelp));
    if(h) { h.status = '완료'; saveState(); renderAll(); }
  }
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') { closeAllModals(); closeBuyDetail(); }
});

// Init
renderAll();
