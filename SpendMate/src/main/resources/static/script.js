// ===== Tab navigation =====
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabPanels = document.querySelectorAll('.tab-panel');

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    navItems.forEach(b => b.classList.toggle('active', b === btn));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  });
});

// ===== Calendar (Home) =====
const CAL_SPEND_DAYS = { 1: 'low', 2: 'mid', 3: 'low', 4: 'high', 5: 'mid', 7: 'low', 8: 'mid', 10: 'high', 11: 'low', 14: 'mid' };

function buildCalendar() {
  const today = new Date(2026, 6, 8); // July 8, 2026
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, todayDate: today.getDate() };
}

const calendarGrid = document.getElementById('calendar-grid');
const { cells, todayDate } = buildCalendar();
let selectedDay = null;

function renderCalendar() {
  calendarGrid.innerHTML = '';
  cells.forEach(day => {
    const cell = document.createElement('button');
    cell.className = 'cal-cell';
    if (!day) {
      cell.disabled = true;
    } else {
      const isToday = day === todayDate;
      const isSelected = day === selectedDay;
      if (isToday) cell.classList.add('today');
      if (isSelected) cell.classList.add('selected');
      const spend = CAL_SPEND_DAYS[day];
      cell.innerHTML = `<span class="day-num">${day}</span>${spend ? `<span class="cal-dot ${spend}"></span>` : ''}`;
      cell.addEventListener('click', () => {
        selectedDay = day === selectedDay ? null : day;
        renderCalendar();
      });
    }
    calendarGrid.appendChild(cell);
  });
}
renderCalendar();

// ===== Survival mode accordion (Home teaser -> jumps to MyPage) =====
document.getElementById('survival-teaser-btn').addEventListener('click', () => {
  document.querySelector('.nav-item[data-tab="mypage"]').click();
  const card = document.getElementById('survival-card');
  card.classList.add('expanded');
});

document.getElementById('survival-card').addEventListener('click', function () {
  this.classList.toggle('expanded');
});

// ===== Stats period selector =====
document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ===== AI Coach chat =====
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function buildAiCard(kind) {
  if (kind === 'recipe') {
    return `<div class="mini-card recipe">
      <div class="head"><div class="head-icon" style="background:#E8F8F6">👨‍🍳</div><div><p>오늘의 절약 레시피</p><p class="sub">배달비 18,500원 → 재료비 6,200원</p></div></div>
      <div class="recipe-tags"><div>🍳 계란볶음밥</div><div>🥗 참치샐러드</div><div>🍜 라면+계란</div></div>
      <button>전체 레시피 보기</button>
    </div>`;
  }
  if (kind === 'compare') {
    return `<div class="mini-card compare">
      <div class="head"><div class="head-icon" style="background:#EBF2FF">📊</div><p>편의점 가격 비교</p></div>
      <div class="compare-row"><span class="name best">⭐ CU</span><span><span class="price">5,400원</span><span class="diff down">-700원</span></span></div>
      <div class="compare-row"><span class="name">GS25</span><span><span class="price">6,100원</span><span class="diff">기준</span></span></div>
      <div class="compare-row"><span class="name">세븐일레븐</span><span><span class="price">5,800원</span><span class="diff down">-300원</span></span></div>
    </div>`;
  }
  return `<div class="mini-card tip">
    <div class="head"><div class="head-icon" style="background:#FFF3CC">📉</div><p style="color:#B45309">이번 달 절약 미션</p></div>
    <div class="tip-list">
      <div>☕ 카페 2회→1회로 줄이기 (절약 +6,500원)</div>
      <div>🛵 배달 주 3회→1회 (절약 +37,000원)</div>
      <div>🛒 이마트 대신 노브랜드 이용</div>
    </div>
  </div>`;
}

function appendMessage(role, text, cardKind) {
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;
  if (role === 'ai') {
    row.innerHTML = `<div class="msg-ai-inner">
      <div class="msg-avatar">✨</div>
      <div style="flex:1">
        <div class="bubble-ai"><p>${text}</p></div>
        ${cardKind ? buildAiCard(cardKind) : ''}
      </div>
    </div>`;
  } else {
    row.innerHTML = `<div class="bubble-user"><p>${text}</p></div>`;
  }
  chatMessages.appendChild(row);
  scrollChatToBottom();
}

function sendMessage(text) {
  if (!text || !text.trim()) return;
  appendMessage('user', text);

  let aiText, cardKind;
  if (text.includes('레시피')) {
    aiText = '요즘 배달비가 많이 나오셨군요. 아래 집밥 레시피로 절약해 보세요!';
    cardKind = 'recipe';
  } else if (text.includes('비교')) {
    aiText = 'GS25보다 CU가 평균 700원 저렴해요. 근처 편의점 가격을 비교해봤어요!';
    cardKind = 'compare';
  } else {
    aiText = '분석해봤어요! 이번 달 지출에서 외식 카테고리가 40%를 차지하고 있어요. 절약 팁을 확인해보세요.';
    cardKind = 'tip';
  }
  setTimeout(() => appendMessage('ai', aiText, cardKind), 300);
  chatInput.value = '';
  updateSendBtn();
}

document.querySelectorAll('.quick-reply-btn').forEach(btn => {
  btn.addEventListener('click', () => sendMessage(btn.textContent));
});

function updateSendBtn() {
  sendBtn.classList.toggle('ready', chatInput.value.trim().length > 0);
}
chatInput.addEventListener('input', updateSendBtn);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(chatInput.value); });
sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

// ===== Add Expense modal =====
const modalOverlay = document.getElementById('modal-overlay');
const modalSteps = document.querySelectorAll('.modal-step');
const fabAdd = document.getElementById('fab-add');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');

function goToStep(stepId) {
  modalSteps.forEach(s => s.classList.toggle('active', s.id === `step-${stepId}`));
}

function openModal() {
  modalOverlay.classList.add('open');
  goToStep('method');
}

function closeModal() {
  modalOverlay.classList.remove('open');
  resetForm();
  resetOcr();
}

fabAdd.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const goto = btn.dataset.goto;
    goToStep(goto);
    if (goto === 'ocr') runOcrSequence();
  });
});

// -- Form step --
const amountInput = document.getElementById('amount-input');
const formSaveBtn = document.getElementById('form-save-btn');
const categoryGrid = document.getElementById('category-grid');

amountInput.addEventListener('input', () => {
  amountInput.value = amountInput.value.replace(/\D/g, '');
  formSaveBtn.classList.toggle('ready', amountInput.value.length > 0);
});

categoryGrid.addEventListener('click', e => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  categoryGrid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
});

formSaveBtn.addEventListener('click', () => {
  if (!amountInput.value) return;
  closeModal();
});

function resetForm() {
  amountInput.value = '';
  formSaveBtn.classList.remove('ready');
  categoryGrid.querySelectorAll('.cat-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
  document.querySelector('.memo-input').value = '';
}

// -- OCR step --
let ocrTimer = null;
function resetOcr() {
  clearInterval(ocrTimer);
  document.querySelectorAll('.ocr-step-item').forEach(item => item.classList.remove('done'));
}

function runOcrSequence() {
  resetOcr();
  let progress = 0;
  ocrTimer = setInterval(() => {
    progress++;
    document.querySelectorAll('.ocr-step-item').forEach(item => {
      if (Number(item.dataset.step) < progress) item.classList.add('done');
    });
    if (progress >= 3) {
      clearInterval(ocrTimer);
      setTimeout(() => goToStep('result'), 600);
    }
  }, 900);
}

document.getElementById('result-cancel-btn').addEventListener('click', closeModal);
document.getElementById('result-save-btn').addEventListener('click', closeModal);
