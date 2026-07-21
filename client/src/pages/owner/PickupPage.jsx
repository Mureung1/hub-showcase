import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './PickupPage.css'

/*
 * W4 픽업 확인 (T-10). 손님이 제시한 코드를 입력해 예약을 검증하고 완료 처리한다.
 * 코드 검증과 상태 전이를 서버 한 번의 호출로 처리한다(중복 처리 방지).
 */
function PickupPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setSubmitting(true)
    try {
      const res = await api.post('/reservations/pickup', { pickupCode: code })
      setResult(res.data)
      setCode('')
    } catch (err) {
      setError(err.response?.data?.message ?? '처리에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="pickup">
      <div className="pickup__card">
        <button type="button" className="pickup__back" onClick={() => navigate('/owner')}>
          ← 대시보드
        </button>
        <h1 className="pickup__title">픽업 확인</h1>
        <p className="pickup__sub">손님이 제시한 4자리 코드를 입력하세요.</p>

        <form className="pickup__form" onSubmit={submit}>
          <input
            className="pickup__input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            inputMode="numeric"
            required
          />
          <button className="pickup__submit" type="submit" disabled={submitting || code.length !== 4}>
            {submitting ? '확인 중...' : '확인'}
          </button>
        </form>

        {error && <p className="pickup__error">{error}</p>}

        {result && (
          <div className="pickup__result">
            <span className="pickup__badge">픽업 완료</span>
            <dl className="pickup__facts">
              <div>
                <dt>상품</dt>
                <dd>
                  {result.dealName} × {result.qty}
                </dd>
              </div>
              <div>
                <dt>예약자</dt>
                <dd>{result.nickname}</dd>
              </div>
              <div>
                <dt>받을 금액</dt>
                <dd>{(result.salePrice * result.qty).toLocaleString()}원</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </main>
  )
}

export default PickupPage
