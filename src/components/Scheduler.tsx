import { useState } from 'react'
import { logout as logoutRequest, type AuthUser } from '../auth/authClient'
import { BottomNavigation } from './scheduler/BottomNavigation'
import { CalendarView } from './scheduler/CalendarView'
import { GroupManagerView } from './scheduler/GroupManagerView'
import { FriendsView, MyHomeView, ProfileView } from './scheduler/StaticViews'
import type { AppTab, FriendPost } from './scheduler/types'
import { useFriendsManager } from './scheduler/useFriendsManager'
import { useScheduleManager } from './scheduler/useScheduleManager'
import './scheduler.css'

type SchedulerProps = {
  user: AuthUser
  onLogout: () => void
}

export function Scheduler({ user, onLogout }: SchedulerProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('calendar')
  const [dodoMessage, setDodoMessage] = useState('오늘 일정 하나만 더 하면 같이 놀 수 있어!')
  const [selectedOwner, setSelectedOwner] = useState('me')
  const [myPosts, setMyPosts] = useState<FriendPost[]>([])
  const [showGroupManager, setShowGroupManager] = useState(false)
  const scheduleManager = useScheduleManager()
  const friendsManager = useFriendsManager()

  const addMyPost = (post: FriendPost) => {
    setMyPosts((current) => [post, ...current])
  }

  const deleteMyPost = (postId: number) => {
    setMyPosts((current) => current.filter((post) => post.id !== postId))
  }

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab)
    setMenuOpen(false)
    setShowGroupManager(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToMyCalendar = () => {
    setActiveTab('calendar')
    setSelectedOwner('me')
    setMenuOpen(false)
  }

  const goToFriendCalendar = (friendId: string) => {
    setActiveTab('calendar')
    setSelectedOwner(friendId)
  }

  return (
    <main className="scheduler-page">
      <BottomNavigation activeTab={activeTab} onChange={changeTab} onAdd={goToMyCalendar} />

      <div className="scheduler-content">
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
              <button type="button" onClick={goToMyCalendar}>내 일정만 보기</button>
              <button type="button">알림 설정</button>
              <button type="button" onClick={() => changeTab('home')}>두두의 마이홈</button>
              <button type="button" onClick={() => { logoutRequest(); onLogout() }}>{user.name}님 로그아웃</button>
            </div>
          )}
        </header>

        {activeTab === 'calendar' && (
          <CalendarView
            manager={scheduleManager}
            friends={friendsManager.friends}
            groups={friendsManager.groups}
            selectedOwner={selectedOwner}
            onSelectOwner={setSelectedOwner}
            onCertify={addMyPost}
          />
        )}
        {activeTab === 'home' && <MyHomeView message={dodoMessage} onInteract={setDodoMessage} />}
        {activeTab === 'friends' && (
          <FriendsView
            manager={friendsManager}
            myPosts={myPosts}
            onDeletePost={deleteMyPost}
            onViewFriendCalendar={goToFriendCalendar}
          />
        )}
        {activeTab === 'profile' && (
          showGroupManager ? (
            <GroupManagerView manager={friendsManager} onBack={() => setShowGroupManager(false)} />
          ) : (
            <ProfileView onOpenGroupManager={() => setShowGroupManager(true)} />
          )
        )}
      </div>
    </main>
  )
}
