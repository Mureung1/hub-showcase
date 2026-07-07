function AboutProject() {
  return (
    <div className="about-project">
      <header className="about-header">
        <h1>스펙핏 <span className="badge">SpecFit</span></h1>
        <p className="subtitle">내 스펙으로 지원 가능한 공고, 한눈에 확인하세요</p>
      </header>

      <section className="about-section">
        <h2>🎯 문제 정의</h2>
        <p>
          취업 준비 중인 대학생은 관심 공고에 지원할지 말지 고민할 때,
          자신의 스펙이 부족한지 충분한지 판단할 기준이 없어 막막함을 겪습니다.
        </p>
      </section>

      <section className="about-section">
        <h2>🔍 핵심 기능</h2>
        <ul className="feature-list">
          <li>① 스펙 입력 — 학력, 경력, 자격증, 전공, 외국어 성적 등</li>
          <li>② 조건 필터링 — 직종, 근무지역, 고용형태, 희망 급여</li>
          <li className="highlight">③ 갭 분석 엔진 (핵심) — 지원 가능 비율 계산 + 보완 시뮬레이션</li>
          <li className="highlight">④ 시각화 결과 화면 (핵심) — 도넛 차트, 막대 그래프, 체크리스트</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>🧭 사용자 시나리오</h2>
        <ol className="scenario-list">
          <li>관심 직종/지역/고용형태로 채용공고 목록 필터링</li>
          <li>자신의 스펙(학력, 경력, 자격증, 전공, 외국어) 입력</li>
          <li>지원 가능 비율을 도넛 차트로 확인</li>
          <li>부족한 역량 랭킹(막대 그래프)으로 보완 효과 확인</li>
          <li>개별 공고 클릭 시 충족/미충족 체크리스트 확인</li>
        </ol>
      </section>

      <section className="about-section">
        <h2>🛠 기술 스택</h2>
        <table className="tech-table">
          <tbody>
            <tr><td>Frontend</td><td>React + Recharts</td></tr>
            <tr><td>Backend</td><td>Node.js/Express 또는 Python/FastAPI</td></tr>
            <tr><td>DB</td><td>SQLite</td></tr>
            <tr><td>데이터 소스</td><td>한국고용정보원_워크넷 채용정보 오픈 API</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default AboutProject;