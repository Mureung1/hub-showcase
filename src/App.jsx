import './App.css'

const features = [
  {
    number: '01',
    title: '배달비와 최소 주문 부담 줄이기',
    description: '먹고 싶은 메뉴를 가까운 이웃과 함께 주문해 최소 금액을 채워요.',
  },
  {
    number: '02',
    title: '대용량 상품 필요한 만큼 나누기',
    description: '생필품과 식재료를 묶음으로 구매하고 비용과 수량을 나눠요.',
  },
  {
    number: '03',
    title: '가까운 이웃 빠르게 찾기',
    description: '같은 건물 또는 50m 이내 이웃에게 모집 소식을 알려요.',
  },
]

function App() {
  return (
    <main className="page">
      <article className="project-card">
        <header className="intro">
          <p className="category">PROJECT · 지역 기반 공동 주문 서비스</p>
          <h1>노나묵자</h1>
          <p className="tagline">혼자 사도, 주문은 함께.</p>
          <p className="summary">
            노나묵자는 자취생과 1인 가구가 배달음식, 생필품, 식재료를
            가까운 이웃과 함께 주문하고 비용과 물품을 나눌 수 있도록 돕는
            지역 기반 공동 주문 매칭 서비스입니다.
          </p>
        </header>

        <section className="problem" aria-labelledby="problem-title">
          <div>
            <p className="label">WHY</p>
            <h2 id="problem-title">혼자 주문할 때 생기는 불편함</h2>
          </div>
          <p>
            최소 주문 금액은 높고, 대용량 상품은 혼자 소비하기 어렵습니다.
            노나묵자는 가까운 사람을 연결해 이 문제를 함께 해결합니다.
          </p>
        </section>

        <section aria-labelledby="feature-title">
          <p className="label">KEY FEATURES</p>
          <h2 id="feature-title">핵심 기능</h2>
          <div className="feature-grid">
            {features.map((feature) => (
              <div className="feature" key={feature.number}>
                <span>{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flow" aria-labelledby="flow-title">
          <div>
            <p className="label">HOW IT WORKS</p>
            <h2 id="flow-title">이용 흐름</h2>
          </div>
          <ol>
            <li>공동 주문 모집</li>
            <li>근처 이웃 참여</li>
            <li>비용 정산 및 나눔</li>
          </ol>
        </section>

        <footer className="card-footer">
          <p><strong>주요 대상</strong> 자취생 · 1인 가구 · 같은 건물 이웃</p>
          <span>노나묵자</span>
        </footer>
      </article>
    </main>
  )
}

export default App
