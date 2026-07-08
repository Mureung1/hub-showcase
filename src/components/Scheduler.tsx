import { useMemo, useState } from 'react'
import './scheduler.css'

type GroupTone = 'blue' | 'violet' | 'green' | 'coral'
type AppTab = 'calendar' | 'home' | 'friends' | 'profile'
type CategoryId = 'all' | 'study' | 'exercise' | 'appointment' | 'personal'
type ScheduleCategoryId = Exclude<CategoryId, 'all'>
type ShareGroup = '절친' | '스터디' | '가족' | '커플'

type Category = {
  id: ScheduleCategoryId
  name: string
  color: string
  tone: GroupTone
  visibleTo: ShareGroup[]
}

type Schedule = {
  id: number
  date: string
  title: string
  time: string
  category: ScheduleCategoryId
  tone: GroupTone
}

const friends: Array<{ id: string; name: string; color: string; eyes: 1 | 2 }> = [
  { id: 'min', name: '민수', color: '#a9c8ec', eyes: 1 },
  { id: 'yu', name: '유진', color: '#c7b7e7', eyes: 2 },
  { id: 'study', name: '스터디 멤버', color: '#a9cfbd', eyes: 2 },
]

const initialCategories: Category[] = [
  { id: 'study', name: '공부', color: '#98bce7', tone: 'blue', visibleTo: ['스터디'] },
  { id: 'exercise', name: '운동', color: '#f2a58d', tone: 'coral', visibleTo: ['절친'] },
  { id: 'appointment', name: '약속', color: '#b8a6de', tone: 'violet', visibleTo: ['절친', '커플'] },
  { id: 'personal', name: '기타', color: '#8fbdab', tone: 'green', visibleTo: [] },
]

const shareGroups: ShareGroup[] = ['절친', '스터디', '가족', '커플']

const initialSchedules: Schedule[] = [
  { id: 1, date: '2026-07-07', title: '저녁 운동', time: '19:00', category: 'exercise', tone: 'coral' },
  { id: 2, date: '2026-07-10', title: '포트폴리오 정리', time: '14:00', category: 'study', tone: 'blue' },
  { id: 3, date: '2026-07-17', title: '성수 팝업', time: '18:30', category: 'appointment', tone: 'violet' },
  { id: 4, date: '2026-07-26', title: '7월 돌아보기', time: '21:00', category: 'personal', tone: 'green' },
  { id: 5, date: '2026-07-08', title: '헬스', time: '20:00', category: 'exercise', tone: 'coral' },
  { id: 6, date: '2026-07-14', title: '영어 공부', time: '20:30', category: 'study', tone: 'blue' },
  { id: 7, date: '2026-07-22', title: '러닝', time: '07:30', category: 'exercise', tone: 'coral' },
  { id: 8, date: '2026-07-23', title: '주간 스터디', time: '19:30', category: 'study', tone: 'blue' },
]

const weekLabels = ['일', '월', '화', '수', '목', '금', '토']

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function PixelAvatar({ color, eyes }: { color: string; eyes: 1 | 2 }) {
  return (
    <span className="scheduler-avatar" style={{ '--avatar': color } as React.CSSProperties} aria-hidden="true">
      <i className={eyes === 1 ? 'one-eye' : ''} />
      {eyes === 2 && <i />}
    </span>
  )
}

function CategoryIcon({ tone, all = false }: { tone: GroupTone; all?: boolean }) {
  return (
    <span className={`category-filter-icon ${tone} ${all ? 'all' : ''}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  )
}

function MyHomeView({ message, onInteract }: { message: string; onInteract: (message: string) => void }) {
  return (
    <section className="myhome-view" aria-labelledby="myhome-title">
      <div className="tab-page-heading">
        <div><span>MY LITTLE ROOM</span><h1 id="myhome-title">두두의 마이홈</h1></div>
        <div className="myhome-points"><i>✦</i><strong>120</strong><span>포인트</span></div>
      </div>

      <div className="myhome-room">
        <div className="myhome-window" aria-hidden="true"><i /><i /><i /></div>
        <div className="myhome-wall-star" aria-hidden="true" />
        <div className="myhome-shelf" aria-hidden="true"><i /><i /></div>
        <div className="myhome-rug" aria-hidden="true" />
        <div className="myhome-message" role="status">{message}</div>

        <div className="home-dodo" aria-label="마이홈에 있는 두두">
          <div className="home-dodo-body">
            <i className="home-dodo-eye left" />
            <i className="home-dodo-eye right" />
            <span className="home-dodo-cheek left" />
            <span className="home-dodo-cheek right" />
            <span className="home-dodo-mouth" />
          </div>
          <i className="home-dodo-leg left" />
          <i className="home-dodo-leg right" />
        </div>

        <div className="myhome-plant" aria-hidden="true"><i /><i /><i /></div>
      </div>

      <div className="dodo-status-card">
        <div><span>오늘의 두두</span><strong>기분이 말랑해요</strong></div>
        <div className="mood-pixels" aria-label="기분 4단계 중 3단계"><i /><i /><i /><i /></div>
      </div>

      <div className="myhome-actions" aria-label="두두와 상호작용">
        <button type="button" onClick={() => onInteract('두두가 기분 좋게 눈을 깜빡였어요!')}><i className="action-pat" />쓰다듬기</button>
        <button type="button" onClick={() => onInteract('두두가 간식을 냠냠 먹었어요.')}><i className="action-snack" />간식 주기</button>
        <button type="button" onClick={() => onInteract('새로운 옷을 고르러 가볼까요?')}><i className="action-dress" />꾸미기</button>
      </div>
    </section>
  )
}

function FriendsView() {
  return (
    <section className="friends-view" aria-labelledby="friends-title">
      <div className="tab-page-heading">
        <div><span>TOGETHER</span><h1 id="friends-title">내 친구</h1></div>
        <button type="button" className="page-add-button">+</button>
      </div>
      <div className="friend-list">
        {friends.map((friend, index) => (
          <article key={friend.id}>
            <PixelAvatar color={friend.color} eyes={friend.eyes} />
            <div><strong>{friend.name}</strong><span>{index === 2 ? '스터디 멤버 4명' : `함께한 일정 ${8 - index}개`}</span></div>
            <button type="button">일정 보기</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProfileView() {
  return (
    <section className="profile-view" aria-labelledby="profile-title">
      <div className="tab-page-heading">
        <div><span>MY PROFILE</span><h1 id="profile-title">마이</h1></div>
        <button type="button" className="profile-settings" aria-label="프로필 설정">•••</button>
      </div>
      <div className="profile-card">
        <div className="profile-avatar"><PixelAvatar color="#f2a58d" eyes={2} /><i>7</i></div>
        <div><h2>금소현</h2><p>@dodo_day · 오늘도 하나씩 해내는 중</p></div>
        <button type="button">프로필 편집</button>
      </div>
      <div className="profile-stats">
        <article><strong>7</strong><span>연속 달성</span></article>
        <article><strong>24</strong><span>완료한 일</span></article>
        <article><strong>6</strong><span>친구</span></article>
      </div>
      <div className="profile-menu">
        <button type="button"><i className="profile-record" /><span><strong>나의 기록</strong><small>완료한 일정과 두두의 일기</small></span><b>›</b></button>
        <button type="button"><i className="profile-lock" /><span><strong>공개 범위</strong><small>친구별 일정 공개 설정</small></span><b>›</b></button>
        <button type="button"><i className="profile-bell" /><span><strong>알림 설정</strong><small>일정과 친구 반응 알림</small></span><b>›</b></button>
      </div>
    </section>
  )
}

export function Scheduler() {
  const [category, setCategory] = useState<CategoryId>('all')
  const [categories, setCategories] = useState(initialCategories)
  const [viewDate, setViewDate] = useState(() => new Date(2026, 6, 1))
  const [selectedDay, setSelectedDay] = useState(7)
  const [schedules, setSchedules] = useState(initialSchedules)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState<AppTab>('calendar')
  const [dodoMessage, setDodoMessage] = useState('오늘 일정 하나만 더 하면 같이 놀 수 있어!')
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false)

  const year = viewDate.getFullYear()
  const monthIndex = viewDate.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const selectedKey = dateKey(year, monthIndex, selectedDay)

  const calendarDays = useMemo(
    () => [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)],
    [daysInMonth, firstWeekday],
  )

  const filteredSchedules = category === 'all'
    ? schedules
    : schedules.filter((schedule) => schedule.category === category)
  const selectedSchedules = filteredSchedules.filter((schedule) => schedule.date === selectedKey)
  const selectedCategoryName = category === 'all'
    ? '전체'
    : categories.find((item) => item.id === category)?.name ?? '전체'

  const moveMonth = (offset: number) => {
    setViewDate(new Date(year, monthIndex + offset, 1))
    setSelectedDay(1)
    setNotice('')
  }

  const addQuickSchedule = (selectedCategory: Category) => {
    const nextSchedule: Schedule = {
      id: Date.now(),
      date: selectedKey,
      title: `${selectedCategory.name} 일정`,
      time: '시간 미정',
      category: selectedCategory.id,
      tone: selectedCategory.tone,
    }

    setSchedules((current) => [...current, nextSchedule])
    setCategory(selectedCategory.id)
    setNotice(`${monthIndex + 1}월 ${selectedDay}일에 ${selectedCategory.name} 일정을 추가했어요.`)
  }

  const toggleVisibleGroup = (categoryId: ScheduleCategoryId, group: ShareGroup) => {
    setCategories((current) => current.map((item) => {
      if (item.id !== categoryId) return item
      const visibleTo = item.visibleTo.includes(group)
        ? item.visibleTo.filter((name) => name !== group)
        : [...item.visibleTo, group]
      return { ...item, visibleTo }
    }))
  }

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="scheduler-page">
      <header className="scheduler-header">
        <a className="scheduler-brand" href="#calendar" aria-label="We should do 스케줄러 홈" onClick={(event) => { event.preventDefault(); changeTab('calendar') }}>
          <span className="scheduler-logo" aria-hidden="true"><i /><i /></span>
          <span>We should do<em>..</em></span>
        </a>
        <button
          type="button"
          className={`scheduler-menu-button ${menuOpen ? 'open' : ''}`}
          aria-label="메뉴 열기"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i /><i /><i />
        </button>
        {menuOpen && (
          <div className="scheduler-menu-card">
            <button type="button">내 일정만 보기</button>
            <button type="button">알림 설정</button>
            <button type="button" onClick={() => changeTab('home')}>두두의 마이홈</button>
          </div>
        )}
      </header>

      {activeTab === 'calendar' && <>
      <section className="owner-strip category-strip" aria-label="일정 카테고리 선택">
        <button
          type="button"
          className={category === 'all' ? 'active' : ''}
          aria-pressed={category === 'all'}
          onClick={() => { setCategory('all'); setNotice('') }}
        >
          <CategoryIcon tone="green" all />
          <span><strong>전체</strong><small>모든 일정</small></span>
        </button>
        {categories.map((item) => (
          <button
            type="button"
            key={item.id}
            className={category === item.id ? 'active' : ''}
            aria-pressed={category === item.id}
            onClick={() => {
              setCategory(item.id)
              setNotice('')
            }}
          >
            <CategoryIcon tone={item.tone} />
            <span><strong>{item.name}</strong><small>{item.visibleTo.length ? `${item.visibleTo.length}개 그룹 공개` : '나만 보기'}</small></span>
          </button>
        ))}
      </section>

      <section className="calendar-card" id="calendar">
        <div className="calendar-heading">
          <div>
            <span className="calendar-kicker">MONTHLY PLAN</span>
            <h1>{year}년 {monthIndex + 1}월</h1>
          </div>
          <div className="month-controls">
            <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>←</button>
            <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>→</button>
          </div>
        </div>

        <div className="weekday-row" aria-hidden="true">
          {weekLabels.map((label) => <span key={label}>{label}</span>)}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            if (!day) return <span className="empty-day" key={`empty-${index}`} />
            const key = dateKey(year, monthIndex, day)
            const daySchedules = filteredSchedules.filter((schedule) => schedule.date === key)
            const weekday = index % 7
            const isSelected = selectedDay === day

            return (
              <button
                type="button"
                key={key}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${weekday === 0 ? 'sunday' : ''} ${weekday === 6 ? 'saturday' : ''}`}
                aria-label={`${monthIndex + 1}월 ${day}일, 일정 ${daySchedules.length}개`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedDay(day)
                  setNotice('')
                }}
              >
                <span className="day-markers">
                  {daySchedules.slice(0, 2).map((schedule) => (
                    <i className={`day-marker ${schedule.tone}`} key={schedule.id} />
                  ))}
                </span>
                <span className="day-number">{day}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="selected-agenda" aria-live="polite">
        <div className="agenda-title">
          <div>
            <span>{monthIndex + 1}월 {selectedDay}일</span>
            <h2>{selectedCategoryName} 일정</h2>
          </div>
          <span className="agenda-count">{selectedSchedules.length}</span>
        </div>
        {selectedSchedules.length > 0 ? (
          <div className="agenda-list">
            {selectedSchedules.map((schedule) => (
              <article key={schedule.id}>
                <i className={schedule.tone} />
                <div>
                  <strong>{schedule.title}</strong>
                  <span>{categories.find((item) => item.id === schedule.category)?.name ?? '개인'} · {categories.find((item) => item.id === schedule.category)?.visibleTo.join(', ') || '나만 보기'}</span>
                </div>
                <time>{schedule.time}</time>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-agenda">아직 일정이 없어요. 아래 그룹에서 빠르게 추가해보세요.</p>
        )}
      </section>

      <section className="quick-groups" aria-labelledby="quick-group-title">
        <div className="quick-group-heading">
          <div><span>QUICK ADD</span><h2 id="quick-group-title">내 카테고리</h2></div>
          <button type="button" onClick={() => setCategorySettingsOpen((open) => !open)} aria-expanded={categorySettingsOpen}>공개 설정</button>
        </div>
        <div className="quick-group-list">
          {categories.map((item) => (
            <article key={item.id}>
              <span className={`group-pixel-icon ${item.tone}`} aria-hidden="true"><i /><i /></span>
              <div><strong>{item.name}</strong><small>{item.visibleTo.length ? item.visibleTo.join(' · ') : '나만 보기'}</small></div>
              <button type="button" aria-label={`${item.name} 일정 추가`} onClick={() => addQuickSchedule(item)}>+</button>
            </article>
          ))}
        </div>
        {categorySettingsOpen && (
          <div className="category-settings" role="dialog" aria-modal="false" aria-labelledby="category-settings-title">
            <div className="category-settings-heading">
              <div><span>CATEGORY SHARE</span><h3 id="category-settings-title">카테고리 공개 그룹</h3></div>
              <button type="button" aria-label="카테고리 설정 닫기" onClick={() => setCategorySettingsOpen(false)}>×</button>
            </div>
            <p>카테고리별 일정이 보이는 친구 그룹을 선택하세요. 아무것도 선택하지 않으면 나만 볼 수 있어요.</p>
            <div className="category-settings-list">
              {categories.map((item) => (
                <article key={item.id}>
                  <div className="category-settings-name"><CategoryIcon tone={item.tone} /><strong>{item.name}</strong></div>
                  <div className="visibility-options" aria-label={`${item.name} 공개 그룹`}>
                    {shareGroups.map((group) => (
                      <button
                        type="button"
                        key={group}
                        className={item.visibleTo.includes(group) ? 'active' : ''}
                        aria-pressed={item.visibleTo.includes(group)}
                        onClick={() => toggleVisibleGroup(item.id, group)}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        {notice && <p className="scheduler-notice" role="status">{notice}</p>}
      </section>
      </>}

      {activeTab === 'home' && <MyHomeView message={dodoMessage} onInteract={setDodoMessage} />}
      {activeTab === 'friends' && <FriendsView />}
      {activeTab === 'profile' && <ProfileView />}

      <nav className="scheduler-bottom-nav" aria-label="주요 메뉴">
        <button type="button" className={activeTab === 'calendar' ? 'active' : ''} aria-pressed={activeTab === 'calendar'} onClick={() => changeTab('calendar')}><i className="nav-calendar" /><span>캘린더</span></button>
        <button type="button" className={activeTab === 'home' ? 'active' : ''} aria-pressed={activeTab === 'home'} onClick={() => changeTab('home')}><i className="nav-room" /><span>마이홈</span></button>
        <button type="button" className="nav-add" aria-label="새 일정 추가" onClick={() => changeTab('calendar')}><i>+</i></button>
        <button type="button" className={activeTab === 'friends' ? 'active' : ''} aria-pressed={activeTab === 'friends'} onClick={() => changeTab('friends')}><i className="nav-friends" /><span>친구</span></button>
        <button type="button" className={activeTab === 'profile' ? 'active' : ''} aria-pressed={activeTab === 'profile'} onClick={() => changeTab('profile')}><i className="nav-profile" /><span>마이</span></button>
      </nav>
    </main>
  )
}
