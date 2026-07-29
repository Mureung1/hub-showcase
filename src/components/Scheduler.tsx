import { useEffect, useState } from 'react'
import { logout as logoutRequest, type AuthUser } from '../auth/authClient'
import { BottomNavigation } from './scheduler/BottomNavigation'
import { CalendarView } from './scheduler/CalendarView'
import { DiaryView } from './scheduler/DiaryView'
import { DodoCustomizeView } from './scheduler/DodoCustomizeView'
import { DodoOnboardingView } from './scheduler/DodoOnboardingView'
import { FriendHomeView } from './scheduler/FriendHomeView'
import { GroupManagerView } from './scheduler/GroupManagerView'
import { FriendsView, MyHomeView, ProfileView } from './scheduler/StaticViews'
import { formatTimeAgo } from './scheduler/timeAgo'
import type { AppTab, FriendPost } from './scheduler/types'
import { useDodoManager } from './scheduler/useDodoManager'
import { useFriendsManager } from './scheduler/useFriendsManager'
import { useHomeManager } from './scheduler/useHomeManager'
import { useProfileManager } from './scheduler/useProfileManager'
import { useRoomShopManager } from './scheduler/useRoomShopManager'
import { useScheduleManager } from './scheduler/useScheduleManager'
import * as pointsApi from './scheduler/pointsApi'
import * as videosApi from './scheduler/videosApi'
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
  const [friendPosts, setFriendPosts] = useState<FriendPost[]>([])
  const [showGroupManager, setShowGroupManager] = useState(false)
  const [showDiary, setShowDiary] = useState(false)
  const [showDodoCustomize, setShowDodoCustomize] = useState(false)
  const [visitingFriendId, setVisitingFriendId] = useState<string | null>(null)
  const [returnTab, setReturnTab] = useState<AppTab>('friends')
  const scheduleManager = useScheduleManager()
  const friendsManager = useFriendsManager()
  const profileManager = useProfileManager()
  const homeManager = useHomeManager()
  const dodoManager = useDodoManager()
  const roomShopManager = useRoomShopManager(() => profileManager.refreshProfile())

  // 테스트용 — 포인트 소비 흐름(상점 구매 등)을 확인하기 위한 임시 버튼 핸들러.
  const grantTestPoints = () => {
    pointsApi.grantTestPoints().then(() => profileManager.refreshProfile()).catch(() => {})
  }

  useEffect(() => {
    let cancelled = false
    videosApi.fetchMyVideoPosts()
      .then((videos) => {
        if (cancelled) return
        setMyPosts(videos.map((video) => ({
          id: video.id,
          friendId: 'me',
          categoryName: video.categoryName,
          tone: video.tone,
          caption: video.caption ?? '',
          timeAgo: formatTimeAgo(video.createdAt),
          videoUrl: video.url,
          reactions: { sparkle: 0, heart: 0, fire: 0, tear: 0, wow: 0, sleepy: 0 },
        })))
      })
      .catch(() => {})
    videosApi.fetchFriendVideoPosts()
      .then((videos) => {
        if (cancelled) return
        setFriendPosts(videos.map((video) => ({
          id: video.id,
          friendId: video.friendId,
          friendName: video.friendName,
          categoryName: video.categoryName,
          tone: video.tone,
          caption: video.caption ?? '',
          timeAgo: formatTimeAgo(video.createdAt),
          videoUrl: video.url,
          reactions: { sparkle: 0, heart: 0, fire: 0, tear: 0, wow: 0, sleepy: 0 },
        })))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const addMyPost = (post: FriendPost) => {
    setMyPosts((current) => [post, ...current])
  }

  const deleteMyPost = (postId: string) => {
    setMyPosts((current) => current.filter((post) => post.id !== postId))
    videosApi.deleteVideoPost(postId).catch(() => {})
  }

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab)
    setMenuOpen(false)
    setShowGroupManager(false)
    setShowDiary(false)
    setShowDodoCustomize(false)
    setVisitingFriendId(null)
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

  const goToFriendHome = (friendId: string) => {
    setReturnTab(activeTab)
    setActiveTab('home')
    setVisitingFriendId(friendId)
    setMenuOpen(false)
  }

  const exitFriendHome = () => {
    setVisitingFriendId(null)
    setActiveTab(returnTab)
  }

  if (!dodoManager.appearance) return null
  if (!dodoManager.appearance.onboarded) {
    return (
      <DodoOnboardingView
        appearance={dodoManager.appearance}
        onComplete={dodoManager.updateAppearance}
        onLogout={() => { logoutRequest(); onLogout() }}
      />
    )
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
            onCertify={(post) => { addMyPost(post); dodoManager.refreshDodoState() }}
            onPointsEarned={() => { profileManager.refreshProfile(); dodoManager.refreshDodoState() }}
          />
        )}
        {activeTab === 'home' && (
          visitingFriendId ? (
            <FriendHomeView
              friendId={visitingFriendId}
              friendName={friendsManager.friends.find((friend) => friend.id === visitingFriendId)?.name ?? '친구'}
              onBack={exitFriendHome}
            />
          ) : (
            <MyHomeView
              message={dodoMessage}
              onInteract={setDodoMessage}
              homeManager={homeManager}
              dodoManager={dodoManager}
              shopManager={roomShopManager}
              points={profileManager.profile?.stats.points ?? 0}
              onTestGrantPoints={grantTestPoints}
            />
          )
        )}
        {activeTab === 'friends' && (
          <FriendsView
            manager={friendsManager}
            myPosts={myPosts}
            friendPosts={friendPosts}
            currentUserId={user.id}
            onDeletePost={deleteMyPost}
            onViewFriendCalendar={goToFriendCalendar}
            onVisitFriendHome={goToFriendHome}
            onPointsEarned={() => { profileManager.refreshProfile(); dodoManager.refreshDodoState() }}
          />
        )}
        {activeTab === 'profile' && (
          showDiary ? (
            <DiaryView onBack={() => setShowDiary(false)} />
          ) : showGroupManager ? (
            <GroupManagerView manager={friendsManager} onBack={() => setShowGroupManager(false)} />
          ) : showDodoCustomize ? (
            <DodoCustomizeView
              appearance={dodoManager.appearance}
              onSave={dodoManager.updateAppearance}
              onBack={() => setShowDodoCustomize(false)}
            />
          ) : (
            <ProfileView
              manager={profileManager}
              onOpenGroupManager={() => setShowGroupManager(true)}
              onOpenDiary={() => setShowDiary(true)}
              onOpenDodoCustomize={() => setShowDodoCustomize(true)}
            />
          )
        )}
      </div>
    </main>
  )
}
