import './App.css'

const mapMarkers = [
  { label: '직접 작성한 레시피', emoji: '✍️', className: 'marker-east-asia' },
  { label: '엄마에게 받은 레시피', emoji: '💌', className: 'marker-japan' },
  { label: '영상에서 가져온 레시피', emoji: '🎬', className: 'marker-europe' },
  { label: '텍스트로 정리한 레시피', emoji: '📝', className: 'marker-mexico' },
  { label: '할머니에게 배운 레시피', emoji: '👵', className: 'marker-south-asia' },
  { label: '가족에게 전한 레시피', emoji: '🤝', className: 'marker-west-europe' },
]

const featureCards = [
  {
    title: '레시피 모으기',
    description:
      '내가 알고 있는 요리법을 직접 작성하거나, 영상 URL과 레시피 텍스트를 가져와 한곳에 저장해요.',
  },
  {
    title: 'AI로 정리하기',
    description:
      '형식 없이 흩어진 내용을 AI가 음식 이름, 재료, 수량, 조리 과정으로 정리해 다시 요리하기 쉽게 만들어줘요.',
  },
  {
    title: '추억와 함께 전하기',
    description:
      '내가 직접 등록한 레시피를 가족이나 가까운 사람에게 전해요. 받은 레시피에는 전해준 사람과 날짜가 함께 남아요.',
  },
]

function App() {
  return (
    <main className="app-shell">
      <section className="intro-section" aria-labelledby="service-title">
        <div className="intro-copy">
          <p className="eyebrow">Recipe Book</p>
          <h1 id="service-title">흩어진 레시피를 모아 나만의 레시피북으로</h1>
          <p className="intro-description">
            직접 알고 있는 요리법부터 영상과 글에서 발견한 레시피까지,
            AI가 다시 요리하기 좋은 형태로 정리해 줘요. 가족에게 전해 받은
            소중한 레시피는 사람과의 추억까지 함께 간직할 수 있어요.
          </p>

          <div className="cta-row" aria-label="서비스 주요 행동">
            <button type="button" className="primary-action">
              레시피 추가하기
            </button>
            <button type="button" className="secondary-action">
              내 레시피북 보기
            </button>
          </div>
        </div>

        <div className="map-panel" aria-label="세계 음식 지도">
          <div className="world-map recipe-book" aria-hidden="true">
            <span className="book-page book-page-left">
              <span className="recipe-heading"></span>
              <span className="recipe-line line-wide"></span>
              <span className="recipe-line"></span>
              <span className="recipe-line line-short"></span>
              <span className="recipe-note"></span>
            </span>
            <span className="book-spine"></span>
            <span className="book-page book-page-right">
              <span className="recipe-heading"></span>
              <span className="recipe-step"></span>
              <span className="recipe-line line-wide"></span>
              <span className="recipe-step"></span>
              <span className="recipe-line"></span>
              <span className="recipe-note"></span>
            </span>

            {mapMarkers.map((marker) => (
              <span
                className={`food-marker ${marker.className}`}
                key={marker.label}
                title={marker.label}
              >
                <span className="pin"></span>
                <span className="emoji">{marker.emoji}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="서비스 사용 흐름">
        {featureCards.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
