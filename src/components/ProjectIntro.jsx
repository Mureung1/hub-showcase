import { useEffect, useState } from 'react'
import { WEAK_AREAS_BY_EXAM } from '../constants/examAreas'

const MENU_ITEMS = [
  { id: 'intro', label: '서비스 소개' },
  { id: 'exam', label: '시험 선택' },
  { id: 'info', label: '정보 입력' },
  { id: 'diagnosis', label: '취약 영역 진단' },
  { id: 'plan', label: '학습 계획' },
]

const EXAMS = [
  {
    name: 'TOEIC',
    description: '취업과 졸업 요건에 자주 쓰이는 시험으로, 듣기와 읽기 점수를 중심으로 준비합니다.',
    tags: ['목표 점수', 'LC/RC'],
  },
  {
    name: 'OPIc',
    description: '일상과 경험을 바탕으로 말하기 답변을 구성하고, 목표 등급에 맞춰 연습합니다.',
    tags: ['목표 등급', '말하기'],
  },
  {
    name: 'TOEIC Speaking',
    description: '정해진 문항 유형별 답변, 발화 속도, 전달력을 함께 평가하는 시험입니다.',
    tags: ['목표 점수', '말하기 유형'],
  },
  {
    name: 'TOEFL',
    description: '읽기, 듣기, 말하기, 쓰기 영역을 균형 있게 준비해야 하는 학업 목적 시험입니다.',
    tags: ['목표 점수', '4개 영역'],
  },
]

const INITIAL_FORM_VALUES = {
  currentScore: '',
  targetScore: '',
  examDate: '',
  dailyStudyMinutes: '',
}

const STUDY_PLAN_ID_STORAGE_KEY = 'studyPlanId'
const DEFAULT_TOEFL_SCORE_SYSTEM = 'scaled'
const TOEFL_SCORE_SYSTEMS = {
  scaled: { label: '1.0~6.0 점수', placeholder: '예: 5.5' },
  ibt: { label: '0~120 점수', placeholder: '예: 95' },
}
const OPIC_GRADES = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
const FRIENDLY_RESPONSE_ERROR_MESSAGE = '서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const DEFAULT_SAVE_ERROR_MESSAGE = '학습 계획을 저장하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.'
const DEFAULT_LOOKUP_ERROR_MESSAGE = '저장된 학습 계획을 다시 불러오지 못했습니다. 정보를 다시 입력해 주세요.'

function ProjectIntro() {
  const [activeScreen, setActiveScreen] = useState('intro')
  const [selectedExam, setSelectedExam] = useState('TOEIC')
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [toeflScoreSystem, setToeflScoreSystem] = useState(DEFAULT_TOEFL_SCORE_SYSTEM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [savedStudyPlan, setSavedStudyPlan] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const screenTitle = MENU_ITEMS.find((item) => item.id === activeScreen)?.label

  useEffect(() => {
    let isMounted = true
    const savedStudyPlanId = localStorage.getItem(STUDY_PLAN_ID_STORAGE_KEY)

    if (!savedStudyPlanId) {
      return undefined
    }

    async function restoreSavedStudyPlan() {
      try {
        const studyPlan = await fetchStudyPlanById(savedStudyPlanId)

        if (!isMounted) {
          return
        }

        setSavedStudyPlan(studyPlan)
        setSelectedExam(studyPlan.examType)
        setActiveScreen('plan')
      } catch (error) {
        localStorage.removeItem(STUDY_PLAN_ID_STORAGE_KEY)

        if (!isMounted) {
          return
        }

        setErrorMessage(error.message || DEFAULT_LOOKUP_ERROR_MESSAGE)
        setActiveScreen('info')
      }
    }

    restoreSavedStudyPlan()

    return () => {
      isMounted = false
    }
  }, [])

  function updateFormValue(fieldName, value) {
    setFieldErrors((currentErrors) => ({ ...currentErrors, [fieldName]: '' }))
    setFormValues((currentValues) => ({ ...currentValues, [fieldName]: value }))
  }

  function handleSelectExam(examName) {
    setSelectedExam(examName)
    setFormValues(INITIAL_FORM_VALUES)
    setToeflScoreSystem(DEFAULT_TOEFL_SCORE_SYSTEM)
    setFieldErrors({})
    setErrorMessage('')
  }

  function handleToeflScoreSystemChange(scoreSystem) {
    setToeflScoreSystem(scoreSystem)
    setFormValues((currentValues) => ({ ...currentValues, currentScore: '', targetScore: '' }))
    setFieldErrors({})
    setErrorMessage('')
  }

  async function handleSaveStudyPlan() {
    setIsSaving(true)
    setErrorMessage('')
    setFieldErrors({})

    const dailyStudyMinutes = Number(formValues.dailyStudyMinutes)

    if (!Number.isInteger(dailyStudyMinutes)) {
      setIsSaving(false)
      setErrorMessage('하루 공부 시간은 분 단위 숫자로 입력해 주세요.')
      return
    }

    const scoreValidationErrors = validateScoreInputs(selectedExam, toeflScoreSystem, formValues)

    if (Object.keys(scoreValidationErrors).length > 0) {
      setIsSaving(false)
      setFieldErrors(scoreValidationErrors)
      return
    }

    const currentScore = formValues.currentScore.trim()
    const requestBody = {
      examType: selectedExam,
      isFirstAttempt: currentScore === '',
      currentScore: currentScore || null,
      targetScore: formValues.targetScore.trim(),
      examDate: formValues.examDate,
      dailyStudyMinutes,
    }

    try {
      const createResponse = await fetch('/api/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const createResult = await parseJsonResponse(createResponse)

      if (!createResponse.ok) {
        throw new Error(getResponseMessage(createResult) || DEFAULT_SAVE_ERROR_MESSAGE)
      }

      const studyPlanId = createResult?.data?.id

      if (!studyPlanId) {
        throw new Error('저장된 학습 계획 id를 확인하지 못했습니다.')
      }

      localStorage.setItem(STUDY_PLAN_ID_STORAGE_KEY, studyPlanId)

      let studyPlan

      try {
        studyPlan = await fetchStudyPlanById(studyPlanId)
      } catch (error) {
        localStorage.removeItem(STUDY_PLAN_ID_STORAGE_KEY)
        throw error
      }

      setSavedStudyPlan(studyPlan)
      setSelectedExam(studyPlan.examType)
      setActiveScreen('plan')
    } catch (error) {
      setErrorMessage(error.message || DEFAULT_SAVE_ERROR_MESSAGE)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="project-intro">
      <nav className="top-menu" aria-label="학습 계획 화면 메뉴">
        <div className="top-menu-inner">
          <span className="brand-mark">Study Plan</span>
          <div className="menu-list">
            {MENU_ITEMS.map((item) => (
              <button
                className={`menu-button ${activeScreen === item.id ? 'menu-button-active' : ''}`}
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="intro-shell">
        <header className="intro-header">
          <span className="intro-label">STEP {MENU_ITEMS.findIndex((item) => item.id === activeScreen) + 1}/5</span>
          <h1>준비할 시험과 목표를 정리해 학습 흐름을 만들어 보세요</h1>
          <p className="intro-tagline">
            시험 선택부터 정보 입력, 취약 영역 진단, 학습 계획 확인까지 한 화면 안에서 차분하게 이동할 수 있는
            학습 계획 프로토타입입니다.
          </p>
          <div className="intro-summary">
            <span className="summary-pill">현재 화면: {screenTitle}</span>
            <span className="summary-pill">선택 시험: {selectedExam}</span>
            <span className="summary-pill">{savedStudyPlan ? 'DB 저장 완료' : 'DB 저장 전'}</span>
          </div>
        </header>

        {activeScreen === 'intro' && <IntroScreen />}
        {activeScreen === 'exam' && (
          <ExamSelection
            selectedExam={selectedExam}
            onPrevious={() => setActiveScreen('intro')}
            onNext={() => setActiveScreen('info')}
            onSelectExam={handleSelectExam}
          />
        )}
        {activeScreen === 'info' && (
          <InfoInput
            errorMessage={errorMessage}
            fieldErrors={fieldErrors}
            formValues={formValues}
            isSaving={isSaving}
            selectedExam={selectedExam}
            toeflScoreSystem={toeflScoreSystem}
            onSave={handleSaveStudyPlan}
            onToeflScoreSystemChange={handleToeflScoreSystemChange}
            onUpdate={updateFormValue}
          />
        )}
        {activeScreen === 'diagnosis' && <DiagnosisScreen selectedExam={selectedExam} />}
        {activeScreen === 'plan' && <PlanDashboard savedStudyPlan={savedStudyPlan} selectedExam={selectedExam} />}
      </div>
    </section>
  )
}

async function fetchStudyPlanById(studyPlanId) {
  const lookupResponse = await fetch(`/api/study-plans/${studyPlanId}`)
  const lookupResult = await parseJsonResponse(lookupResponse)

  if (!lookupResponse.ok) {
    throw new Error(getResponseMessage(lookupResult) || DEFAULT_LOOKUP_ERROR_MESSAGE)
  }

  return lookupResult.data
}

async function parseJsonResponse(response) {
  const responseText = await response.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText)
  } catch {
    throw new Error(FRIENDLY_RESPONSE_ERROR_MESSAGE)
  }
}

function getResponseMessage(responseBody) {
  return responseBody?.message || responseBody?.error?.message || ''
}

function validateScoreInputs(selectedExam, toeflScoreSystem, formValues) {
  const currentScore = formValues.currentScore.trim()
  const targetScore = formValues.targetScore.trim()
  const errors = {}

  if (!targetScore) {
    errors.targetScore = '목표 점수 또는 목표 등급을 입력해 주세요.'
    return errors
  }

  if (selectedExam === 'OPIc') {
    validateOpicScores(currentScore, targetScore, errors)
    return errors
  }

  const currentNumber = currentScore ? Number(currentScore) : null
  const targetNumber = Number(targetScore)

  if (selectedExam === 'TOEIC') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 10,
      max: 990,
      step: 5,
      required: false,
      integerOnly: true,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 10,
      max: 990,
      step: 5,
      required: true,
      integerOnly: true,
    })
  }

  if (selectedExam === 'TOEFL' && toeflScoreSystem === 'scaled') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 1,
      max: 6,
      step: 0.5,
      required: false,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 1,
      max: 6,
      step: 0.5,
      required: true,
    })
  }

  if (selectedExam === 'TOEFL' && toeflScoreSystem === 'ibt') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 0,
      max: 120,
      step: 1,
      required: false,
      integerOnly: true,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 0,
      max: 120,
      step: 1,
      required: true,
      integerOnly: true,
    })
  }

  if (selectedExam === 'TOEIC Speaking') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 0,
      max: 200,
      step: 10,
      required: false,
      integerOnly: true,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 0,
      max: 200,
      step: 10,
      required: true,
      integerOnly: true,
    })
  }

  if (currentScore && !errors.currentScore && !errors.targetScore && targetNumber <= currentNumber) {
    errors.targetScore = '목표 점수는 현재 점수보다 높아야 합니다.'
  }

  return errors
}

function validateNumericScore(fieldName, rawValue, numericValue, errors, rule) {
  if (!rawValue && !rule.required) {
    return
  }

  if (!rawValue && rule.required) {
    errors[fieldName] = `${rule.label}를 입력해 주세요.`
    return
  }

  if (!Number.isFinite(numericValue)) {
    errors[fieldName] = `${rule.label}는 숫자로 입력해 주세요.`
    return
  }

  if (rule.integerOnly && !Number.isInteger(numericValue)) {
    errors[fieldName] = `${rule.label}는 정수로 입력해 주세요.`
    return
  }

  if (numericValue < rule.min || numericValue > rule.max) {
    errors[fieldName] = `${rule.label}는 ${rule.min}~${rule.max} 범위로 입력해 주세요.`
    return
  }

  const hasValidStep =
    rule.step === 0.5
      ? Number.isInteger(numericValue * 2)
      : Number.isInteger((numericValue - rule.min) / rule.step)

  if (!hasValidStep) {
    errors[fieldName] = `${rule.label}는 ${rule.step} 단위로 입력해 주세요.`
  }
}

function validateOpicScores(currentScore, targetScore, errors) {
  const currentGradeIndex = currentScore ? OPIC_GRADES.indexOf(currentScore) : -1
  const targetGradeIndex = OPIC_GRADES.indexOf(targetScore)

  if (currentScore && currentGradeIndex === -1) {
    errors.currentScore = '현재 등급을 목록에서 선택해 주세요.'
  }

  if (targetGradeIndex === -1) {
    errors.targetScore = '목표 등급을 목록에서 선택해 주세요.'
  }

  if (currentScore && currentGradeIndex !== -1 && targetGradeIndex !== -1 && targetGradeIndex <= currentGradeIndex) {
    errors.targetScore = '목표 등급은 현재 등급보다 높아야 합니다.'
  }
}

function IntroScreen() {
  return (
    <section className="feature-section">
      <div className="section-head">
        <h2>서비스 소개</h2>
        <p>대학생의 어학시험 준비 조건을 빠르게 정리하고, 오늘 확인할 학습 계획으로 이어지는 화면입니다.</p>
      </div>
      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">1</span>
            <h3>시험과 목표 정리</h3>
          </div>
          <p className="feature-description">
            TOEIC, OPIc, TOEIC Speaking, TOEFL 중 준비할 시험을 고르고 목표 점수 또는 등급을 입력합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">2</span>
            <h3>현재 상태 선택 입력</h3>
          </div>
          <p className="feature-description">
            현재 점수나 등급은 사용자가 공개하고 싶을 때만 입력하고, 목표 값은 시험별 규칙에 맞춰 확인합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">3</span>
            <h3>저장 결과 확인</h3>
          </div>
          <p className="feature-description">
            입력한 정보가 서버와 Supabase에 저장된 뒤 다시 조회된 결과를 학습 계획 화면에서 확인합니다.
          </p>
        </article>
      </div>
    </section>
  )
}

function ExamSelection({ selectedExam, onNext, onPrevious, onSelectExam }) {
  const [hasSelectedExam, setHasSelectedExam] = useState(false)

  return (
    <section className="exam-section">
      <div className="section-head">
        <h2>시험 선택</h2>
        <p>준비할 시험을 선택하면 다음 입력 단계에서 같은 시험 기준의 정보가 저장됩니다.</p>
      </div>

      <div className="exam-grid">
        {EXAMS.map((exam) => {
          const isSelected = selectedExam === exam.name

          return (
            <button
              aria-pressed={isSelected}
              className={`exam-card ${isSelected ? 'exam-card-selected' : ''}`}
              key={exam.name}
              type="button"
              onClick={() => {
                setHasSelectedExam(true)
                onSelectExam(exam.name)
              }}
            >
              {isSelected && (
                <span aria-hidden="true" className="exam-card-check">
                  ✓
                </span>
              )}
              <h3 className="exam-title">{exam.name}</h3>
              <p className="exam-description">{exam.description}</p>
              <ul className="exam-meta">
                {exam.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
      <div className="form-actions">
        <button className="secondary-action" type="button" onClick={onPrevious}>
          이전
        </button>
        <button className="primary-action" type="button" disabled={!hasSelectedExam || !selectedExam} onClick={onNext}>
          다음
        </button>
      </div>
    </section>
  )
}

function InfoInput({
  errorMessage,
  fieldErrors,
  formValues,
  isSaving,
  selectedExam,
  toeflScoreSystem,
  onSave,
  onToeflScoreSystemChange,
  onUpdate,
}) {
  return (
    <section className="form-section">
      <div className="section-head">
        <h2>정보 입력</h2>
        <p>{selectedExam} 준비에 필요한 기본 정보를 입력하면 서버에 저장하고 DB 결과를 다시 불러옵니다.</p>
      </div>

      {selectedExam === 'TOEFL' && (
        <div className="toefl-score-system">
          <span className="input-label">TOEFL 점수 체계</span>
          <SegmentedOptionGroup
            ariaLabel="TOEFL 점수 체계"
            options={Object.entries(TOEFL_SCORE_SYSTEMS).map(([value, option]) => ({
              label: option.label,
              value,
            }))}
            selectedValue={toeflScoreSystem}
            onSelect={onToeflScoreSystemChange}
          />
        </div>
      )}

      <div className={`input-grid ${selectedExam === 'OPIc' ? 'opic-score-grid' : ''}`}>
        <ScoreField
          errorMessage={fieldErrors.currentScore}
          fieldName="currentScore"
          label={selectedExam === 'OPIc' ? '현재 등급' : '현재 점수'}
          selectedExam={selectedExam}
          toeflScoreSystem={toeflScoreSystem}
          value={formValues.currentScore}
          onUpdate={onUpdate}
        />
        <ScoreField
          errorMessage={fieldErrors.targetScore}
          fieldName="targetScore"
          label={selectedExam === 'OPIc' ? '목표 등급' : '목표 점수'}
          selectedExam={selectedExam}
          toeflScoreSystem={toeflScoreSystem}
          value={formValues.targetScore}
          onUpdate={onUpdate}
        />
        <label className="input-field">
          <span>시험일</span>
          <input type="date" value={formValues.examDate} onChange={(event) => onUpdate('examDate', event.target.value)} />
        </label>
        <label className="input-field">
          <span>하루 공부 시간(분)</span>
          <input
            min="1"
            max="720"
            type="number"
            value={formValues.dailyStudyMinutes}
            placeholder="예: 120"
            onChange={(event) => onUpdate('dailyStudyMinutes', event.target.value)}
          />
        </label>
      </div>

      {errorMessage && <p className="form-message form-message-error">{errorMessage}</p>}

      <div className="form-actions">
        <button className="primary-action" type="button" disabled={isSaving} onClick={onSave}>
          {isSaving ? '저장 중...' : '저장하고 학습 계획 보기'}
        </button>
      </div>
    </section>
  )
}

function SegmentedOptionGroup({ ariaLabel, options, selectedValue, onSelect }) {
  return (
    <div aria-label={ariaLabel} className="segmented-control" role="group">
      {options.map((option) => (
        <button
          aria-pressed={selectedValue === option.value}
          className={`segmented-button ${selectedValue === option.value ? 'option-button-selected' : ''}`}
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ScoreField({ errorMessage, fieldName, label, selectedExam, toeflScoreSystem, value, onUpdate }) {
  const inputId = `${fieldName}-input`
  const errorId = `${fieldName}-error`

  if (selectedExam === 'OPIc') {
    return (
      <div className="input-field">
        <span>{label}</span>
        <div
          aria-describedby={errorMessage ? errorId : undefined}
          aria-label={label}
          className="grade-button-grid"
          role="group"
        >
          {OPIC_GRADES.map((grade) => {
            const isSelected = value === grade
            const nextValue = fieldName === 'currentScore' && isSelected ? '' : grade

            return (
              <button
                aria-pressed={isSelected}
                className={`grade-button ${isSelected ? 'option-button-selected' : ''}`}
                key={grade}
                type="button"
                onClick={() => onUpdate(fieldName, nextValue)}
              >
                {grade}
              </button>
            )
          })}
        </div>
        {errorMessage && (
          <span className="form-message form-message-error" id={errorId}>
            {errorMessage}
          </span>
        )}
      </div>
    )
  }

  return (
    <label className="input-field" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-describedby={errorMessage ? errorId : undefined}
        aria-invalid={Boolean(errorMessage)}
        id={inputId}
        type="number"
        value={value}
        placeholder={getScorePlaceholder(selectedExam, toeflScoreSystem)}
        onChange={(event) => onUpdate(fieldName, event.target.value)}
      />
      {errorMessage && (
        <span className="form-message form-message-error" id={errorId}>
          {errorMessage}
        </span>
      )}
    </label>
  )
}

function getScorePlaceholder(selectedExam, toeflScoreSystem) {
  if (selectedExam === 'TOEFL') {
    return TOEFL_SCORE_SYSTEMS[toeflScoreSystem].placeholder
  }

  if (selectedExam === 'TOEIC Speaking') {
    return '예: 140'
  }

  return '예: 650'
}

function DiagnosisScreen({ selectedExam }) {
  const [selectedWeakAreas, setSelectedWeakAreas] = useState([])
  const weakAreas = WEAK_AREAS_BY_EXAM[selectedExam] || []

  function toggleWeakArea(area) {
    setSelectedWeakAreas((currentAreas) => {
      if (currentAreas.includes(area)) {
        return currentAreas.filter((selectedArea) => selectedArea !== area)
      }

      return [...currentAreas, area]
    })
  }

  return (
    <section className="diagnosis-section">
      <div className="section-head">
        <h2>취약 영역 진단</h2>
        <p>{selectedExam} 학습 계획을 만들기 전 우선 보완할 영역을 가볍게 표시하는 프로토타입입니다.</p>
      </div>

      <div className="weak-grid">
        {weakAreas.map((area, index) => {
          const isSelected = selectedWeakAreas.includes(area)

          return (
            <button
              aria-pressed={isSelected}
              className={isSelected ? 'weak-card weak-card-active' : 'weak-card'}
              key={area}
              type="button"
              onClick={() => toggleWeakArea(area)}
            >
              <span className="weak-number">0{index + 1}</span>
              <strong>{area}</strong>
              <span>진단 연결 예정 항목</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function PlanDashboard({ savedStudyPlan, selectedExam }) {
  return (
    <section className="dashboard-section">
      <div className="section-head">
        <h2>학습 계획</h2>
        <p>
          {savedStudyPlan
            ? 'Supabase에 저장한 뒤 다시 조회한 학습 계획 정보입니다.'
            : `${selectedExam} 목표 달성을 위한 학습 계획 결과가 이곳에 표시됩니다.`}
        </p>
      </div>

      {savedStudyPlan ? (
        <div className="result-panel">
          <div className="result-item">
            <span>시험 종류</span>
            <strong>{savedStudyPlan.examType}</strong>
          </div>
          <div className="result-item">
            <span>현재 점수</span>
            <strong>{savedStudyPlan.currentScore || '미입력'}</strong>
          </div>
          <div className="result-item">
            <span>목표 점수</span>
            <strong>{savedStudyPlan.targetScore}</strong>
          </div>
          <div className="result-item">
            <span>시험일</span>
            <strong>{savedStudyPlan.examDate}</strong>
          </div>
          <div className="result-item">
            <span>하루 공부 시간</span>
            <strong>{savedStudyPlan.dailyStudyMinutes}분</strong>
          </div>
          <div className="result-item result-item-wide">
            <span>저장된 데이터 id</span>
            <strong>{savedStudyPlan.id}</strong>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          <article className="dashboard-card dashboard-card-blue">
            <span>남은 시험일</span>
            <strong>D-42</strong>
            <p>정보 입력 화면에서 저장하면 실제 DB 결과가 이 영역에 표시됩니다.</p>
          </article>
          <article className="dashboard-card">
            <span>오늘의 학습</span>
            <strong>읽기 40분</strong>
            <p>저장 전 기본 예시 카드입니다.</p>
          </article>
          <article className="dashboard-card dashboard-card-pink">
            <span>주간 완료율</span>
            <strong>68%</strong>
            <p>이후 학습 기록 기능과 연결될 예정입니다.</p>
          </article>
        </div>
      )}
    </section>
  )
}

export default ProjectIntro
