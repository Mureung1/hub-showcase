import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './StoreReservationsPage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const STATUS_LABEL = {
  reserved: '픽업 대기',
  picked: '픽업 완료',
  expired: '만료',
}

/*
 * 사장님 예약 목록. 내 가게에 들어온 예약을 상태별로 본다.
 * 픽업 대기 건은 픽업 확인(W4)에서 코드로 처리한다.
 * 새 예약 반영을 위해 5초 폴링 — 대시보드와 같은 방식.
 */
function StoreReservationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .get('/reservations/store')
        .then((res) => {
          if (!cancelled) setItems(res.data)
        })
        .catch((err) => {
          if (!cancelled) setError(err.response?.data?.message ?? '예약을 불러오지 못했습니다.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })

    load()
    const timer = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const waiting = items.filter((r) => r.status === 'reserved')

  return (
    <main className="store-rsv">
      <button type="button" className="store-rsv__back" onClick={() => navigate('/owner')}>
        ← 대시보드
      </button>
      <h1 className="store-rsv__title">예약 현황</h1>
      {!loading && !error && (
        <p className="store-rsv__sub">
          픽업 대기 <b>{waiting.length}</b>건 · 전체 {items.length}건
        </p>
      )}

      {loading && <p className="store-rsv__msg">불러오는 중...</p>}
      {error && <p className="store-rsv__msg store-rsv__msg--error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="store-rsv__msg">
          아직 들어온 예약이 없어요. 상품을 등록하면 예약이 여기에 표시됩니다.
        </p>
      )}

      <ul className="store-rsv__list">
        {items.map((r) => (
          <li key={r.id} className={`rsv-row rsv-row--${r.status}`}>
            <div className="rsv-row__main">
              <div className="rsv-row__head">
                <span className={`rsv-row__badge rsv-row__badge--${r.status}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <b className="rsv-row__deal">
                  {r.dealName} × {r.qty}
                </b>
              </div>
              <span className="rsv-row__meta">
                {r.nickname} · {timeOf(r.createdAt)}
              </span>
            </div>
            <div className="rsv-row__side">
              <span className="rsv-row__code">{r.pickupCode}</span>
              <span className="rsv-row__amount">{(r.salePrice * r.qty).toLocaleString()}원</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default StoreReservationsPage
