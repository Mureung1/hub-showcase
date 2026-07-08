import { useState } from 'react';
import './App.css';

type SignalStatus = 'red' | 'yellow' | 'green';

interface Member {
  id: string;
  name: string;
  status: SignalStatus;
  daysSinceContact: number;
  lastSession: string;
  avatar: string;
}

interface MealEntry {
  id: string;
  memberName: string;
  memberAvatar: string;
  mealType: string;
  time: string;
  memo: string;
  pending: boolean;
}

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: '이준호',
    status: 'red',
    daysSinceContact: 9,
    lastSession: '벤치프레스 60kg × 3세트',
    avatar: '준',
  },
  {
    id: '2',
    name: '박서연',
    status: 'yellow',
    daysSinceContact: 4,
    lastSession: '스쿼트 70kg × 4세트',
    avatar: '서',
  },
  {
    id: '3',
    name: '최민수',
    status: 'yellow',
    daysSinceContact: 5,
    lastSession: '데드리프트 100kg × 3세트',
    avatar: '민',
  },
  {
    id: '4',
    name: '김하늘',
    status: 'green',
    daysSinceContact: 1,
    lastSession: '랫풀다운 45kg × 3세트',
    avatar: '하',
  },
  {
    id: '5',
    name: '정우진',
    status: 'green',
    daysSinceContact: 0,
    lastSession: '오버헤드프레스 40kg × 3세트',
    avatar: '우',
  },
];

const MOCK_MEALS: MealEntry[] = [
  {
    id: '1',
    memberName: '박서연',
    memberAvatar: '서',
    mealType: '아침',
    time: '08:12',
    memo: '오트밀 + 바나나 + 프로틴',
    pending: true,
  },
  {
    id: '2',
    memberName: '최민수',
    memberAvatar: '민',
    mealType: '점심',
    time: '12:34',
    memo: '닭가슴살 도시락, 현미밥',
    pending: true,
  },
  {
    id: '3',
    memberName: '김하늘',
    memberAvatar: '하',
    mealType: '저녁',
    time: '19:05',
    memo: '연어 샐러드, 고구마',
    pending: true,
  },
  {
    id: '4',
    memberName: '정우진',
    memberAvatar: '우',
    mealType: '간식',
    time: '15:20',
    memo: '그릭요거트 + 견과류',
    pending: false,
  },
  {
    id: '5',
    memberName: '이준호',
    memberAvatar: '준',
    mealType: '점심',
    time: '13:01',
    memo: '샐러드 볼 (단백질 부족)',
    pending: true,
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    message: '이준호 회원 — 9일간 무응답 (🔴)',
    time: '10분 전',
    read: false,
  },
  {
    id: '2',
    message: '박서연 회원 — 오늘 아침 식단 업로드',
    time: '1시간 전',
    read: false,
  },
  {
    id: '3',
    message: '최민수 회원 — 5일간 무응답 (🟡)',
    time: '3시간 전',
    read: true,
  },
];

const ROUTINE_PREVIEW = [
  { exercise: '벤치프레스', weight: '60kg', sets: '3세트 × 10회' },
  { exercise: '인클라인 덤벨프레스', weight: '22kg', sets: '3세트 × 12회' },
  { exercise: '케이블 플라이', weight: '15kg', sets: '3세트 × 15회' },
  { exercise: '트라이셉스 푸시다운', weight: '20kg', sets: '3세트 × 12회' },
];

const STATUS_LABEL: Record<SignalStatus, string> = {
  red: '주의',
  yellow: '관심',
  green: '정상',
};

function App() {
  const [filter, setFilter] = useState<'all' | SignalStatus>('all');
  const [selectedMemberId, setSelectedMemberId] = useState('2');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>(
    {},
  );
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const redCount = MOCK_MEMBERS.filter((m) => m.status === 'red').length;
  const yellowCount = MOCK_MEMBERS.filter((m) => m.status === 'yellow').length;
  const greenCount = MOCK_MEMBERS.filter((m) => m.status === 'green').length;
  const pendingMeals = MOCK_MEALS.filter((m) => m.pending).length;
  const unreadNotifications = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const filteredMembers = MOCK_MEMBERS.filter((m) => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const matchesSearch =
      searchQuery === '' ||
      m.name.includes(searchQuery) ||
      m.lastSession.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const selectedMember =
    MOCK_MEMBERS.find((m) => m.id === selectedMemberId) ?? MOCK_MEMBERS[0];

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSendAlert = (name: string) => {
    showToast(`${name} 회원에게 푸시 알림을 전송했습니다.`);
  };

  const handleCopySession = () => {
    showToast('지난 세션 루틴이 클립보드에 복사되었습니다.');
  };

  const handleMacro = (type: string) => {
    showToast(`점진적 과부하 매크로 적용: ${type}`);
  };

  const handleSendGuide = () => {
    showToast(`${selectedMember.name} 회원에게 운동 가이드를 전송했습니다.`);
  };

  const handleSubmitFeedback = (mealId: string) => {
    const draft = feedbackDrafts[mealId];
    if (!draft?.trim()) return;
    showToast('식단 피드백이 전송되었습니다.');
    setActiveFeedbackId(null);
    setFeedbackDrafts((prev) => ({ ...prev, [mealId]: '' }));
  };

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">FC</span>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <span className="logo">FitCheck</span>
              <span className="logo-sub">Trainer</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <span className="nav-icon">📊</span>
            {!sidebarCollapsed && <span>대시보드</span>}
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">👥</span>
            {!sidebarCollapsed && <span>회원 관리</span>}
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">🏋️</span>
            {!sidebarCollapsed && <span>루틴 관리</span>}
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">🍽️</span>
            {!sidebarCollapsed && <span>식단 피드백</span>}
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">📈</span>
            {!sidebarCollapsed && <span>성장 리포트</span>}
          </a>
        </nav>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main content */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="search"
                placeholder="회원 이름, 운동 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="header-right">
            <span className="header-date">{today}</span>

            <div className="notification-wrapper">
              <button
                type="button"
                className="notification-btn"
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label="알림"
              >
                🔔
                {unreadNotifications > 0 && (
                  <span className="notification-badge">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>알림</span>
                    <span className="notification-count">
                      {unreadNotifications}건 미확인
                    </span>
                  </div>
                  <ul className="notification-list">
                    {MOCK_NOTIFICATIONS.map((n) => (
                      <li
                        key={n.id}
                        className={`notification-item ${n.read ? 'read' : ''}`}
                      >
                        <p>{n.message}</p>
                        <time>{n.time}</time>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="trainer-profile">
              <span className="trainer-avatar">김</span>
              <span className="trainer-name">김트레이너</span>
            </div>
          </div>
        </header>

        {/* Stats bar */}
        <section className="stats-bar">
          <div className="stat-card stat-red">
            <span className="stat-dot" />
            <div>
              <strong>{redCount}</strong>
              <span>주의 필요</span>
            </div>
          </div>
          <div className="stat-card stat-yellow">
            <span className="stat-dot" />
            <div>
              <strong>{yellowCount}</strong>
              <span>관심 필요</span>
            </div>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-dot" />
            <div>
              <strong>{greenCount}</strong>
              <span>정상 관리</span>
            </div>
          </div>
          <div className="stat-card stat-meal">
            <span className="stat-icon">📋</span>
            <div>
              <strong>{pendingMeals}</strong>
              <span>피드백 대기</span>
            </div>
          </div>
        </section>

        {/* Dashboard grid */}
        <main className="dashboard-grid">
          {/* Signal dashboard */}
          <section className="panel signal-panel">
            <div className="panel-header">
              <div>
                <h2>🚦 신호등 소통 대시보드</h2>
                <p>관리 공백 회원을 실시간 포착하고 즉시 알림을 보내세요</p>
              </div>
              <div className="filter-tabs">
                {(['all', 'red', 'yellow', 'green'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`filter-tab ${filter === tab ? 'active' : ''}`}
                    onClick={() => setFilter(tab)}
                  >
                    {tab === 'all' && '전체'}
                    {tab === 'red' && '🔴 주의'}
                    {tab === 'yellow' && '🟡 관심'}
                    {tab === 'green' && '🟢 정상'}
                  </button>
                ))}
              </div>
            </div>

            <ul className="member-list">
              {filteredMembers.length === 0 ? (
                <li className="empty-state">검색 결과가 없습니다.</li>
              ) : (
                filteredMembers.map((member) => (
                  <li
                    key={member.id}
                    className={`member-card status-${member.status}`}
                  >
                    <div className="member-avatar">{member.avatar}</div>
                    <div className="member-info">
                      <div className="member-top">
                        <span className="member-name">{member.name}</span>
                        <span
                          className={`status-badge badge-${member.status}`}
                        >
                          {STATUS_LABEL[member.status]}
                        </span>
                      </div>
                      <p className="member-meta">
                        {member.daysSinceContact === 0
                          ? '오늘 소통함'
                          : `${member.daysSinceContact}일간 무응답`}
                        {' · '}
                        {member.lastSession}
                      </p>
                    </div>
                    <div className="member-actions">
                      {member.status !== 'green' && (
                        <button
                          type="button"
                          className={`btn-action btn-${member.status}`}
                          onClick={() => handleSendAlert(member.name)}
                        >
                          {member.status === 'red'
                            ? '푸시 알림'
                            : '메시지 보내기'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-select"
                        onClick={() => setSelectedMemberId(member.id)}
                        aria-label={`${member.name} 루틴 선택`}
                      >
                        루틴 →
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Routine panel */}
          <section className="panel routine-panel">
            <div className="panel-header">
              <div>
                <h2>⚡ 초간편 루틴 입력</h2>
                <p>지난 세션 복사 &amp; 점진적 과부하로 초고속 가이드 전송</p>
              </div>
            </div>

            <div className="routine-member-select">
              <label htmlFor="member-select">회원 선택</label>
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                {MOCK_MEMBERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-copy-session"
              onClick={handleCopySession}
            >
              📋 지난 세션 복사
            </button>

            <div className="macro-buttons">
              <span className="macro-label">점진적 과부하 매크로</span>
              <div className="macro-row">
                <button
                  type="button"
                  className="btn-macro"
                  onClick={() => handleMacro('+2.5kg')}
                >
                  +2.5kg
                </button>
                <button
                  type="button"
                  className="btn-macro"
                  onClick={() => handleMacro('+1세트')}
                >
                  +1세트
                </button>
                <button
                  type="button"
                  className="btn-macro"
                  onClick={() => handleMacro('+2 reps')}
                >
                  +2 reps
                </button>
              </div>
            </div>

            <div className="routine-preview">
              <h3>{selectedMember.name} — 지난 세션 미리보기</h3>
              <ul>
                {ROUTINE_PREVIEW.map((item) => (
                  <li key={item.exercise}>
                    <span className="exercise-name">{item.exercise}</span>
                    <span className="exercise-detail">
                      {item.weight} · {item.sets}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="btn-send-guide"
              onClick={handleSendGuide}
            >
              가이드 전송 →
            </button>
          </section>

          {/* Meal timeline */}
          <section className="panel meal-panel">
            <div className="panel-header">
              <div>
                <h2>🍽️ 식단 피드백 타임라인</h2>
                <p>회원이 업로드한 일별 식단을 한눈에 보고 즉각 피드백하세요</p>
              </div>
              <span className="pending-badge">
                피드백 대기 {pendingMeals}건
              </span>
            </div>

            <div className="meal-scroll">
              {MOCK_MEALS.map((meal) => (
                <article key={meal.id} className="meal-card">
                  <div className="meal-photo">
                    <span className="meal-photo-placeholder">📷</span>
                  </div>
                  <div className="meal-body">
                    <div className="meal-header">
                      <span className="meal-avatar">{meal.memberAvatar}</span>
                      <div>
                        <strong>{meal.memberName}</strong>
                        <span className="meal-time">
                          {meal.mealType} · {meal.time}
                        </span>
                      </div>
                      {meal.pending && (
                        <span className="meal-pending-dot" title="피드백 대기" />
                      )}
                    </div>
                    <p className="meal-memo">{meal.memo}</p>

                    {activeFeedbackId === meal.id ? (
                      <div className="feedback-form">
                        <textarea
                          placeholder="피드백을 입력하세요..."
                          value={feedbackDrafts[meal.id] ?? ''}
                          onChange={(e) =>
                            setFeedbackDrafts((prev) => ({
                              ...prev,
                              [meal.id]: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                        <div className="feedback-actions">
                          <button
                            type="button"
                            className="btn-feedback-send"
                            onClick={() => handleSubmitFeedback(meal.id)}
                          >
                            전송
                          </button>
                          <button
                            type="button"
                            className="btn-feedback-cancel"
                            onClick={() => setActiveFeedbackId(null)}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-feedback"
                        onClick={() => setActiveFeedbackId(meal.id)}
                      >
                        {meal.pending ? '피드백 작성' : '추가 피드백'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
