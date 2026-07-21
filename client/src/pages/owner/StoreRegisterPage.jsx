import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { CATEGORIES, LOCATION_PRESETS } from '../../lib/constants.js'
import './StoreRegisterPage.css'

/*
 * W1 가게 등록 (T-04). 최초 1회 — 이미 등록돼 있으면 OwnerHomePage가 이리로 보내지 않는다.
 * 좌표는 프리셋 선택으로 채우고 필요하면 직접 수정한다 (지오코딩은 Backlog).
 */
function StoreRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    address: '',
    lat: LOCATION_PRESETS[0].lat,
    lng: LOCATION_PRESETS[0].lng,
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const applyPreset = (index) => {
    const preset = LOCATION_PRESETS[index]
    setForm((prev) => ({ ...prev, lat: preset.lat, lng: preset.lng }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/stores', {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
      })
      navigate('/owner', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? '등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="store-reg">
      <form className="store-reg__card" onSubmit={submit}>
        <h1 className="store-reg__title">가게 등록</h1>
        <p className="store-reg__sub">
          최초 1회만 등록해요. 위치는 알림 반경 계산의 기준이 됩니다.
        </p>

        <label className="store-reg__label">
          상호명
          <input
            className="store-reg__input"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="예: 한입 베이커리"
            required
          />
        </label>

        <label className="store-reg__label">
          카테고리
          <select
            className="store-reg__input"
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

        <label className="store-reg__label">
          주소
          <input
            className="store-reg__input"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="예: 서울 서대문구 연세로 12"
            required
          />
        </label>

        <label className="store-reg__label">
          위치 프리셋
          <select className="store-reg__input" onChange={(e) => applyPreset(e.target.value)}>
            {LOCATION_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="store-reg__row">
          <label className="store-reg__label">
            위도 (lat)
            <input
              className="store-reg__input"
              type="number"
              step="0.0001"
              value={form.lat}
              onChange={(e) => update('lat', e.target.value)}
            />
          </label>
          <label className="store-reg__label">
            경도 (lng)
            <input
              className="store-reg__input"
              type="number"
              step="0.0001"
              value={form.lng}
              onChange={(e) => update('lng', e.target.value)}
            />
          </label>
        </div>

        {error && <p className="store-reg__error">{error}</p>}

        <button className="store-reg__submit" type="submit" disabled={submitting}>
          {submitting ? '등록 중...' : '저장하고 시작하기'}
        </button>
      </form>
    </main>
  )
}

export default StoreRegisterPage
