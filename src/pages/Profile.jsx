import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { calcRecommendedNutrients } from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

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

const STEPS = ['age', 'heightCm', 'weightKg', 'sex', 'activity', 'conditions', 'review']

const NUMERIC_STEP_CONFIG = {
  age: { label: '나이가 어떻게 되세요?', unit: '세', placeholder: '25' },
  heightCm: { label: '키가 어떻게 되세요?', unit: 'cm', placeholder: '170' },
  weightKg: { label: '몸무게가 어떻게 되세요?', unit: 'kg', placeholder: '65' },
}

const SEX_OPTIONS = [
  { key: 'male', label: '남성' },
  { key: 'female', label: '여성' },
]

const ACTIVITY_OPTIONS = [
  { key: 'low', label: '낮음', desc: '주로 앉아서 생활해요' },
  { key: 'moderate', label: '보통', desc: '주 2~3회 가볍게 움직여요' },
  { key: 'high', label: '높음', desc: '거의 매일 활발히 움직여요' },
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
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleCondition(key) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(key) ? f.conditions.filter((c) => c !== key) : [...f.conditions, key],
    }))
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
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
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
        {stepIndex > 0 && (
          <button
            type="button"
            className="tds-press"
            onClick={goBack}
            aria-label="이전"
            style={{ background: 'none', border: 'none', fontSize: 20, color: colors.title, cursor: 'pointer', padding: 0 }}
          >
            ←
          </button>
        )}
        <div style={{ flex: 1, height: 4, background: colors.background, borderRadius: radius.pill, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
              background: colors.primary,
              borderRadius: radius.pill,
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
      </div>

      <div key={step} className="tds-step">
        {(step === 'age' || step === 'heightCm' || step === 'weightKg') && (
          <NumericStep config={NUMERIC_STEP_CONFIG[step]} value={form[step]} onChange={(v) => updateField(step, v)} onNext={goNext} />
        )}

        {step === 'sex' && (
          <ChoiceStep
            title="성별을 알려주세요"
            options={SEX_OPTIONS}
            value={form.sex}
            onSelect={(v) => {
              updateField('sex', v)
              goNext()
            }}
          />
        )}

        {step === 'activity' && (
          <ChoiceStep
            title="평소 활동량은 어느 정도인가요?"
            options={ACTIVITY_OPTIONS}
            value={form.activity}
            onSelect={(v) => {
              updateField('activity', v)
              goNext()
            }}
          />
        )}

        {step === 'conditions' && <ConditionsStep selected={form.conditions} onToggle={toggleCondition} onNext={goNext} />}

        {step === 'review' && <ReviewStep preview={preview} onSave={handleSave} />}
      </div>
    </div>
  )
}

function NumericStep({ config, value, onChange, onNext }) {
  const isValid = value && Number(value) > 0

  function handleKeyDown(e) {
    if (e.key === 'Enter' && isValid) onNext()
  }

  return (
    <div>
      <h1 style={{ fontSize: font.size.xl }}>{config.label}</h1>
      <div style={{ ...styles.card, display: 'flex', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xl }}>
        <input
          type="number"
          min="1"
          autoFocus
          aria-label={config.label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={config.placeholder}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 36,
            fontWeight: 800,
            color: colors.title,
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: font.size.lg, color: colors.muted, fontWeight: 600 }}>{config.unit}</span>
      </div>
      <button
        type="button"
        className="tds-press"
        onClick={onNext}
        disabled={!isValid}
        style={{
          ...styles.buttonPrimary,
          marginTop: spacing.xl,
          opacity: isValid ? 1 : 0.4,
          cursor: isValid ? 'pointer' : 'not-allowed',
        }}
      >
        다음
      </button>
    </div>
  )
}

function ChoiceStep({ title, options, value, onSelect }) {
  return (
    <div>
      <h1 style={{ fontSize: font.size.xl }}>{title}</h1>
      <div style={{ marginTop: spacing.xl, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {options.map((opt) => {
          const selected = value === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              className="tds-press"
              onClick={() => onSelect(opt.key)}
              style={{
                ...styles.card,
                margin: 0,
                textAlign: 'left',
                border: 'none',
                boxShadow: selected ? 'none' : styles.card.boxShadow,
                background: selected ? colors.primarySurface : colors.surface,
                outline: selected ? `2px solid ${colors.primary}` : 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{ fontWeight: 700, color: selected ? colors.primary : colors.title, fontSize: font.size.md }}>
                {opt.label}
              </div>
              {opt.desc && <div style={{ color: colors.muted, fontSize: font.size.sm, marginTop: 2 }}>{opt.desc}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ConditionsStep({ selected, onToggle, onNext }) {
  return (
    <div>
      <h1 style={{ fontSize: font.size.xl }}>해당하는 기저질환이 있나요?</h1>
      <p style={{ color: colors.muted, fontSize: font.size.sm, marginTop: spacing.xs }}>없다면 그냥 다음으로 넘어가주세요</p>
      <div style={{ marginTop: spacing.xl, display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
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
                background: active ? colors.primary : colors.background,
                color: active ? '#fff' : colors.body,
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
      <button
        type="button"
        className="tds-press"
        onClick={onNext}
        style={{ ...styles.buttonPrimary, marginTop: spacing.xxl }}
      >
        다음
      </button>
    </div>
  )
}

function ReviewStep({ preview, onSave }) {
  return (
    <div>
      <h1 style={{ fontSize: font.size.xl }}>하루 권장 섭취량이에요</h1>
      <div style={{ ...styles.card, marginTop: spacing.xl, background: colors.primarySurface, boxShadow: 'none' }}>
        {preview &&
          NUTRIENT_LABELS.map(({ key, label, unit }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: colors.body }}>{label}</span>
              <span style={{ fontWeight: 700, color: colors.title }}>
                {preview[key]} {unit}
              </span>
            </div>
          ))}
      </div>
      <button
        type="button"
        className="tds-press"
        onClick={onSave}
        disabled={!preview}
        style={{ ...styles.buttonPrimary, marginTop: spacing.xl }}
      >
        저장하고 분석하러 가기
      </button>
    </div>
  )
}
