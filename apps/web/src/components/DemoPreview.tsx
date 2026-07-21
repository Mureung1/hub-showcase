const demoPreviewUrl = `${import.meta.env.BASE_URL}assets/ptop-demo-preview.svg`;

export function DemoPreview() {
  return (
    <section className="demo-section" aria-labelledby="demo-title">
      <div className="section-intro">
        <span className="section-label">A clear starting point</span>
        <h2 id="demo-title">Repository 하나로 프로젝트를 다시 살펴보세요.</h2>
        <p>실제 분석 화면은 다음 단계에서 채워질 예정입니다. 아래 영역에 서비스 동작 GIF나 화면 캡처를 교체해 넣을 수 있습니다.</p>
      </div>
      <div className="demo-frame">
        <div className="demo-frame-top" aria-hidden="true">
          <span />
          <span />
          <span />
          <small>ptop / repository analysis</small>
        </div>
        <img src={demoPreviewUrl} alt="PtoP 분석 화면 예시를 넣을 수 있는 자리" />
      </div>
    </section>
  );
}
