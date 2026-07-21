import './Hero.css'

function Hero({ urgentCount }) {
  return (
    <section className="hero">
      <div className="hero-date">7월 13일 (월)</div>
      <div className="hero-greeting">두희님, 안녕하세요</div>
      <div className="hero-urgent">
        마감 임박 <strong className="hero-count">{urgentCount}</strong>건, 놓치지 마세요
      </div>
    </section>
  )
}

export default Hero
