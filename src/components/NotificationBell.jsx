import { useState, useEffect, useRef, useCallback } from 'react'
import { api, apiPost, timeAgo } from '../api/client'
import './NotificationBell.css'

const NOTIF_ICON = { join: '👋', reveal: '📢', swap: '🔄', upload: '📎' }

// 알림 문구 — 대시보드 activityText와 같은 규칙(개인 응답 노출 없이 팀 이벤트 서술)
function notifText(n) {
  const p = n.payload ?? {}
  switch (n.type) {
    case 'join':
      return `${p.nickname ?? '새 팀원'}님이 팀에 합류했습니다.`
    case 'reveal':
      return '역할 배정 결과가 공개되었습니다.'
    case 'swap':
      return '역할이 교환되었습니다.'
    case 'upload':
      return `${p.by ?? '팀원'}님이 "${p.task ?? '태스크'}"에 자료를 올렸습니다.`
    default:
      return '새 소식이 있습니다.'
  }
}

export default function NotificationBell() {
  const [data, setData] = useState({ unreadCount: 0, items: [] })
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const load = useCallback(() => {
    api('/api/me/notifications')
      .then(setData)
      .catch(() => {}) // 조용히 무시 — 다음 폴링에서 복구
  }, [])

  // 마운트 + 45초 폴링으로 배지 갱신
  useEffect(() => {
    load()
    const id = setInterval(load, 45000)
    return () => clearInterval(id)
  }, [load])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    // 열 때 모두 읽음 처리 (배지는 낙관적으로 즉시 제거)
    if (next && data.unreadCount > 0) {
      setData((d) => ({ ...d, unreadCount: 0 }))
      try {
        await apiPost('/api/me/notifications/read-all')
      } catch {
        // 실패해도 다음 load에서 복구
      }
      load()
    }
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button type="button" className="icon-btn" aria-label="알림" onClick={toggle}>🔔</button>
      {data.unreadCount > 0 && (
        <span className="bell-badge">{data.unreadCount > 9 ? '9+' : data.unreadCount}</span>
      )}
      {open && (
        <div className="notif-panel">
          <div className="notif-head">알림</div>
          {data.items.length === 0 ? (
            <p className="notif-empty">새 알림이 없습니다.</p>
          ) : (
            <ul className="notif-list">
              {data.items.map((n) => (
                <li key={n.id} className={`notif-item${n.isRead ? '' : ' unread'}`}>
                  <span className="notif-icon" aria-hidden="true">{NOTIF_ICON[n.type] ?? '•'}</span>
                  <div className="notif-body">
                    <p className="notif-text">{notifText(n)}</p>
                    <p className="notif-meta">
                      {n.projectTitle ? `${n.projectTitle} · ` : ''}{timeAgo(n.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
