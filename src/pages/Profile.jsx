import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { calcRecommendedNutrients } from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const CONDITION_OPTIONS = [
  { key: 'diabetes', label: '당뇨' },
  { key: 'hypertension', label: '고혈압' },
  { key: 'kidney', label: '신장질환' },
]

const SEX_OPTIONS = [
  { key: 'male', label: '남성' },
  { key: 'female', label: '여성' },
]

const ACTIVITY_OPTIONS = [
  { key: 'low', label: '낮음' },
  { key: 'moderate', label: '보통' },
  { key: 'high', label: '높음' },
]

const NUTRIENT_LABELS = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {options.map((opt) => {
          const active = value === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              className="tds-press"
              onClick={() => onChange(opt.key)}
              style={{
                flex: 1,
                padding: `${spacing.md}px 0`,
                borderRadius: radius.sm,
                border: 'none',
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textStrong,
                fontWeight: 700,
                fontSize: font.size.md,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ConditionChips({ selected, onToggle }) {
  return (
    <div style={{ ...styles.field, marginBottom: 0 }}>
      <span style={styles.label}>기저질환 (해당 시 선택)</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
        {CONDITION_OPTIONS.map((opt) => {
          const active = selected.includes(opt.key)
          return (
            <button
              key={opt.key}
              type="button"
              className="tds-press"
              onClick={() => onToggle(opt.key)}
              style={{
                padding: `${spacing.sm}px ${spacing.lg}px`,
                borderRadius: radius.pill,
                border: 'none',
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textSub,
                fontWeight: 600,
                fontSize: font.size.sm,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
      conditions: f.conditions.includes(key) ? f.conditions.filter((c) => c !== key) : [...f.conditions, key],
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

  function handleSave() {
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
    <div style={styles.page}>
      <ScreenHeader title="내 정보 입력" subtitle="정확한 영양 분석을 위해 알려주세요" />

      <Card>
        <TextField
          label="나이"
          id="profile-age"
          type="number"
          min="1"
          autoFocus
          placeholder="25"
          value={form.age}
          onChange={(e) => updateField('age', e.target.value)}
        />
        <SegmentedControl label="성별" options={SEX_OPTIONS} value={form.sex} onChange={(v) => updateField('sex', v)} />
        <TextField
          label="키 (cm)"
          id="profile-height"
          type="number"
          min="1"
          placeholder="170"
          value={form.heightCm}
          onChange={(e) => updateField('heightCm', e.target.value)}
        />
        <TextField
          label="몸무게 (kg)"
          id="profile-weight"
          type="number"
          min="1"
          placeholder="65"
          value={form.weightKg}
          onChange={(e) => updateField('weightKg', e.target.value)}
        />
        <SegmentedControl label="활동량" options={ACTIVITY_OPTIONS} value={form.activity} onChange={(v) => updateField('activity', v)} />
        <ConditionChips selected={form.conditions} onToggle={toggleCondition} />
      </Card>

      {preview && (
        <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
          <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.md}px`, color: colors.textStrong }}>하루 권장 섭취량</h2>
          {NUTRIENT_LABELS.map(({ key, label, unit }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: colors.textSub }}>{label}</span>
              <span style={{ fontWeight: 700, color: colors.textStrong }}>
                {preview[key]} {unit}
              </span>
            </div>
          ))}
        </Card>
      )}

      <AppButton onClick={handleSave} disabled={!preview} style={{ marginTop: spacing.lg }}>
        시작하기
      </AppButton>
    </div>
  )
}
