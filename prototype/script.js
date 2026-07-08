let hasEvent = true;

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function login() {
  document.getElementById('sidebar').classList.remove('hidden');
  showPage('dashboard');
  renderUrgent();
}

function logout() {
  document.getElementById('sidebar').classList.add('hidden');
  showPage('login');
}

function fakeAnalyze() {
  showPage('analysis');
}

function addToCalendar() {
  const title = document.getElementById('eventTitle').value;
  const date = document.getElementById('eventDate').value;
  const category = document.getElementById('eventCategory').value;
  const memo = document.getElementById('eventMemo').value;

  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailDate').textContent = date;
  document.getElementById('detailCategory').textContent = category;
  document.getElementById('detailMemo').textContent = memo;
  document.getElementById('calendarEvent').textContent = title.replace(' - 서류 제출', '');

  hasEvent = true;
  renderUrgent();
  showPage('calendar');
}

function renderUrgent() {
  const list = document.getElementById('urgentList');
  if (!hasEvent) {
    list.innerHTML = '<p class="empty">등록된 마감 일정이 없습니다.</p>';
    return;
  }
  list.innerHTML = `
    <div class="urgent-item"><strong>D-7</strong><span>A 공모전 - 서류 제출</span></div>
    <div class="urgent-item"><strong>D-14</strong><span>팀플 최종 발표</span></div>
  `;
}

function deleteEvent() {
  hasEvent = false;
  document.getElementById('calendarEvent').textContent = '';
  renderUrgent();
  showPage('dashboard');
}
