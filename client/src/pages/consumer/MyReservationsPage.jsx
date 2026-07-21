import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './MyReservationsPage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

const STATUS_LABEL = {
  reserved: '예약 완료',
  picked: '픽업 완료',
  expired: '만료',
}

/*
 * M4 내 예약 목록 (T-09). 예약별 픽업코드를 제시할 수 있다.
 * 상태: reserved(픽업 대기) / picked(수령 완료) / expired(만료, T-14)
 */
function MyReservationsPage() {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/reservations/me')
      .then((res) => setReservations(res.data))
      .catch((err) => setError(err.response?.data?.message ?? '예약을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="my-rsv">
      <button type="button" className="my-rsv__back" onClick={() => navigate('/app')}>
        ← 목록
      </button>
      <h1 className="my-rsv__title">내 예약</h1>

      {loading && <p className="my-rsv__msg">불러오는 중...</p>}
      {error && <p className="my-rsv__msg my-rsv__msg--error">{error}</p>}

      {!loading && !error && reservations.length === 0 && (
        <p className="my-rsv__msg">아직 예약한 상품이 없어요. 근처 마감 할인을 확인해보세요.</p>
      )}

      <ul className="my-rsv__list">
        {reservations.map((r) => (
          <li key={r.id} className={`rsv-card rsv-card--${r.status}`}>
            <div className="rsv-card__head">
              <span className={`rsv-card__badge rsv-card__badge--${r.status}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
              <span className="rsv-card__store">{r.storeName}</span>
            </div>

            <div className="rsv-card__code">{r.pickupCode}</div>

            <dl className="rsv-card__facts">
              <div>
                <dt>상품</dt>
                <dd>
                  {r.dealName} × {r.qty}
                </dd>
              </div>
              <div>
                <dt>결제 예정</dt>
                <dd>{(r.salePrice * r.qty).toLocaleString()}원</dd>
              </div>
              <div>
                <dt>픽업 마감</dt>
                <dd>~ {timeOf(r.pickupDeadlineAt)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default MyReservationsPage
