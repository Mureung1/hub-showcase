const workflowItems = [
  ["01", "Repository 입력", "관심 있는 GitHub 프로젝트 주소를 입력합니다."],
  ["02", "분석 결과 확인", "참여자, 기여 활동, 기술 스택과 구조를 살펴봅니다."],
  ["03", "경험으로 확장", "포트폴리오와 회고에 활용할 핵심 단서를 발견합니다."],
] as const;

export function WorkflowSection() {
  return (
    <section className="workflow-section" id="workflow" aria-labelledby="workflow-title">
      <div className="section-intro workflow-intro">
        <span className="section-label">From repository to reflection</span>
        <h2 id="workflow-title">복잡한 프로젝트 경험을 읽을 수 있는 흐름으로.</h2>
      </div>
      <ol className="workflow-list">
        {workflowItems.map(([number, title, description]) => (
          <li key={number}>
            <span>{number}</span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
