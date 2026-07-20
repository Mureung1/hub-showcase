import { Link } from 'react-router-dom'

const TICKER_REVIEWS = [
  { stars: 5, text: '응답이 정말 빨라졌어요' },
  { stars: 2, text: '대기시간이 길어요' },
  { stars: 5, text: '직원분들이 친절해요' },
  { stars: 3, text: '가격이 조금 아쉬워요' },
]

function Stars({ count }) {
  return (
    <span className="lp-ticker-stars">{'★'.repeat(count)}{'☆'.repeat(5 - count)}</span>
  )
}

function LandingHero() {
  const tickerItems = [...TICKER_REVIEWS, ...TICKER_REVIEWS]

  return (
    <section className="lp-hero">
      <div className="lp-hero-content">
        <h1>
          리뷰를 관리하면
          <br />
          매장의 문제가 보입니다
        </h1>
        <p>감정분석·답변 초안은 물론, 같은 불만이 쌓이면 가장 먼저 알려드립니다</p>
        <Link className="hero-cta" to="/app">
          지금 시작하기 →
        </Link>
      </div>

      <div className="lp-ticker">
        <div className="lp-ticker-fade" />
        <div className="lp-ticker-track">
          {tickerItems.map((item, idx) => (
            <div className="lp-ticker-item" key={idx}>
              <Stars count={item.stars} /> &quot;{item.text}&quot;
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingHero
