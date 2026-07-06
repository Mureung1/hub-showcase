import './App.css'

const mapMarkers = [
  { label: '동아시아 면 요리', emoji: '🍜', className: 'marker-east-asia' },
  { label: '일본 스시', emoji: '🍣', className: 'marker-japan' },
  { label: '이탈리아 파스타', emoji: '🍝', className: 'marker-europe' },
  { label: '멕시코 타코', emoji: '🌮', className: 'marker-mexico' },
  { label: '인도 커리', emoji: '🍛', className: 'marker-south-asia' },
  { label: '서유럽 베이커리', emoji: '🥐', className: 'marker-west-europe' },
]

const featureCards = [
  {
    title: '레시피 찾기',
    description:
      '제공되는 레시피를 선택하거나, 원하는 해외 레시피를 가져오면 보기 쉽게 정리해줘요.',
  },
  {
    title: '따라 요리하기',
    description:
      '재료와 조리 과정을 단계별로 확인하면서 내 주방에서 완성해요.',
  },
  {
    title: '기록 모아보고 공유하기',
    description:
      '사진, 별점, 텍스트로 남긴 요리 기록을 지역, 스타일, 별점 기준으로 다시 살펴봐요. 맛있던 레시피, 아쉬웠던 레시피 모두 다시 확인할 수 있어요. 나만의 레시피도 공유해요!',
  },
]

function App() {
  return (
    <main className="app-shell">
      <section className="intro-section" aria-labelledby="service-title">
        <div className="intro-copy">
          <p className="eyebrow">🌎Recipe Passport</p>
          <h1 id="service-title">요리로 채우는 나만의 <br />미식 여권</h1>
          <p className="intro-description">
            전 세계 레시피를 따라 만들고, 완성한 음식을 사진, 별점, 후기로
            기록하며 나의 미식 여행을 지역과 스타일별로 모아보는 서비스예요.
          </p>

          <div className="cta-row" aria-label="서비스 주요 행동">
            <button type="button" className="primary-action">
              레시피 시작하기
            </button>
            <button type="button" className="secondary-action">
              내 기록 보기
            </button>
          </div>
        </div>

        <div className="map-panel" aria-label="세계 음식 지도">
          <div className="world-map" aria-hidden="true">
            <span className="continent continent-americas"></span>
            <span className="continent continent-europe-africa"></span>
            <span className="continent continent-asia"></span>
            <span className="continent continent-australia"></span>

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
