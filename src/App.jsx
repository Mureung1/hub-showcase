import './App.css';

function App() {
  return (
    <main className="container">
      <section className="card">
        <p className="label">AI Agent Challenge Project</p>

        <h1>대학생 맞춤형 링커리어 공고 추천 및 자기소개서 작성 Agent</h1>

        <p className="description">
          링커리어에 올라오는 인턴, 대외활동, 공모전, 신입 공고를 기준으로
          사용자의 전공, 경험, 기술 스택, 관심 직무와 비교해 맞춤형 공고를 추천하고,
          지원 준비까지 도와주는 Agent 서비스입니다.
        </p>

        <div className="section">
          <h2>해결하고 싶은 문제</h2>
          <p>
            대학생은 인턴, 대외활동, 공모전, 신입 공고를 찾기 위해 여러 공고를 직접 확인해야 합니다.
            하지만 공고가 많아질수록 자신에게 맞는 기회를 찾는 데 시간이 오래 걸리고,
            지원할 공고를 찾더라도 자신의 경험을 자기소개서에 어떻게 연결해야 할지 고민이 됩니다.
          </p>
        </div>

        <div className="section">
          <h2>핵심 기능</h2>
          <ul>
            <li>사용자 프로필 입력: 전공, 학년, 경험, 기술 스택, 관심 직무</li>
            <li>링커리어 공고 정보 확인 및 맞춤형 추천</li>
            <li>사용자 정보와 공고 조건을 비교한 적합도 분석</li>
            <li>추천 이유와 부족한 역량 정리</li>
            <li>관심 공고 알림 및 마감일 관리</li>
            <li>공고별 자기소개서 초안 생성</li>
          </ul>
        </div>

        <div className="section">
          <h2>Agent 역할</h2>
          <p>
            Agent는 공고를 단순히 나열하는 것이 아니라, 사용자의 프로필과 공고의 자격 요건,
            우대사항, 활동 내용, 직무 내용을 비교해 적합도와 추천 이유를 설명합니다.
            또한 자기소개서 문항이 있는 경우 사용자의 경험을 바탕으로 초안을 작성해줍니다.
          </p>
        </div>

        <div className="section">
          <h2>4주 목표</h2>
          <p>
            4주 안에는 링커리어 공고 데이터를 기준으로 사용자에게 맞는 공고를 추천하고,
            선택한 공고에 대해 적합도 분석과 자기소개서 초안을 제공하는 프로토타입을 만드는 것을 목표로 합니다.
            공고 수집 방식과 자동 알림 범위는 피드백을 받은 뒤 조정할 계획입니다.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;