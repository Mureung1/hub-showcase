import { useState } from 'react'

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
    description: '정해진 문항 유형별 답변, 발화 속도, 전달력을 함께 점검하는 시험입니다.',
    tags: ['목표 점수', '답변 유형'],
  },
  {
    name: 'TOEFL',
    description: '읽기, 듣기, 말하기, 쓰기 영역을 균형 있게 준비해야 하는 학업 목적 시험입니다.',
    tags: ['목표 점수', '4개 영역'],
  },
]

const WEAK_AREAS = ['듣기 집중도', '문법 정확도', '말하기 구성', '읽기 시간 관리']

const INITIAL_FORM_VALUES = {
  currentScore: '',
  targetScore: '',
  examDate: '',
  dailyStudyMinutes: '',
}

function ProjectIntro() {
  const [activeScreen, setActiveScreen] = useState('intro')
  const [selectedExam, setSelectedExam] = useState('TOEIC')
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [savedStudyPlan, setSavedStudyPlan] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const screenTitle = MENU_ITEMS.find((item) => item.id === activeScreen)?.label

  function updateFormValue(fieldName, value) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))
  }

  async function handleSaveStudyPlan() {
    setIsSaving(true)
    setErrorMessage('')

    const dailyStudyMinutes = Number(formValues.dailyStudyMinutes)

    if (!Number.isInteger(dailyStudyMinutes)) {
      setIsSaving(false)
      setErrorMessage('하루 가능 시간은 분 단위 숫자로 입력해 주세요.')
      return
    }

    const requestBody = {
      examType: selectedExam,
      isFirstAttempt: formValues.currentScore.trim() === '',
      currentScore: formValues.currentScore.trim(),
      targetScore: formValues.targetScore.trim(),
      examDate: formValues.examDate,
      dailyStudyMinutes,
    }

    try {
      const createResponse = await fetch('/api/study-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const createResult = await createResponse.json()

      if (!createResponse.ok) {
        throw new Error(createResult?.error?.message || '학습 계획을 저장하지 못했습니다.')
      }

      const studyPlanId = createResult?.data?.id

      if (!studyPlanId) {
        throw new Error('저장된 학습 계획 id를 확인하지 못했습니다.')
      }

      const lookupResponse = await fetch(`/api/study-plans/${studyPlanId}`)
      const lookupResult = await lookupResponse.json()

      if (!lookupResponse.ok) {
        throw new Error(lookupResult?.error?.message || '저장된 학습 계획을 다시 불러오지 못했습니다.')
      }

      setSavedStudyPlan(lookupResult.data)
      setActiveScreen('plan')
    } catch (error) {
      setErrorMessage(error.message || '저장 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.')
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
          <ExamSelection selectedExam={selectedExam} onSelectExam={setSelectedExam} />
        )}
        {activeScreen === 'info' && (
          <InfoInput
            errorMessage={errorMessage}
            formValues={formValues}
            isSaving={isSaving}
            selectedExam={selectedExam}
            onSave={handleSaveStudyPlan}
            onUpdate={updateFormValue}
          />
        )}
        {activeScreen === 'diagnosis' && <DiagnosisScreen selectedExam={selectedExam} />}
        {activeScreen === 'plan' && <PlanDashboard savedStudyPlan={savedStudyPlan} selectedExam={selectedExam} />}
      </div>
    </section>
  )
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
            TOEIC, OPIc, TOEIC Speaking, TOEFL 중 준비할 시험을 고르고 목표 점수나 등급을 입력합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">2</span>
            <h3>현재 상태 확인</h3>
          </div>
          <p className="feature-description">
            현재 점수가 있으면 함께 저장하고, 없으면 처음 응시하는 계획으로 다룹니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">3</span>
            <h3>저장 결과 확인</h3>
          </div>
          <p className="feature-description">
            입력한 정보가 서버와 Supabase에 저장된 뒤, 다시 조회된 결과를 학습 계획 화면에서 확인합니다.
          </p>
        </article>
      </div>
    </section>
  )
}

function ExamSelection({ selectedExam, onSelectExam }) {
  return (
    <section className="exam-section">
      <div className="section-head">
        <h2>시험 선택</h2>
        <p>준비할 시험을 선택하면 다음 입력 단계에서 같은 시험 정보가 저장됩니다.</p>
      </div>

      <div className="exam-grid">
        {EXAMS.map((exam) => (
          <button
            className={`exam-card ${selectedExam === exam.name ? 'exam-card-selected' : ''}`}
            key={exam.name}
            type="button"
            onClick={() => onSelectExam(exam.name)}
          >
            <h3 className="exam-title">{exam.name}</h3>
            <p className="exam-description">{exam.description}</p>
            <ul className="exam-meta">
              {exam.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </section>
  )
}

function InfoInput({ errorMessage, formValues, isSaving, selectedExam, onSave, onUpdate }) {
  return (
    <section className="form-section">
      <div className="section-head">
        <h2>정보 입력</h2>
        <p>{selectedExam} 준비에 필요한 기본 정보를 입력하면 서버에 저장하고 DB 결과를 다시 불러옵니다.</p>
      </div>

      <div className="input-grid">
        <label className="input-field">
          <span>현재 점수</span>
          <input
            type="text"
            value={formValues.currentScore}
            placeholder="예: 650 또는 IM2"
            onChange={(event) => onUpdate('currentScore', event.target.value)}
          />
        </label>
        <label className="input-field">
          <span>목표 점수</span>
          <input
            type="text"
            value={formValues.targetScore}
            placeholder="예: 850 또는 IH"
            onChange={(event) => onUpdate('targetScore', event.target.value)}
          />
        </label>
        <label className="input-field">
          <span>시험일</span>
          <input
            type="date"
            value={formValues.examDate}
            onChange={(event) => onUpdate('examDate', event.target.value)}
          />
        </label>
        <label className="input-field">
          <span>하루 가능 시간(분)</span>
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

function DiagnosisScreen({ selectedExam }) {
  return (
    <section className="diagnosis-section">
      <div className="section-head">
        <h2>취약 영역 진단</h2>
        <p>{selectedExam} 학습 계획을 만들기 전 우선 보완할 영역을 가볍게 표시하는 프로토타입입니다.</p>
      </div>

      <div className="weak-grid">
        {WEAK_AREAS.map((area, index) => (
          <button className={index === 0 ? 'weak-card weak-card-active' : 'weak-card'} key={area} type="button">
            <span className="weak-number">0{index + 1}</span>
            <strong>{area}</strong>
            <span>진단 연결 예정 항목</span>
          </button>
        ))}
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
            <strong>{savedStudyPlan.currentScore || '처음 응시'}</strong>
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
            <span>하루 가능 시간</span>
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
            <strong>듣기 40분</strong>
            <p>저장 전 기본 예시 카드입니다.</p>
          </article>
          <article className="dashboard-card dashboard-card-pink">
            <span>주간 완료율</span>
            <strong>68%</strong>
            <p>이후 학습 기록 기능과 연결할 예정입니다.</p>
          </article>
        </div>
      )}
    </section>
  )
}

export default ProjectIntro
