import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { CATEGORIES } from '../../lib/constants.js'
import './DealRegisterPage.css'

// 오늘 날짜의 HH:MM을 ISO 문자열로 (픽업 마감 기본값: 21:00)
function todayAt(time) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

/*
 * W2 마감 상품 등록 (T-05). "30초 등록"이 목표라 기본값을 최대한 채워둔다.
 * 등록 즉시 소비자 목록에 노출된다 — 알림 발송(T-11)도 이 시점이 트리거.
 */
function DealRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    totalQty: 5,
    originalPrice: '',
    salePrice: '',
    deadlineTime: '21:00',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const stepQty = (delta) =>
    setForm((prev) => ({ ...prev, totalQty: Math.max(1, prev.totalQty + delta) }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/deals', {
        name: form.name,
        category: form.category,
        totalQty: form.totalQty,
        originalPrice: Number(form.originalPrice),
        salePrice: Number(form.salePrice),
        pickupDeadlineAt: todayAt(form.deadlineTime).toISOString(),
      })
      navigate('/owner', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? '등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="deal-reg">
      <form className="deal-reg__card" onSubmit={submit}>
        <h1 className="deal-reg__title">마감 상품 등록</h1>
        <p className="deal-reg__sub">등록 즉시 근처 소비자에게 노출됩니다.</p>

        <label className="deal-reg__label">
          상품명
          <input
            className="deal-reg__input"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="예: 크루아상"
            required
          />
        </label>

        <label className="deal-reg__label">
          카테고리
          <select
            className="deal-reg__input"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="deal-reg__row">
          <div className="deal-reg__label">
            수량
            <div className="deal-reg__stepper">
              <button type="button" onClick={() => stepQty(-1)} aria-label="수량 감소">
                −
              </button>
              <span>{form.totalQty}</span>
              <button type="button" onClick={() => stepQty(1)} aria-label="수량 증가">
                +
              </button>
            </div>
          </div>
          <label className="deal-reg__label">
            픽업 마감
            <input
              className="deal-reg__input"
              type="time"
              value={form.deadlineTime}
              onChange={(e) => update('deadlineTime', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="deal-reg__row">
          <label className="deal-reg__label">
            원가 (원)
            <input
              className="deal-reg__input"
              type="number"
              min="1"
              value={form.originalPrice}
              onChange={(e) => update('originalPrice', e.target.value)}
              placeholder="4000"
              required
            />
          </label>
          <label className="deal-reg__label">
            할인가 (원)
            <input
              className="deal-reg__input"
              type="number"
              min="1"
              value={form.salePrice}
              onChange={(e) => update('salePrice', e.target.value)}
              placeholder="2000"
              required
            />
          </label>
        </div>

        {error && <p className="deal-reg__error">{error}</p>}

        <button className="deal-reg__submit" type="submit" disabled={submitting}>
          {submitting ? '등록 중...' : '등록 · 근처 소비자에게 알림'}
        </button>
      </form>
    </main>
  )
}

export default DealRegisterPage
