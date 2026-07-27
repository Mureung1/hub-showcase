const demoPreviewUrl = `${import.meta.env.BASE_URL}assets/ptop-demo-preview.svg`;

export function DemoPreview() {
  return (
    <section className="grid grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] items-center gap-[clamp(28px,6vw,90px)] border-t border-ptop-line py-[76px] max-[860px]:grid-cols-1" aria-labelledby="demo-title">
      <div className="grid gap-4">
        <span className="mb-3 block text-[0.78rem] font-extrabold uppercase text-ptop-mint-dark">A clear starting point</span>
        <h2 className="max-w-[620px] text-[clamp(1.8rem,4vw,3rem)] tracking-[-0.035em]" id="demo-title">Repository 하나로 프로젝트를 다시 살펴보세요.</h2>
        <p className="max-w-[440px] text-[0.92rem] leading-[1.7] text-ptop-muted [word-break:keep-all]">실제 분석 화면은 다음 단계에서 채워질 예정입니다. 아래 영역에 서비스 동작 GIF나 화면 캡처를 교체해 넣을 수 있습니다.</p>
      </div>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-ptop-line bg-ptop-soft-paper shadow-[0_24px_60px_rgb(38_168_117/12%)] transition duration-[var(--motion-base)] hover:-translate-y-0.5 hover:shadow-[0_30px_72px_rgb(38_168_117/16%)]">
        <div className="flex min-h-[42px] items-center gap-1.5 border-b border-ptop-line bg-ptop-mint-soft px-4" aria-hidden="true">
          <span className="h-[7px] w-[7px] rounded-full bg-ptop-mint-dark" />
          <span className="h-[7px] w-[7px] rounded-full bg-ptop-mint-line" />
          <span className="h-[7px] w-[7px] rounded-full bg-ptop-mint-line" />
          <small className="ml-2.5 text-[0.72rem] text-ptop-muted">ptop / repository analysis</small>
        </div>
        <img className="block h-auto w-full" src={demoPreviewUrl} alt="PtoP 분석 화면 예시를 넣을 수 있는 자리" />
      </div>
    </section>
  );
}
