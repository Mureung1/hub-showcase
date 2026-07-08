const coreValues = [
  '자연어 조건 입력',
  'LLM API 기반 조건 추출',
  '네이버 지역·블로그 검색 기반 후보 수집',
  '조건 기반 점수화',
  '후보 3개 추천 및 단체방 공유 문장 생성',
];

const mvpScope = [
  '조건 추출 AI',
  '네이버 지역·블로그 검색 기반 후보 수집',
  '후보 3개 추천 및 공유 문장 생성',
];

export default function ProjectIntro() {
  return (
    <section className="project-intro" aria-labelledby="project-intro-title">
      <div className="project-intro__header">
        <p className="project-intro__eyebrow">AI 장소 의사결정 서비스</p>
        <h2 id="project-intro-title">플레이스픽 AI</h2>
        <p className="project-intro__description">
          모임 장소 조건을 자연어로 입력하면 AI가 네이버 검색 결과를 기반으로
          장소 후보 3개와 추천 이유를 제공하는 서비스입니다.
        </p>
      </div>

      <div className="project-intro__content">
        <article className="project-intro__card">
          <h3>핵심 가치</h3>
          <ul>
            {coreValues.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </article>

        <article className="project-intro__card">
          <h3>MVP 범위</h3>
          <ul>
            {mvpScope.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
