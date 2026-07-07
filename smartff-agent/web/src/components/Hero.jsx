import './Hero.css'

function Hero({ title, subtitle, badges }) {
  return (
    <section className="hero">
      <h1>{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
      {badges?.length > 0 && (
        <div className="hero-badges">
          {badges.map((badge) => (
            <span className="hero-badge" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      )}
      <a className="hero-cta" href="#features">
        핵심 기능 보러가기
      </a>
    </section>
  )
}

export default Hero
