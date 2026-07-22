import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { CATEGORIES } from '../../lib/constants.js'
import './SettingsPage.css'

/*
 * M5 세부 설정 (T-12). 관심 카테고리와 위치 조건을 조절한다.
 * 저장 값이 곧 알림 대상 판정(T-11)의 입력 — (카테고리 OR 즐겨찾기) AND 위치 조건.
 */
function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get('/users/me')
      .then((res) => setSettings(res.data))
      .catch((err) => setError(err.response?.data?.message ?? '설정을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleCategory = (category) => {
    setSaved(false)
    setSettings((prev) => ({
      ...prev,
      interests: prev.interests.includes(category)
        ? prev.interests.filter((c) => c !== category)
        : [...prev.interests, category],
    }))
  }

  const update = (patch) => {
    setSaved(false)
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await api.patch('/users/me', {
        interests: settings.interests,
        notiLocationMode: settings.notiLocationMode,
        notiRadiusKm: settings.notiRadiusKm,
      })
      setSettings(res.data)
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.message ?? '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <main className="settings">
        <p className="settings__msg">불러오는 중...</p>
      </main>
    )
  if (!settings) {
    return (
      <main className="settings">
        <p className="settings__msg settings__msg--error">{error}</p>
      </main>
    )
  }

  return (
    <main className="settings">
      <button type="button" className="settings__back" onClick={() => navigate('/app')}>
        ← 목록
      </button>
      <h1 className="settings__title">알림 설정</h1>
      <p className="settings__sub">관심 조건에 맞는 마감 할인만 알려드려요.</p>

      <section className="settings__section">
        <h2 className="settings__label">관심 카테고리</h2>
        <div className="settings__chips">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`settings__chip${settings.interests.includes(c) ? ' settings__chip--on' : ''}`}
              onClick={() => toggleCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="settings__section">
        <h2 className="settings__label">알림 위치 조건</h2>

        <label className="settings__radio">
          <input
            type="radio"
            name="mode"
            checked={settings.notiLocationMode === 'radius'}
            onChange={() => update({ notiLocationMode: 'radius' })}
          />
          <span>
            기준 위치에서 반경 <b>{settings.notiRadiusKm}km</b> 이내일 때만
          </span>
        </label>

        <input
          className="settings__slider"
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={settings.notiRadiusKm}
          disabled={settings.notiLocationMode !== 'radius'}
          onChange={(e) => update({ notiRadiusKm: Number(e.target.value) })}
        />

        <label className="settings__radio">
          <input
            type="radio"
            name="mode"
            checked={settings.notiLocationMode === 'always'}
            onChange={() => update({ notiLocationMode: 'always' })}
          />
          <span>거리와 무관하게 항상 받기</span>
        </label>

        <p className="settings__hint">기준 위치: {settings.baseAddress ?? '미설정'}</p>
      </section>

      {error && <p className="settings__msg settings__msg--error">{error}</p>}

      <button className="settings__save" type="button" onClick={save} disabled={saving}>
        {saving ? '저장 중...' : saved ? '저장됨' : '저장'}
      </button>
    </main>
  )
}

export default SettingsPage
