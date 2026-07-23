// 프로토타입(01_home.html) 우측 AI 컨텍스트 패널의 뼈대.
// 연관 기사 추천(/api/articles/:id/related)과 트렌드 랭킹(/api/trend)은
// 둘 다 api-spec 상 스트레치 기능이라 아직 실제 데이터가 없음 — 레이아웃/빈 상태만 구현.
export default function InsightSidebar() {
  return (
    <aside className="hidden lg:flex w-[360px] shrink-0 flex-col gap-stack-lg sticky top-[104px] self-start">
      <section className="flex flex-col gap-stack-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">연관 기사</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            읽은 기사를 바탕으로 한 AI 추천
          </p>
        </div>

        <div className="relative overflow-hidden bg-surface-container-low border border-outline-variant rounded p-stack-md">
          <span className="material-symbols-outlined absolute top-2 right-2 text-[56px] text-on-surface opacity-10">
            psychology
          </span>
          <span className="font-label-mono text-label-mono uppercase text-primary">AI 인사이트</span>
          <p className="font-body-lg text-body-lg text-on-surface-variant italic mt-stack-sm">
            연관 기사 추천 기능은 아직 준비 중이에요.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="준비 중"
          className="w-full border-2 border-dashed border-outline-variant py-stack-sm rounded font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant opacity-60 cursor-not-allowed"
        >
          추가 연결 고리 찾기
        </button>
      </section>

      <section className="bg-surface border border-outline-variant rounded p-stack-md">
        <div className="flex items-center justify-between mb-stack-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">트렌드 랭킹</h3>
          <span className="material-symbols-outlined text-primary text-[20px]">auto_graph</span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          트렌드 랭킹은 아직 준비 중이에요.
        </p>
      </section>
    </aside>
  );
}
