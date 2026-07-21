import type { AppTab } from './types'

type BottomNavigationProps = {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
  onAdd: () => void
}

export function BottomNavigation({ activeTab, onChange, onAdd }: BottomNavigationProps) {
  return (
    <nav className="scheduler-bottom-nav" aria-label="주요 메뉴">
      <button type="button" className={activeTab === 'calendar' ? 'active' : ''} aria-pressed={activeTab === 'calendar'} onClick={() => onChange('calendar')}><i className="nav-calendar" /><span>캘린더</span></button>
      <button type="button" className={activeTab === 'home' ? 'active' : ''} aria-pressed={activeTab === 'home'} onClick={() => onChange('home')}><i className="nav-room" /><span>마이홈</span></button>
      <button type="button" className="nav-add" aria-label="선택한 날짜에 새 일정 추가" onClick={onAdd}><i>+</i><span>내 일정</span></button>
      <button type="button" className={activeTab === 'friends' ? 'active' : ''} aria-pressed={activeTab === 'friends'} onClick={() => onChange('friends')}><i className="nav-friends"><i className="nav-friends-face" /><i className="nav-friends-eye left" /><i className="nav-friends-eye right" /></i><span>친구</span></button>
      <button type="button" className={activeTab === 'profile' ? 'active' : ''} aria-pressed={activeTab === 'profile'} onClick={() => onChange('profile')}><i className="nav-profile"><i className="nav-profile-eye left" /><i className="nav-profile-eye right" /></i><span>마이</span></button>
    </nav>
  )
}
