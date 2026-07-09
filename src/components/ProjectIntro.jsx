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
    description: '정해진 문항 유형별 답변 흐름과 발화 속도를 함께 점검하는 시험입니다.',
    tags: ['목표 점수', '답변 유형'],
  },
  {
    name: 'TOEFL',
    description: '읽기, 듣기, 말하기, 쓰기 영역을 균형 있게 준비해야 하는 학업 목적 시험입니다.',
    tags: ['목표 점수', '4개 영역'],
  },
]

const WEAK_AREAS = ['듣기 집중도', '문법 정확도', '말하기 구성', '쓰기 시간 관리']

function ProjectIntro() {
  const [activeScreen, setActiveScreen] = useState('intro')
  const [selectedExam, setSelectedExam] = useState('TOEIC')

  const screenTitle = MENU_ITEMS.find((item) => item.id === activeScreen)?.label

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
            시험 선택부터 정보 입력, 취약 영역 진단, 학습 계획 확인까지 한 화면 안에서 차분하게 이동할 수
            있는 UI 프로토타입입니다.
          </p>
          <div className="intro-summary">
            <span className="summary-pill">현재 화면: {screenTitle}</span>
            <span className="summary-pill">선택 시험: {selectedExam}</span>
            <span className="summary-pill">데이터 저장 전 프로토타입</span>
          </div>
        </header>

        {activeScreen === 'intro' && <IntroScreen />}
        {activeScreen === 'exam' && (
          <ExamSelection selectedExam={selectedExam} onSelectExam={setSelectedExam} />
        )}
        {activeScreen === 'info' && <InfoInput selectedExam={selectedExam} />}
        {activeScreen === 'diagnosis' && <DiagnosisScreen selectedExam={selectedExam} />}
        {activeScreen === 'plan' && <PlanDashboard selectedExam={selectedExam} />}
      </div>
    </section>
  )
}

function IntroScreen() {
  return (
    <section className="feature-section">
      <div className="section-head">
        <h2>서비스 소개</h2>
        <p>대학생이 어학시험 준비 조건을 빠르게 정리하고, 오늘 할 일을 확인하는 데 초점을 둡니다.</p>
      </div>
      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">1</span>
            <h3>시험과 목표 정리</h3>
          </div>
          <p className="feature-description">
            TOEIC, OPIc, TOEIC Speaking, TOEFL 중 준비할 시험을 고르고 목표를 입력합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">2</span>
            <h3>취약 영역 확인</h3>
          </div>
          <p className="feature-description">
            현재 점수와 사용자가 느끼는 어려움을 바탕으로 보완이 필요한 영역을 정리합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">3</span>
            <h3>오늘의 계획 확인</h3>
          </div>
          <p className="feature-description">
            시험일까지 남은 기간과 하루 가능 시간을 기준으로 학습 흐름을 한눈에 봅니다.
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
        <p>준비할 시험을 선택하면 다음 입력 단계에서 같은 시험 정보가 요약되어 보입니다.</p>
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

function InfoInput({ selectedExam }) {
  return (
    <section className="form-section">
      <div className="section-head">
        <h2>정보 입력</h2>
        <p>{selectedExam} 준비에 필요한 기본 정보를 입력하는 화면입니다. 아직 저장 기능은 연결하지 않았습니다.</p>
      </div>

      <div className="input-grid">
        <label className="input-field">
          <span>현재 점수</span>
          <input type="text" placeholder="예: 650 또는 IM2" />
        </label>
        <label className="input-field">
          <span>목표 점수</span>
          <input type="text" placeholder="예: 850 또는 IH" />
        </label>
        <label className="input-field">
          <span>시험일</span>
          <input type="date" />
        </label>
        <label className="input-field">
          <span>하루 가능 시간</span>
          <input type="text" placeholder="예: 평일 2시간" />
        </label>
      </div>
    </section>
  )
}

function DiagnosisScreen({ selectedExam }) {
  return (
    <section className="diagnosis-section">
      <div className="section-head">
        <h2>취약 영역 진단</h2>
        <p>{selectedExam} 학습 계획을 만들기 전, 우선 보완할 영역을 가볍게 표시하는 프로토타입입니다.</p>
      </div>

      <div className="weak-grid">
        {WEAK_AREAS.map((area, index) => (
          <button className={index === 0 ? 'weak-card weak-card-active' : 'weak-card'} key={area} type="button">
            <span className="weak-number">0{index + 1}</span>
            <strong>{area}</strong>
            <span>진단 연결 전 예시 항목</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PlanDashboard({ selectedExam }) {
  return (
    <section className="dashboard-section">
      <div className="section-head">
        <h2>학습 계획</h2>
        <p>{selectedExam} 목표 달성을 위한 오늘의 학습 현황을 카드형 대시보드로 보여줍니다.</p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card-blue">
          <span>남은 시험일</span>
          <strong>D-42</strong>
          <p>시험일까지 남은 기간 예시</p>
        </article>
        <article className="dashboard-card">
          <span>오늘의 학습</span>
          <strong>듣기 40분</strong>
          <p>파트별 오답 정리 20분 포함</p>
        </article>
        <article className="dashboard-card dashboard-card-pink">
          <span>주간 완료율</span>
          <strong>68%</strong>
          <p>이번 주 계획 7개 중 5개 완료</p>
        </article>
      </div>
    </section>
  )
}

export default ProjectIntro
