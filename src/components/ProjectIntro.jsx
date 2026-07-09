function ProjectIntro() {
  return (
    <section className="project-intro">
      <div className="intro-shell">
        <header className="intro-header">
          <span className="intro-label">시험 선택</span>
          <h1>준비할 시험을 선택해 주세요</h1>
          <p className="intro-tagline">
            시험 목표와 남은 기간을 바탕으로, 지금 바로 알맞은 학습 흐름을 시작해 보세요.
          </p>
          <div className="intro-summary">
            <span className="summary-pill">시험별 목표 설정</span>
            <span className="summary-pill">취약 영역 분석</span>
            <span className="summary-pill">오늘의 학습 계획</span>
          </div>
        </header>

        <section className="exam-section">
          <div className="section-head">
            <h2>시험 유형</h2>
            <p>각 시험마다 준비 방식이 달라요. 선택된 항목만 명확하게 강조해 보여줍니다.</p>
          </div>

          <div className="exam-grid">
            <button className="exam-card exam-card-selected" type="button">
              <h3 className="exam-title">TOEIC</h3>
              <p className="exam-description">
                취업과 졸업 요건에 자주 쓰이며, 듣기·읽기 중심으로 준비합니다.
              </p>
              <ul className="exam-meta">
                <li>목표 점수</li>
                <li>듣기·읽기</li>
              </ul>
            </button>

            <button className="exam-card" type="button">
              <h3 className="exam-title">OPIc</h3>
              <p className="exam-description">
                말하기 실력을 중심으로 보고, 일상·경험 주제 기반 회화 연습이 필요합니다.
              </p>
              <ul className="exam-meta">
                <li>목표 등급</li>
                <li>말하기</li>
              </ul>
            </button>

            <button className="exam-card" type="button">
              <h3 className="exam-title">TOEIC Speaking</h3>
              <p className="exam-description">
                정해진 유형별 답변 연습이 중요하고, 말하기 흐름을 짧게 점검하는 방식이 효과적입니다.
              </p>
              <ul className="exam-meta">
                <li>목표 점수</li>
                <li>말하기</li>
              </ul>
            </button>

            <button className="exam-card" type="button">
              <h3 className="exam-title">TOEFL</h3>
              <p className="exam-description">
                읽기·듣기·말하기·쓰기를 모두 준비해야 하므로, 전 영역의 균형이 중요합니다.
              </p>
              <ul className="exam-meta">
                <li>목표 점수</li>
                <li>읽기·듣기·말하기·쓰기</li>
              </ul>
            </button>
          </div>
        </section>

        <section className="feature-section">
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-header">
                <span className="feature-badge">1</span>
                <h3>현재 상태와 취약 영역</h3>
              </div>
              <p className="feature-description">
                점수나 자기 진단 결과를 바탕으로 우선 학습 영역을 정리해 줍니다.
              </p>
            </article>
            <article className="feature-card">
              <div className="feature-header">
                <span className="feature-badge">2</span>
                <h3>맞춤 학습 계획</h3>
              </div>
              <p className="feature-description">
                시험일까지 남은 기간과 가능한 시간에 맞춰 오늘의 목표를 제안합니다.
              </p>
            </article>
            <article className="feature-card">
              <div className="feature-header">
                <span className="feature-badge">3</span>
                <h3>진행 상황 추적</h3>
              </div>
              <p className="feature-description">
                완료 여부와 진행률을 확인하며, 다음 계획으로 자연스럽게 이어집니다.
              </p>
            </article>
          </div>
        </section>
      </div>
    </section>
  )
}

export default ProjectIntro
