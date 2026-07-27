import { useState } from 'react'
import api from '../api/client.js'

/*
 * 픽업코드 확인 폼 (W4). 코드 입력 → 검증 → 완료 처리를 서버 한 번의 호출로 한다.
 *
 * 전용 페이지(/owner/pickup)와 대시보드 인라인 패널이 함께 쓴다.
 * onSuccess: 완료 후 호출부가 화면을 갱신할 수 있게 하는 콜백(대시보드가 집계를 다시 읽는다).
 */
function PickupForm({ onSuccess }) {
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
      onSuccess?.(res.data)
    } catch (err) {
      setError(err.response?.data?.message ?? '처리에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form className="pickup__form" onSubmit={submit}>
        <input
          className="pickup__input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          inputMode="numeric"
          aria-label="픽업코드 4자리"
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
    </>
  )
}

export default PickupForm
