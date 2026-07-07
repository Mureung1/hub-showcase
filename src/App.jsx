import "./App.css";

function App() {
  const features = [
    {
      label: "채널 관리자",
      title: "공지 사이트 등록",
      description:
        "관리자가 URL과 Selector를 등록하여 여러 대학 및 학과 공지를 손쉽게 연동할 수 있습니다.",
    },
    {
      label: "채널 관리자",
      title: "카테고리별 알림 설정",
      description:
        "공지 카테고리별로 Discord 채널과 디스코드 내 역할을 연결하여 필요한 공지만 전달합니다.",
    },
    {
      label: "사용자",
      title: "구독 알림",
      description:
        "/subscribe 같은 슬래시 명령어를 통해 원하는 공지 카테고리를 간편하게 구독하거나 해제할 수 있습니다.",
    },
    {
      label: "사용자",
      title: "키워드 알림",
      description:
        "관심 키워드를 등록하면 키워드가 포함된 제목의 공지가 올라올 때 개인 DM으로 알림을 받을 수 있습니다.",
    },
  ];

  const flows = [
    "공지 사이트 및 필요 정보 등록",
    "카테고리와 Discord 채널 연결 설정",
    "카테고리 구독 / 키워드 설정",
    "역할 / DM 알림",
  ];

  return (
    <div className="app">
      <main className="container">
        <section className="hero">
          <p className="eyebrow">Discord University Notice Service</p>

          <h1>IRIS</h1>

          <blockquote>
            필요한 대학 공지를 Discord에서 더 편하게
          </blockquote>

          <div className="intro-code">
            <div className="code-dots">
              <span />
              <span />
              <span />
            </div>

            <p>
              IRIS(아이리스)는 Discord Bot을 이용하여 대학교 공지를 편하게 받아볼 수 있도록 도와주는 서비스입니다.
              프로젝트 이름인 IRIS는 전령의 의미를 가지고 있으며,
              직관적이고 부르기 쉬운 이름이라 선택했습니다.
              <br />
              <br />
              관리자는 공지 사이트와 카테고리를 설정하고,
              사용자는 원하는 공지 카테고리만 구독하여 알림 받거나 키워드로 알림을 받아볼 수 있습니다.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            <span>01</span>
            <h2>서비스 핵심 기능</h2>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="card-header">
                  <div className="code-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="card-label">{feature.label}</span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            <span>02</span>
            <h2>서비스 흐름</h2>
          </div>

          <div className="flow-card">
            {flows.map((flow, index) => (
              <div className="flow-item" key={flow}>
                <div className="flow-box">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{flow}</p>
                </div>

                {index !== flows.length - 1 && <div className="flow-arrow">↓</div>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Naver AI Agent Challenge</span>
      </footer>
    </div>
  );
}

export default App;