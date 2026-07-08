import { useState } from 'react'
import { BottomNavigation } from './scheduler/BottomNavigation'
import { CalendarView } from './scheduler/CalendarView'
import { FriendsView, MyHomeView, ProfileView } from './scheduler/StaticViews'
import type { AppTab } from './scheduler/types'
import { useScheduleManager } from './scheduler/useScheduleManager'
import './scheduler.css'

export function Scheduler() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('calendar')
  const [dodoMessage, setDodoMessage] = useState('오늘 일정 하나만 더 하면 같이 놀 수 있어!')
  const scheduleManager = useScheduleManager()

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addPersonalSchedule = () => {
    setActiveTab('calendar')
    setMenuOpen(false)
    scheduleManager.addPersonalSchedule()
  }

  return (
    <main className="scheduler-page">
      <header className="scheduler-header">
        <a
          className="scheduler-brand"
          href="#calendar"
          aria-label="We should do 스케줄러 홈"
          onClick={(event) => {
            event.preventDefault()
            changeTab('calendar')
          }}
        >
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

      {activeTab === 'calendar' && <CalendarView manager={scheduleManager} />}
      {activeTab === 'home' && <MyHomeView message={dodoMessage} onInteract={setDodoMessage} />}
      {activeTab === 'friends' && <FriendsView />}
      {activeTab === 'profile' && <ProfileView />}

      <BottomNavigation activeTab={activeTab} onChange={changeTab} onAdd={addPersonalSchedule} />
    </main>
  )
}
