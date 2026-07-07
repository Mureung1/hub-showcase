import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { calcRecommendedNutrients } from '../lib/nutrition.js'

const CONDITION_OPTIONS = [
  { key: 'diabetes', label: '당뇨' },
  { key: 'hypertension', label: '고혈압' },
  { key: 'kidney', label: '신장질환' },
]

const NUTRIENT_LABELS = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

export default function Profile() {
  const { user, updateUser } = useUser()
  const navigate = useNavigate()

  const [form, setForm] = useState(() => ({
    age: user?.profile?.age?.toString() ?? '',
    heightCm: user?.profile?.heightCm?.toString() ?? '',
    weightKg: user?.profile?.weightKg?.toString() ?? '',
    sex: user?.profile?.sex ?? 'male',
    activity: user?.profile?.activity ?? 'moderate',
    conditions: user?.profile?.conditions ?? [],
  }))

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleCondition(key) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(key)
        ? f.conditions.filter((c) => c !== key)
        : [...f.conditions, key],
    }))
  }

  const isComplete = form.age && form.heightCm && form.weightKg

  const preview = useMemo(() => {
    if (!isComplete) return null
    return calcRecommendedNutrients({
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      sex: form.sex,
      activity: form.activity,
      conditions: form.conditions,
    })
  }, [form, isComplete])

  function handleSubmit(e) {
    e.preventDefault()
    if (!preview) return

    const profile = {
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      sex: form.sex,
      activity: form.activity,
      conditions: form.conditions,
    }

    updateUser({ profile, recommended: preview })
    navigate('/analyze', { replace: true })
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 24 }}>
      <h1>신체정보 입력</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="age">나이</label>
          <input
            id="age"
            type="number"
            min="1"
            value={form.age}
            onChange={(e) => updateField('age', e.target.value)}
            required
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="heightCm">키 (cm)</label>
          <input
            id="heightCm"
            type="number"
            min="1"
            value={form.heightCm}
            onChange={(e) => updateField('heightCm', e.target.value)}
            required
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="weightKg">몸무게 (kg)</label>
          <input
            id="weightKg"
            type="number"
            min="1"
            value={form.weightKg}
            onChange={(e) => updateField('weightKg', e.target.value)}
            required
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="sex">성별</label>
          <select
            id="sex"
            value={form.sex}
            onChange={(e) => updateField('sex', e.target.value)}
            style={{ width: '100%', display: 'block' }}
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="activity">활동량</label>
          <select
            id="activity"
            value={form.activity}
            onChange={(e) => updateField('activity', e.target.value)}
            style={{ width: '100%', display: 'block' }}
          >
            <option value="low">낮음</option>
            <option value="moderate">보통</option>
            <option value="high">높음</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4 }}>기저질환 (해당 시 선택)</span>
          {CONDITION_OPTIONS.map((opt) => (
            <label key={opt.key} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={form.conditions.includes(opt.key)}
                onChange={() => toggleCondition(opt.key)}
              />{' '}
              {opt.label}
            </label>
          ))}
        </div>

        <button type="submit" disabled={!preview} style={{ width: '100%' }}>
          저장하고 분석하러 가기
        </button>
      </form>

      {preview && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
          }}
        >
          <h2 style={{ marginTop: 0 }}>하루 권장 섭취량</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {NUTRIENT_LABELS.map(({ key, label, unit }) => (
              <li key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{label}</span>
                <span>
                  {preview[key]} {unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
