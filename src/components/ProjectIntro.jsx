function ProjectIntro() {
  return (
    <section className="project-intro">
      <header className="intro-header">
        <h1>English Test Planner Agent</h1>
        <p className="intro-tagline">
          시험일까지 남은 기간과 학습 가능 시간을 바탕으로,
          나에게 필요한 영어시험 학습 계획을 설계합니다.
        </p>
        <p className="project-description">
          대학생은 취업, 교환학생, 졸업 요건 등을 위해 영어시험을 준비하지만,
          현재 실력과 남은 기간에 맞춰 무엇을 먼저 공부하고
          하루 학습 시간을 어떻게 나눌지 판단하기 어렵습니다.
        </p>
        <p className="project-additional">
          사용자의 현재 점수 또는 자기 진단 결과를 바탕으로
          취약 영역을 분석하고 날짜별 학습량을 제안합니다.
        </p>
      </header>

      <section className="exam-section">
        <h2>준비할 영어시험을 선택하세요</h2>
        <div className="exam-grid">
          <article className="exam-card">
            <h3>TOEIC</h3>
            <p className="exam-info"><span>목적:</span> 취업 · 졸업 요건</p>
            <p className="exam-info"><span>평가:</span> 듣기 · 읽기</p>
          </article>
          <article className="exam-card">
            <h3>OPIc</h3>
            <p className="exam-info"><span>목적:</span> 취업 · 말하기 성적 제출</p>
            <p className="exam-info"><span>평가:</span> 일상·경험 주제 중심 종합 회화</p>
          </article>
          <article className="exam-card">
            <h3>TOEIC Speaking</h3>
            <p className="exam-info"><span>목적:</span> 취업 · 말하기 성적 제출</p>
            <p className="exam-info"><span>평가:</span> 정해진 문항 유형별 업무·일상 말하기</p>
          </article>
          <article className="exam-card">
            <h3>TOEFL</h3>
            <p className="exam-info"><span>목적:</span> 교환학생 · 유학</p>
            <p className="exam-info"><span>평가:</span> 읽기 · 듣기 · 말하기 · 쓰기</p>
          </article>
        </div>
      </section>

      <section className="feature-section">
        <h2>핵심 기능</h2>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-header">
              <span className="feature-badge">1</span>
              <h3>현재 상태와 취약 영역 분석</h3>
            </div>
            <p className="feature-description">
              현재 점수 또는 자기 진단 결과를 바탕으로 우선 학습 영역을 분석합니다.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-header">
              <span className="feature-badge">2</span>
              <h3>맞춤 학습 계획 생성 및 재조정</h3>
            </div>
            <p className="feature-description">
              시험일까지 날짜별 학습량을 제안하고 학습 결과에 따라 계획을 다시 조정합니다.
            </p>
          </article>
        </div>
      </section>
    </section>
  )
}

export default ProjectIntro
