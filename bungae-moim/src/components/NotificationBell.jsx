import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchNotifications, markNotificationsRead } from '../api/notifications.js'

// 알림 문구는 서버가 아니라 여기서 고른다(서버는 type만 저장한다).
const LABELS = {
  new_application: '새 신청이 들어왔어요',
  application_approved: '신청이 승인됐어요',
  application_rejected: '신청이 거절됐어요',
  meeting_cancelled: '모임이 취소됐어요',
}

// createdAt은 서버의 timestamp(타임존 없음)를 pg가 로컬 시각으로 파싱해 내려준 값이다.
// 앱·DB 세션 타임존이 Asia/Seoul로 맞춰져 있다는 전제는 목록의 isPast와 동일하다.
function formatRelative(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const rootRef = useRef(null)

  // 폴링하지 않는다. 라우트가 바뀔 때마다 한 번씩만 다시 받아온다(설계 결정).
  useEffect(() => {
    let cancelled = false
    fetchNotifications()
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {
        // 알림은 부가 기능이다. 실패해도 헤더가 깨지지 않게 조용히 넘어간다.
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  // 패널 밖 클릭 / Esc로 닫는다.
  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // 목록을 여는 순간 그 시점의 미읽음을 전부 읽음 처리한다(개별 읽음 없음).
  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0) {
      setUnreadCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      markNotificationsRead().catch(() => {
        // 실패하면 다음 라우트 이동 때 서버 값으로 되돌아온다.
      })
    }
  }

  function openMeeting(meetingId) {
    setOpen(false)
    navigate(`/meetings/${meetingId}`)
  }

  return (
    <div className="notif" ref={rootRef}>
      <button
        type="button"
        className="notif-button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : '알림'}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="알림">
          {items.length === 0 ? (
            <p className="notif-empty">새 알림이 없어요.</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif-item${n.isRead ? '' : ' is-unread'}`}
                    onClick={() => openMeeting(n.meetingId)}
                  >
                    <span className="notif-item-title">{LABELS[n.type] ?? '새 소식이 있어요'}</span>
                    <span className="notif-item-meta">
                      {n.meetingTitle} · {formatRelative(n.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
