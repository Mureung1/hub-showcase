import './App.css'

const features = [
  {
    number: '01',
    title: '같은 건물 기반 자유게시판',
    description: '생활 정보, 분실물, 공지처럼 이웃과 나눌 이야기를 한곳에 모아요.',
  },
  {
    number: '02',
    title: '도와주세요 게시판',
    description: '작은 수리, 물건 대여, 생활 속 도움이 필요할 때 가까운 이웃에게 요청해요.',
  },
  {
    number: '03',
    title: '상품 카드형 공동구매',
    description: '함께 살 물건을 모집하고 참여 인원과 1인 부담 금액을 확인해요.',
  },
]

function App() {
  return (
    <main className="page">
      <article className="project-card">
        <header className="intro">
          <p className="category">PROJECT · 같은 건물 생활 커뮤니티 서비스</p>
          <h1>사이사이</h1>
          <p className="tagline">가까운 이웃과 우리 사이.</p>
          <p className="summary">
            사이사이는 같은 건물에 사는 사람들이 자유게시판, 도와주세요
            게시판, 공동구매 탭을 통해 생활 정보를 나누고, 필요한 도움을
            요청하고, 함께 구매할 사람을 모집할 수 있도록 돕는 생활
            커뮤니티 서비스입니다.
          </p>
        </header>

        <section className="problem" aria-labelledby="problem-title">
          <div>
            <p className="label">WHY</p>
            <h2 id="problem-title">건물 안의 거리감</h2>
          </div>
          <p>
            같은 건물에 살아도 서로를 알기 어렵고, 생활 속 작은 문제를 혼자
            해결해야 하는 경우가 많습니다. 사이사이는 건물 안의 이웃을 연결해
            소통, 도움 요청, 공동구매를 더 쉽게 만듭니다.
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
            <li>건물 커뮤니티 입장</li>
            <li>소통 및 도움 요청</li>
            <li>공동구매 참여</li>
          </ol>
        </section>

        <footer className="card-footer">
          <p><strong>주요 대상</strong> 같은 건물 이웃 · 자취생 · 1인 가구</p>
          <span>사이사이</span>
        </footer>
      </article>
    </main>
  )
}

export default App
