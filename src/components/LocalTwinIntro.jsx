function MetricCard({ metric }) {
  return (
    <article className={`metric-card metric-card--${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>
        {metric.value}
        <small>{metric.suffix}</small>
      </strong>
    </article>
  );
}

function PillarCard({ pillar }) {
  return (
    <article className="pillar-card">
      <span>{pillar.meta}</span>
      <h3>{pillar.title}</h3>
      <p>{pillar.description}</p>
    </article>
  );
}

function DashboardPreview({ project }) {
  return (
    <aside className="preview" aria-label="LocalTwin 데모 화면 미리보기">
      <div className="preview__header">
        <div>
          <span className="preview__label">Selected Area</span>
          <strong>성수동 카페 상권</strong>
        </div>
        <span className="preview__status">v0.1 Demo</span>
      </div>

      <div className="map-panel" aria-hidden="true">
        <div className="map-grid" />
        <div className="map-zone map-zone--park" />
        <div className="map-zone map-zone--block" />
        <div className="map-road map-road--main" />
        <div className="map-road map-road--sub" />
        <div className="map-road map-road--thin" />
        <div className="map-label map-label--station">성수역</div>
        <div className="map-label map-label--street">카페거리</div>
        <div className="map-marker map-marker--shop" />
        <div className="map-marker map-marker--rival" />
        <div className="map-marker map-marker--flow" />
      </div>

      <div className="preview__metrics">
        {project.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="analysis-summary">
        <span>Core Analysis</span>
        <strong>공공데이터 기반 입지 판단 화면</strong>
        <p>업종 밀도, 경쟁 강도, 개폐업 흐름을 먼저 분석합니다.</p>
      </div>
    </aside>
  );
}

export function LocalTwinIntro({ project }) {
  return (
    <main className="page-shell">
      <section className="hero-section" aria-labelledby="project-title">
        <div className="hero-section__content">
          <p className="eyebrow">{project.eyebrow}</p>
          <h1 id="project-title">{project.name}</h1>
          <p className="hero-copy">{project.summary}</p>

          <div className="tag-row" aria-label="프로젝트 키워드">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>

        <DashboardPreview project={project} />
      </section>

      <section className="narrative-grid" aria-label="문제와 해결 방향">
        <article>
          <span>Problem</span>
          <h2>데이터와 실제 거리감이 분리되어 있습니다.</h2>
          <p>{project.problem}</p>
        </article>
        <article>
          <span>Solution</span>
          <h2>상권 분석을 현실 공간 위에 얹습니다.</h2>
          <p>{project.solution}</p>
        </article>
      </section>

      <section className="pillar-grid" aria-label="핵심 기능">
        {project.pillars.map((pillar) => (
          <PillarCard key={pillar.title} pillar={pillar} />
        ))}
      </section>

      <section className="flow-section" aria-labelledby="flow-title">
        <div>
          <span className="section-kicker">Product Flow</span>
          <h2 id="flow-title">사용자는 분석에서 공간 확인까지 한 흐름으로 이동합니다.</h2>
        </div>
        <ol className="flow-list">
          {project.flow.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="scope-section" aria-labelledby="scope-title">
        <div>
          <span className="section-kicker">v0.1 Scope</span>
          <h2 id="scope-title">작게 구현하고, 검증 가능한 범위만 보여줍니다.</h2>
        </div>
        <div className="scope-grid">
          {project.scope.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="preview-gallery" aria-labelledby="preview-gallery-title">
        <div className="preview-gallery__header">
          <span className="section-kicker">Optional Tech Preview</span>
          <h2 id="preview-gallery-title">
            만약 부가적인 3D 장면 탐색 기능을 추가한다면 이런 화면을 목표로 합니다.
          </h2>
          <p>
            핵심은 공공데이터 기반 상권 분석입니다. 3D 장면 탐색과 시간대별 유동 인구
            표시는 분석 결과를 더 직관적으로 보여주기 위한 추가 기능으로 둡니다.
          </p>
        </div>
        <div className="preview-gallery__grid">
          {project.previews.map((preview) => (
            <article className="image-preview-card" key={preview.title}>
              <img src={preview.src} alt={`${preview.title}: ${preview.description}`} />
              <div>
                <span>Planned Add-on</span>
                <h3>{preview.title}</h3>
                <p>{preview.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
