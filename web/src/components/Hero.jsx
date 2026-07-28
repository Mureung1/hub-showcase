import './Hero.css'

function formatKoreanDate(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`
}

function Hero({ urgentCount, today }) {
  return (
    <section className="hero">
      <div className="hero-date">{formatKoreanDate(today)}</div>
      <div className="hero-greeting">두희님, 안녕하세요</div>
      <div className="hero-urgent">
        마감 임박 <strong className="hero-count">{urgentCount}</strong>건, 놓치지 마세요
      </div>
    </section>
  )
}

export default Hero
