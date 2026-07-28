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

// createdAt은 서버의 timestamp(타임존 없음)를 pg가 Node 프로세스 로컬 시각으로 파싱해
// 내려준 값이다. isPast(목록)는 SQL now()로 계산되어 DB 세션 타임존만 쓰지만, 이 값은
// Node 프로세스 TZ에 의존한다 — 별개의 전제다. 배포 환경의 TZ=Asia/Seoul 설정이 전제이며,
// 같은 전제를 utils/date.js의 모임 시각 표시도 공유한다(TZ 없으면 9시간 이내는 전부 "방금 전").
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
  const openRequestRef = useRef(0)

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

  // 컴포넌트가 사라지면 그 시점에 열기 도중이던 재조회 요청도 무효화한다(setState 누수 방지).
  useEffect(() => {
    return () => {
      openRequestRef.current += 1
    }
  }, [])

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

  // 패널을 여는 순간 먼저 최신 목록을 재조회하고, 그 결과 기준으로 미읽음이 있으면
  // 읽음 처리한다(개별 읽음 없음). 마지막 라우트 이동 이후 도착한 알림이 뱃지로 한 번도
  // 안 보인 채 읽음 처리되는 것을 막기 위한 재조회다 — 폴링은 아니고, 여는 동작이 트리거다.
  function toggle() {
    const next = !open
    setOpen(next)
    if (!next) {
      // 닫을 때는 아무 요청도 보내지 않는다. 열기 도중이던 요청이 있었다면 무효화한다.
      openRequestRef.current += 1
      return
    }

    const requestId = ++openRequestRef.current
    fetchNotifications()
      .then((data) => {
        // 그 사이 닫히거나(위에서 증가) 다시 열리거나(새 requestId 발급) 언마운트됐으면
        // (unmount cleanup에서 증가) 이 결과는 낡은 것이므로 버린다.
        if (openRequestRef.current !== requestId) return

        if (data.unreadCount > 0) {
          // 낙관적 읽음 처리는 반드시 방금 받은 최신 items에 적용한다(낡은 items 아님).
          setItems(data.items.map((n) => ({ ...n, isRead: true })))
          setUnreadCount(0)
          markNotificationsRead().catch(() => {
            // 실패해도 화면은 이미 낙관적으로 읽음 처리했다. 다음에 열 때 서버 값으로 다시 맞춰진다.
          })
        } else {
          setItems(data.items)
          setUnreadCount(0)
        }
      })
      .catch(() => {
        // 재조회 실패 — 모르는 것을 읽음 처리하지 않는다. 읽음 요청도 보내지 않고
        // 마지막으로 알던 목록을 그대로 보여준다(패널은 이미 열려 있다).
      })
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
