import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import CardSettingsPanel from '../components/CardSettingsPanel.jsx'
import ChevronIcon from '../components/ChevronIcon.jsx'
import GuestBackupPanel from '../components/GuestBackupPanel.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import StandardComparisonList from '../components/StandardComparisonList.jsx'
import TagMultiSelect from '../components/TagMultiSelect.jsx'
import TextField from '../components/TextField.jsx'
import { ALLERGY_OPTIONS, CONDITION_OPTIONS } from '../lib/healthProfile.js'
import { calcRecommendedNutrients, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { getStandardIntake } from '../lib/standardIntake.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const SEX_OPTIONS = [
  { key: 'male', label: '남성' },
  { key: 'female', label: '여성' },
]

const SEX_LABEL_MAP = Object.fromEntries(SEX_OPTIONS.map((o) => [o.key, o.label]))

const ACTIVITY_OPTIONS = [
  { key: 'low', label: '낮음' },
  { key: 'moderate', label: '보통' },
  { key: 'high', label: '높음' },
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

export default function Profile() {
  const { profile, recommended, tempSex, saveProfile, authMode, logout } = useUser()
  const navigate = useNavigate()
  const isOnboarding = !profile

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  // 입력 폼 섹션은 온보딩(첫 입력)일 때는 기본 펼침, MY 탭(이미 프로필이 있는 경우)일 때는 기본
  // 접힘으로 시작한다 — 어느 쪽이든 접었다 펼 수 있다.
  const [expanded, setExpanded] = useState(isOnboarding)
  const [recommendedExpanded, setRecommendedExpanded] = useState(false)

  const [form, setForm] = useState(() => ({
    age: profile?.age?.toString() ?? '',
    heightCm: profile?.heightCm?.toString() ?? '',
    weightKg: profile?.weightKg?.toString() ?? '',
    sex: profile?.sex ?? tempSex ?? 'male',
    activity: profile?.activity ?? 'moderate',
    conditions: profile?.conditions ?? [],
    allergies: profile?.allergies ?? [],
  }))

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // form은 마운트 시 한 번만 profile에서 초기화되는데, 마운트된 채로 profile 자체가 바뀌는 경우가
  // 있다(게스트가 MY 탭에 머문 채 로그인 후 게스트 데이터 이관을 수락하면 acceptGuestMigration이
  // refetchProfile로 profile을 이관된 값으로 교체한다). 이때 재동기화하지 않으면 화면에는 이관 전
  // 값이 그대로 남아 사용자가 "저장을 안 눌렀나" 헷갈릴 수 있다.
  useEffect(() => {
    setForm({
      age: profile?.age?.toString() ?? '',
      heightCm: profile?.heightCm?.toString() ?? '',
      weightKg: profile?.weightKg?.toString() ?? '',
      sex: profile?.sex ?? tempSex ?? 'male',
      activity: profile?.activity ?? 'moderate',
      conditions: profile?.conditions ?? [],
      allergies: profile?.allergies ?? [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

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

  // 표준 대비 비교 카드용: 폼을 편집 중이면 그 값을, 아니면 저장된 값을 따른다.
  const recommendedForDisplay = preview ?? recommended
  const standardIntake = useMemo(() => {
    const age = form.age ? Number(form.age) : profile?.age
    if (!age) return null
    return getStandardIntake(form.sex, age)
  }, [form.age, form.sex, profile?.age])

  async function handleSave() {
    if (!preview || saving) return

    const profile = {
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      sex: form.sex,
      activity: form.activity,
      conditions: form.conditions,
      allergies: form.allergies,
    }

    setSaving(true)
    setSaveError('')
    try {
      // saveProfile이 Supabase profiles 테이블에 upsert하고, 저장된 진짜 프로필이 생겼으니
      // tempSex(임시 수단)도 함께 지운다.
      await saveProfile({ profile, recommended: preview })
      navigate('/analyze', { replace: true })
    } catch (err) {
      setSaveError(err.message || '저장에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const summaryLine = !isOnboarding
    ? `${profile.age}세 · ${SEX_LABEL_MAP[profile.sex]} · ${profile.heightCm}cm · ${profile.weightKg}kg`
    : null

  // 온보딩 카드를 접었을 때 보여줄 한 줄 — 아직 저장된 프로필이 없으니 지금 입력 중인 값(form) 기준.
  const onboardingSummaryLine = isComplete
    ? `${form.age}세 · ${SEX_LABEL_MAP[form.sex]} · ${form.heightCm}cm · ${form.weightKg}kg`
    : '정확한 영양 분석을 위해 알려주세요'

  const formFields = (
    <>
      <TextField
        label="나이"
        id="profile-age"
        type="number"
        min="1"
        autoFocus={isOnboarding}
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
      <div style={{ marginBottom: spacing.md }}>
        <TagMultiSelect
          label="알레르기 (해당 시 선택)"
          options={ALLERGY_OPTIONS}
          value={form.allergies}
          onChange={(next) => updateField('allergies', next)}
          placeholder="기타 알레르기 직접 입력"
        />
      </div>
      <TagMultiSelect
        label="기저질환 (해당 시 선택)"
        options={CONDITION_OPTIONS}
        value={form.conditions}
        onChange={(next) => updateField('conditions', next)}
        placeholder="기타 질환 직접 입력"
      />
    </>
  )

  return (
    <div style={styles.page}>
      <ScreenHeader
        title={isOnboarding ? '내 정보 입력' : 'MY'}
        subtitle={isOnboarding ? '정확한 영양 분석을 위해 알려주세요' : '건강 정보와 하루 권장 섭취량을 확인해보세요'}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing.md }}>
        {authMode === 'user' ? (
          <button type="button" className="tds-press" onClick={handleLogout} style={styles.buttonSecondary}>
            로그아웃
          </button>
        ) : (
          <button
            type="button"
            className="tds-press"
            onClick={() => navigate('/login')}
            style={styles.buttonSecondary}
          >
            로그인 / 회원가입
          </button>
        )}
      </div>

      {isOnboarding ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <button
            type="button"
            className="tds-press"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
              background: 'none',
              border: 'none',
              padding: spacing.xl,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: font.size.md, fontWeight: 600, color: colors.textStrong }}>내 정보 입력</h3>
              <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>{onboardingSummaryLine}</p>
            </div>
            <span style={{ color: colors.muted }}>
              <ChevronIcon open={expanded} />
            </span>
          </button>

          {expanded && <div style={{ padding: `0 ${spacing.xl}px ${spacing.xl}px` }}>{formFields}</div>}
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <button
            type="button"
            className="tds-press"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
              background: 'none',
              border: 'none',
              padding: spacing.xl,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: font.size.md, fontWeight: 600, color: colors.textStrong }}>건강 정보</h3>
              <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>{summaryLine}</p>
            </div>
            <span style={{ color: colors.muted }}>
              <ChevronIcon open={expanded} />
            </span>
          </button>

          {expanded && (
            <div style={{ padding: `0 ${spacing.xl}px ${spacing.xl}px` }}>
              {formFields}
              {saveError && <p style={styles.errorText}>{saveError}</p>}
              <AppButton onClick={handleSave} disabled={!preview || saving} style={{ marginTop: spacing.md }}>
                {saving ? '저장 중...' : '저장하기'}
              </AppButton>
            </div>
          )}
        </Card>
      )}

      {isOnboarding && preview && (
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

      {!isOnboarding && recommendedForDisplay && standardIntake && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <button
            type="button"
            className="tds-press"
            onClick={() => setRecommendedExpanded((v) => !v)}
            aria-expanded={recommendedExpanded}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
              background: 'none',
              border: 'none',
              padding: spacing.xl,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <h2 style={{ fontSize: font.size.lg, margin: 0, color: colors.textStrong }}>하루 권장 섭취량</h2>
            <span style={{ color: colors.muted }}>
              <ChevronIcon open={recommendedExpanded} />
            </span>
          </button>

          {recommendedExpanded && (
            <div style={{ padding: `0 ${spacing.xl}px ${spacing.xl}px` }}>
              <p style={{ margin: `0 0 ${spacing.lg}px`, fontSize: font.size.xs, color: colors.textSub }}>
                같은 나이·성별 표준 평균과 비교했어요
              </p>
              <StandardComparisonList mine={recommendedForDisplay} standard={standardIntake} />
            </div>
          )}
        </Card>
      )}

      {isOnboarding && (
        <>
          {saveError && <p style={styles.errorText}>{saveError}</p>}
          <AppButton onClick={handleSave} disabled={!preview || saving} style={{ marginTop: spacing.lg }}>
            {saving ? '저장 중...' : '시작하기'}
          </AppButton>
        </>
      )}

      {!isOnboarding && <CardSettingsPanel />}
      <GuestBackupPanel />
    </div>
  )
}
