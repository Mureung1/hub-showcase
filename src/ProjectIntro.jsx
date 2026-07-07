import './ProjectIntro.css';

function ProjectIntro() {
  const stats = [
    { label: '기존 홍보글 도달률', value: 30 },
    { label: '하소AI 일기 도달률 (예상)', value: 85 },
  ];

  const features = [
    {
      title: '감정 온도 조절 시스템',
      desc: "사용자가 설정한 '감정 온도'에 따라 AI의 문체가 극단적으로 변화합니다. 80도 이상은 매운맛 풍자, 30도 이하는 담백한 철학적 일기로 표현됩니다.",
    },
    {
      title: '실시간 SNS 트렌드 엔진',
      desc: 'Google Trends, SNS 밈, 상황 변수(날씨·요일·시즌)를 결합해 본문에 자연스럽게 반영합니다.',
    },
    {
      title: 'AI 비주얼 생성',
      desc: 'DALL-E 3 기반으로 사장님의 감정선을 표현하는 예술적인 비주얼을 자동 생성합니다.',
    },
  ];

  const flow = [
    { step: '하소연 입력', desc: '오늘 있었던 일을 텍스트나 음성으로 입력' },
    { step: '온도 조절', desc: '현재 기분의 온도를 조절하여 톤앤매너 결정' },
    { step: '콘텐츠 생성', desc: '트렌드가 반영된 글과 이미지를 AI가 자동 생성' },
    { step: 'SNS 업로드', desc: '마음에 드는 결과물을 바로 인스타그램에 게시' },
  ];

  return (
    <div className="project-intro">
      <header className="hero">
        <h1>
          하소연이 <span className="highlight">콘텐츠</span>가 되는,<br />
          하소AI 프로젝트
        </h1>
        <p className="subtitle">Turning Your Struggles into Viral Stories</p>
      </header>

      <section className="section">
        <h2>소상공인이 겪는 고립과 피로</h2>
        <div className="card-grid">
          <div className="card">
            <h3>심각한 디지털 번아웃</h3>
            <p>사장님들의 70%는 일과 삶의 분리에 어려움을 겪으며, 매일 반복되는 마케팅 콘텐츠 제작에 큰 심리적 부담을 느낍니다.</p>
          </div>
          <div className="card">
            <h3>organic engagement의 하락</h3>
            <p>단순한 홍보성 게시물은 더 이상 노출되지 않습니다. 소비자들은 사장님의 '진솔한 뒷이야기'에만 반응하기 시작했습니다.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>핵심 기능</h2>
        <div className="card-grid">
          {features.map((f) => (
            <div className="card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>사용자 경험 여정 (UX Flow)</h2>
        <div className="flow-grid">
          {flow.map((f, i) => (
            <div className="flow-step" key={f.step}>
              <span className="flow-index">{i + 1}</span>
              <h4>{f.step}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>예상 성과 및 임팩트</h2>
        <div className="stat-list">
          {stats.map((s) => (
            <div className="stat-row" key={s.label}>
              <span className="stat-label">{s.label}</span>
              <div className="stat-bar-bg">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${s.value}%` }}
                >
                  {s.value}%
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="quote">
          "진정성 있는 스토리텔링은 기존 광고 대비 2.8배 높은 상호작용을 이끌어냅니다."
        </p>
      </section>

      <footer className="footer">
        <p>사장님의 하소연을 가장 가치 있는 이야기로 바꾸겠습니다.</p>
      </footer>
    </div>
  );
}

export default ProjectIntro;