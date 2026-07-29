import { useEffect, useState } from 'react'
import AppFrame from './components/AppFrame'
import ChipFilter from './components/ChipFilter'
import Hero from './components/Hero'
import NotificationList from './components/NotificationList'
import SortIndicator from './components/SortIndicator'
import TabBar from './components/TabBar'
import './App.css'

const categories = ['전체', '장학금', '취업', '학사']

function App() {
  const [notifications, setNotifications] = useState([])
  const [activeFilter, setActiveFilter] = useState('전체')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const today = new Date()

  const loadNotifications = () => {
    setLoading(true)
    setError(null)
    fetch('/api/notifications')
      .then((res) => {
        if (!res.ok) throw new Error('요청 실패')
        return res.json()
      })
      .then(setNotifications)
      .catch(() => setError('알림을 불러오지 못했어요'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  // 완료 처리 — PATCH 응답으로 받은 알림으로 상태 갱신 (MSW는 메모리라 새로고침하면 되살아남)
  const markDone = (id) => {
    fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      .then((res) => res.json())
      .then((updated) => {
        setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      })
  }

  const filteredNotifications =
    activeFilter === '전체'
      ? notifications
      : notifications.filter((n) => n.keywords.includes(activeFilter))

  const urgentCount = notifications.filter((n) => n.priority === 'urgent' && !n.done).length

  return (
    <AppFrame tabBar={<TabBar activeTab="home" />}>
      <Hero urgentCount={urgentCount} today={today} />
      {loading && (
        <div className="status">
          <span className="status-text">불러오는 중...</span>
        </div>
      )}
      {!loading && error && (
        <div className="status">
          <span className="status-text">{error}</span>
          <button type="button" className="status-retry" onClick={loadNotifications}>
            다시 시도
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          <ChipFilter categories={categories} active={activeFilter} onSelect={setActiveFilter} />
          <SortIndicator />
          <NotificationList
            notifications={filteredNotifications}
            onComplete={markDone}
            today={today}
          />
        </>
      )}
    </AppFrame>
  )
}

export default App
