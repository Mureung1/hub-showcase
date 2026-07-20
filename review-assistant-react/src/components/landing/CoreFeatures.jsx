import { useInView } from '../../hooks/useInView.js'

const CORE_FEATURES = [
  {
    icon: '😊',
    title: '감정 분석',
    desc: '긍정/부정/중립을 자동으로 분류해요',
    bgVar: '--color-positive-bg',
    textVar: '--color-positive-text',
  },
  {
    icon: '🏷️',
    title: '키워드 추출',
    desc: '맛·친절도·대기시간 등 6가지 카테고리로 정리',
    bgVar: '--color-lp-industry-cafe-bg',
    textVar: '--color-lp-industry-cafe-text',
  },
  {
    icon: '🎯',
    title: 'AI 관심도 점수',
    desc: '어떤 리뷰부터 챙겨야 할지 0~100점으로 알려줘요',
    bgVar: '--color-copy-bg',
    textVar: '--color-copy-text',
  },
  {
    icon: '🤖',
    title: '답변 초안 3종',
    desc: '정중함·친근함·간결함, 원하는 톤 그대로 복사',
    bgVar: '--color-lp-industry-salon-bg',
    textVar: '--color-lp-industry-salon-text',
  },
  {
    icon: '🔁',
    title: '반복 문제 감지',
    desc: '같은 불만이 쌓이면 가장 먼저 알려드려요 — 다른 도구엔 없는 기능',
    bgVar: '--color-recurring-bg',
    textVar: '--color-recurring-heading',
    highlight: true,
  },
  {
    icon: '📊',
    title: '총 분석 · 월별 통계',
    desc: '쌓인 리뷰를 한눈에, 월별 추이까지',
    bgVar: '--color-lp-industry-lodging-bg',
    textVar: '--color-lp-industry-lodging-text',
  },
]

function CoreFeatures() {
  const [featuresRef, featuresInView] = useInView()

  return (
    <section
      ref={featuresRef}
      className={`core-features scroll-reveal ${featuresInView ? 'in-view' : ''}`}
    >
      <h2 className="section-title">핵심 기능</h2>
      <div className="feature-grid">
        {CORE_FEATURES.map((feature) => (
          <div
            className={`feature-card ${feature.highlight ? 'feature-card-highlight' : ''}`}
            key={feature.title}
          >
            <span
              className="feature-icon"
              style={{ background: `var(${feature.bgVar})`, color: `var(${feature.textVar})` }}
            >
              {feature.icon}
            </span>
            <div className="feature-title">{feature.title}</div>
            <p className="feature-desc">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CoreFeatures
