import './ProjectIntro.css';

function ProjectIntro() {
  return (
    <div className="project-intro">
      <p className="project-intro__eyebrow">AI Agent Challenge · 4주 프로젝트</p>
      <h1 className="project-intro__title">빵지도</h1>
      <p className="project-intro__tagline">
        여러 빵집을 고르면, 가장 효율적인 방문 순서를 자동으로 계산해주는
        대전 베이커리 동선 추천 서비스
      </p>

      <div className="project-intro__section">
        <h2>문제</h2>
        <p>
          빵투어를 계획할 때 동선을 고려하지 않아 이동 시간을 낭비하거나,
          마감시간을 놓쳐 원하는 빵을 못 사는 경우가 많습니다.
        </p>
      </div>

      <div className="project-intro__section">
        <h2>핵심 기능</h2>
        <ul>
          <li>동선 자동 설계 — 선택한 빵집들을 방문하기 가장 효율적인 순서로 계산</li>
          <li>대화형 큐레이터 (부가 기능) — 자연어 요청에 맞는 빵집 추천</li>
        </ul>
      </div>

      <div className="project-intro__tags">
        <span>React</span>
        <span>카카오맵 API</span>
        <span>백엔드 직접 구축</span>
      </div>
    </div>
  );
}

export default ProjectIntro;
