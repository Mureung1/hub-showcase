import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './DealDetailPage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

/*
 * M3 딜 상세 (T-07). 가격·남은 수량·픽업 마감·거리 표시 + 수량 선택.
 * 예약 실행(원자적 재고 차감)과 픽업코드(M4)는 T-08에서 연결한다.
 */
function DealDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deal, setDeal] = useState(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(`/deals/${id}`)
      .then((res) => setDeal(res.data))
      .catch((err) => setError(err.response?.data?.message ?? '딜을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <main className="deal-detail"><p className="deal-detail__msg">불러오는 중...</p></main>
  if (error) {
    return (
      <main className="deal-detail">
        <p className="deal-detail__msg deal-detail__msg--error">{error}</p>
        <button type="button" className="deal-detail__back" onClick={() => navigate('/app')}>
          목록으로
        </button>
      </main>
    )
  }

  const stepQty = (delta) => setQty((q) => Math.min(deal.remainingQty, Math.max(1, q + delta)))

  return (
    <main className="deal-detail">
      <button type="button" className="deal-detail__back" onClick={() => navigate('/app')}>
        ← 목록
      </button>

      <h1 className="deal-detail__name">{deal.name}</h1>
      <p className="deal-detail__store">
        {deal.storeName}
        {deal.distanceKm != null && <> · {deal.distanceKm}km</>}
      </p>

      <dl className="deal-detail__facts">
        <div>
          <dt>가격</dt>
          <dd>
            <s>{deal.originalPrice.toLocaleString()}</s>{' '}
            <b>{deal.salePrice.toLocaleString()}원</b>
          </dd>
        </div>
        <div>
          <dt>남은 수량</dt>
          <dd>{deal.remainingQty}개</dd>
        </div>
        <div>
          <dt>픽업 마감</dt>
          <dd>~ {timeOf(deal.pickupDeadlineAt)}</dd>
        </div>
      </dl>

      <div className="deal-detail__foot">
        <div className="deal-detail__qty">
          <span>수량</span>
          <div className="deal-detail__stepper">
            <button type="button" onClick={() => stepQty(-1)} aria-label="수량 감소">−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => stepQty(1)} aria-label="수량 증가">+</button>
          </div>
        </div>
        {/* TODO(T-08): 예약 API 연결 — 원자적 재고 차감 → 픽업코드(M4) */}
        <button type="button" className="deal-detail__reserve" disabled>
          예약하기 · 현장결제
        </button>
      </div>
    </main>
  )
}

export default DealDetailPage
