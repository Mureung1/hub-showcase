const workflowItems = [
  ["01", "Repository 입력", "관심 있는 GitHub 프로젝트 주소를 입력합니다."],
  ["02", "분석 결과 확인", "참여자, 기여 활동, 기술 스택과 구조를 살펴봅니다."],
  ["03", "경험으로 확장", "포트폴리오와 회고에 활용할 핵심 단서를 발견합니다."],
] as const;

export function WorkflowSection() {
  return (
    <section className="grid grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] items-start gap-[clamp(28px,6vw,90px)] border-t border-ptop-line py-[76px] max-[860px]:grid-cols-1" id="workflow" aria-labelledby="workflow-title">
      <div className="grid gap-4">
        <span className="mb-3 block text-[0.78rem] font-extrabold uppercase text-ptop-mint-dark">From repository to reflection</span>
        <h2 className="max-w-[620px] text-[clamp(1.8rem,4vw,3rem)] tracking-[-0.035em]" id="workflow-title">복잡한 프로젝트 경험을 읽을 수 있는 흐름으로.</h2>
      </div>
      <ol className="m-0 grid list-none gap-0 p-0">
        {workflowItems.map(([number, title, description]) => (
          <li className="grid min-h-[118px] grid-cols-[52px_minmax(0,1fr)] gap-[18px] border-b border-ptop-line pb-[30px] pt-[30px] first:pt-0 last:border-0 last:pb-0" key={number}>
            <span className="text-[0.82rem] font-extrabold text-ptop-mint-dark">{number}</span>
            <div>
              <h3 className="m-0 text-[1.08rem] font-bold text-ptop-ink">{title}</h3>
              <p className="mt-2 text-[0.92rem] leading-[1.55] text-ptop-muted">{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
