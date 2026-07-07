import "./App.css";

function App() {
  return (
    <main className="page">
      <nav className="nav">
        <h2>CalMe</h2>
        <div>
          <a>서비스 소개</a>
          <a>핵심 기능</a>
          <a>사용 방법</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-text">
          <p className="badge">AI 기반 대학생 일정 자동 정리 캘린더</p>
          <h1>
            공지만 올리면,
            <br />
            일정 정리는 CalMe가
          </h1>
          <p>
            캘미(CalMe)는 Calendar + Me의 의미와 “Call Me”의 발음을 활용한 이름입니다.
            일정 관리가 필요할 때 나만의 AI 캘린더를 불러보세요.
          </p>
          <button>CalMe 시작하기</button>
        </div>

        <div className="hero-card">
          <h3>오늘의 자동 추출 일정</h3>
          <div className="schedule-item">
            <span>D-3</span>
            <p>공모전 신청 마감</p>
          </div>
          <div className="schedule-item">
            <span>D-7</span>
            <p>팀플 발표 자료 제출</p>
          </div>
          <div className="schedule-item">
            <span>D-12</span>
            <p>장학금 신청 기간 종료</p>
          </div>
        </div>
      </section>

      <section className="problem">
        <h2>대학생의 일정 관리, 왜 어려울까요?</h2>
        <div className="problem-grid">
          <article>
            <strong>공지 확인이 번거로움</strong>
            <p>PDF, 이미지, 링크 속 정보를 직접 읽어야 합니다.</p>
          </article>
          <article>
            <strong>마감일을 놓치기 쉬움</strong>
            <p>과제, 시험, 공모전, 비교과 일정이 흩어져 있습니다.</p>
          </article>
          <article>
            <strong>캘린더 입력이 귀찮음</strong>
            <p>중요한 날짜를 직접 옮기는 과정이 반복됩니다.</p>
          </article>
        </div>
      </section>

      <section className="features-section">
        <h2>CalMe 핵심 기능</h2>
        <div className="features">
          <article>📂 공지/PDF 업로드</article>
          <article>🤖 AI 중요 정보 요약</article>
          <article>📅 마감일 자동 추출</article>
          <article>🗓 캘린더 자동 등록</article>
          <article>🔍 일정 상세 확인</article>
          <article>⏰ D-Day 리마인드</article>
        </div>
      </section>

      <section className="steps">
        <h2>사용 방법</h2>
        <div className="step-grid">
          <article>
            <span>01</span>
            <h3>공지 업로드</h3>
            <p>PDF, 이미지, 링크를 <br /> 업로드합니다.</p>
          </article>
          <article>
            <span>02</span>
            <h3>AI 분석</h3>
            <p>AI가 마감일, 장소, 준비물을 <br /> 추출합니다.</p>
          </article>
          <article>
            <span>03</span>
            <h3>캘린더 등록</h3>
            <p>중요 일정이 자동으로 정리됩니다.</p>
          </article>
        </div>
      </section>

      <section className="meaning">
        <h2>이름에 담긴 의미</h2>
        <p>
          “일정 관리는 내가 할 테니, 필요할 때 나를 불러(Call Me).”
          <br />
          CalMe는 대학생의 복잡한 공지와 일정을 대신 정리해주는
          나만의 AI 캘린더입니다.
        </p>
      </section>
    </main>
  );
}

export default App;