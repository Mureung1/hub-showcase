import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './NotificationsPage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

/*
 * 인앱 알림 목록 (T-13). 푸시 권한을 거부했거나 미지원 브라우저에서도
 * 알림을 확인할 수 있는 폴백 — 알림의 기준 기록은 항상 서버에 남는다.
 */
function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/notifications/me')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.message ?? '알림을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="noti">
      <button type="button" className="noti__back" onClick={() => navigate('/app')}>
        ← 목록
      </button>
      <h1 className="noti__title">알림</h1>

      {loading && <p className="noti__msg">불러오는 중...</p>}
      {error && <p className="noti__msg noti__msg--error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="noti__msg">아직 받은 알림이 없어요. 관심 가게나 카테고리를 설정해보세요.</p>
      )}

      <ul className="noti__list">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="noti__item"
              onClick={() => n.dealId && navigate(`/app/deals/${n.dealId}`)}
            >
              <div className="noti__item-head">
                <b>{n.title}</b>
                <span>{timeOf(n.createdAt)}</span>
              </div>
              <p className="noti__item-body">{n.body}</p>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default NotificationsPage
