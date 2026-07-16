import { useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'userInfo'

const steps = [
  {
    title: '학교를 알려주세요',
    description: '통학 시간과 주변 시세를 판단할 기준 학교로 사용합니다.',
  },
  {
    title: '월 주거 예산을 입력해주세요',
    description: '보증금, 월세, 관리비를 함께 볼 때 부담 가능한 범위를 판단합니다.',
  },
  {
    title: '통학 패턴을 알려주세요',
    description: '주당 등교 횟수와 귀가 시간을 바탕으로 숨은 이동 비용을 계산합니다.',
  },
  {
    title: '선택 정보를 확인해주세요',
    description: '선택 항목은 더 개인화된 분석에만 사용되며 입력하지 않아도 저장할 수 있습니다.',
  },
]

const defaultForm = {
  school: '',
  budget: '',
  commuteDaysPerWeek: '',
  returnTime: '',
  gender: '',
  hasLivingAloneExperience: '',
}

function getStoredForm() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm
  } catch {
    return defaultForm
  }
}

function App() {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(getStoredForm)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const currentStep = steps[stepIndex]
  const progressPercent = ((stepIndex + 1) / steps.length) * 100

  const summaryItems = useMemo(
    () => [
      ['학교', form.school || '미입력'],
      ['월 주거 예산', form.budget ? `${Number(form.budget).toLocaleString()}원` : '미입력'],
      ['주당 등교 횟수', form.commuteDaysPerWeek ? `${form.commuteDaysPerWeek}회` : '미입력'],
      ['주요 귀가 시간', form.returnTime || '미입력'],
      ['성별', form.gender || '선택 안 함'],
      [
        '자취 경험',
        form.hasLivingAloneExperience === 'yes'
          ? '있음'
          : form.hasLivingAloneExperience === 'no'
            ? '없음'
            : '선택 안 함',
      ],
    ],
    [form],
  )

  function updateField(name, value) {
    setForm((prevForm) => ({ ...prevForm, [name]: value }))
    setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }))
    setSaved(false)
  }

  function validateStep(index) {
    const nextErrors = {}

    if (index === 0 && !form.school.trim()) {
      nextErrors.school = '학교명을 입력해주세요.'
    }

    if (index === 1) {
      const budget = Number(form.budget)
      if (!form.budget) {
        nextErrors.budget = '월 주거 예산을 입력해주세요.'
      } else if (!Number.isFinite(budget) || budget <= 0) {
        nextErrors.budget = '0보다 큰 금액을 입력해주세요.'
      }
    }

    if (index === 2) {
      if (!form.commuteDaysPerWeek) {
        nextErrors.commuteDaysPerWeek = '주당 등교 횟수를 선택해주세요.'
      }

      if (!form.returnTime) {
        nextErrors.returnTime = '주요 귀가 시간을 입력해주세요.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function goNext() {
    if (!validateStep(stepIndex)) {
      return
    }

    setStepIndex((prevStep) => Math.min(prevStep + 1, steps.length - 1))
  }

  function goBack() {
    setErrors({})
    setStepIndex((prevStep) => Math.max(prevStep - 1, 0))
  }

  function saveUserInfo() {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return
    }

    const data = {
      ...form,
      school: form.school.trim(),
      budget: Number(form.budget),
      commuteDaysPerWeek: Number(form.commuteDaysPerWeek),
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setForm({ ...defaultForm, ...data })
    setSaved(true)
  }

  return (
    <main className="user-info-page">
      <section className="user-info-shell" aria-labelledby="page-title">
        <header className="app-header">
          <p className="brand-name">자취방 의사결정 도우미</p>
          <h1 id="page-title">사용자 정보 입력</h1>
          <p className="page-description">
            처음 한 번만 입력하면 매물 분석에서 예산과 통학 환경을 함께 반영합니다.
          </p>
        </header>

        <section className="form-card" aria-labelledby="step-title">
          <div className="progress-header">
            <span className="step-count">{stepIndex + 1} / {steps.length}</span>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-value" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="step-heading">
            <h2 id="step-title">{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </div>

          {stepIndex === 0 && (
            <div className="field-group">
              <label htmlFor="school">학교</label>
              <input
                id="school"
                name="school"
                value={form.school}
                onChange={(event) => updateField('school', event.target.value)}
                placeholder="예: 한국대학교"
                aria-describedby={errors.school ? 'school-error' : undefined}
                aria-invalid={Boolean(errors.school)}
              />
              {errors.school && <p className="error-text" id="school-error">{errors.school}</p>}
            </div>
          )}

          {stepIndex === 1 && (
            <div className="field-group">
              <label htmlFor="budget">월 주거 예산</label>
              <div className="input-with-unit">
                <input
                  id="budget"
                  name="budget"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={form.budget}
                  onChange={(event) => updateField('budget', event.target.value)}
                  placeholder="예: 600000"
                  aria-describedby="budget-helper budget-error"
                  aria-invalid={Boolean(errors.budget)}
                />
                <span>원</span>
              </div>
              <p className="helper-text" id="budget-helper">월세와 관리비까지 감당 가능한 월 기준 금액을 입력해주세요.</p>
              {errors.budget && <p className="error-text" id="budget-error">{errors.budget}</p>}
            </div>
          )}

          {stepIndex === 2 && (
            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="commuteDaysPerWeek">주당 등교 횟수</label>
                <select
                  id="commuteDaysPerWeek"
                  name="commuteDaysPerWeek"
                  value={form.commuteDaysPerWeek}
                  onChange={(event) => updateField('commuteDaysPerWeek', event.target.value)}
                  aria-describedby={errors.commuteDaysPerWeek ? 'commute-error' : undefined}
                  aria-invalid={Boolean(errors.commuteDaysPerWeek)}
                >
                  <option value="">선택해주세요</option>
                  <option value="1">1회</option>
                  <option value="2">2회</option>
                  <option value="3">3회</option>
                  <option value="4">4회</option>
                  <option value="5">5회 이상</option>
                </select>
                {errors.commuteDaysPerWeek && (
                  <p className="error-text" id="commute-error">{errors.commuteDaysPerWeek}</p>
                )}
              </div>

              <div className="field-group">
                <label htmlFor="returnTime">주요 귀가 시간</label>
                <input
                  id="returnTime"
                  name="returnTime"
                  type="time"
                  value={form.returnTime}
                  onChange={(event) => updateField('returnTime', event.target.value)}
                  aria-describedby={errors.returnTime ? 'return-time-error' : undefined}
                  aria-invalid={Boolean(errors.returnTime)}
                />
                {errors.returnTime && (
                  <p className="error-text" id="return-time-error">{errors.returnTime}</p>
                )}
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="review-panel">
              <div className="field-group">
                <label htmlFor="gender">성별 <span className="optional-label">선택</span></label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={(event) => updateField('gender', event.target.value)}
                >
                  <option value="">선택 안 함</option>
                  <option value="여성">여성</option>
                  <option value="남성">남성</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <fieldset className="choice-field">
                <legend>자취 경험 여부 <span className="optional-label">선택</span></legend>
                <div className="choice-grid">
                  <label className={form.hasLivingAloneExperience === 'yes' ? 'choice-card selected' : 'choice-card'}>
                    <input
                      type="radio"
                      name="hasLivingAloneExperience"
                      value="yes"
                      checked={form.hasLivingAloneExperience === 'yes'}
                      onChange={(event) => updateField('hasLivingAloneExperience', event.target.value)}
                    />
                    <span>있음</span>
                    <small>계약 경험이 있어요</small>
                  </label>
                  <label className={form.hasLivingAloneExperience === 'no' ? 'choice-card selected' : 'choice-card'}>
                    <input
                      type="radio"
                      name="hasLivingAloneExperience"
                      value="no"
                      checked={form.hasLivingAloneExperience === 'no'}
                      onChange={(event) => updateField('hasLivingAloneExperience', event.target.value)}
                    />
                    <span>없음</span>
                    <small>처음 자취를 준비해요</small>
                  </label>
                </div>
              </fieldset>

              <dl className="summary-list">
                {summaryItems.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              {saved && (
                <p className="success-message" role="status">
                  사용자 정보가 이 브라우저에 저장되었습니다.
                </p>
              )}
            </div>
          )}

          <div className="button-row">
            <button className="secondary-button" type="button" onClick={goBack} disabled={stepIndex === 0}>
              이전
            </button>
            {stepIndex < steps.length - 1 ? (
              <button className="primary-button" type="button" onClick={goNext}>
                다음
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={saveUserInfo}>
                저장하기
              </button>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
