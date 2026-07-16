import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import BrandMark from '../components/BrandMark.jsx'
import { useInView } from '../hooks/useInView.js'

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

const TESTIMONIALS = [
  { name: '카페 사장님 A (예시)', text: '반복되는 대기시간 불만을 놓치지 않게 돼서 좋아요.' },
  { name: '식당 사장님 B (예시)', text: '답변 톤을 고민할 필요가 없어서 시간이 많이 절약돼요.' },
  { name: '미용실 원장님 C (예시)', text: '리뷰마다 점수가 있어서 뭐부터 답장할지 헷갈리지 않아요.' },
]

const TICKER_REVIEWS = [
  { stars: 5, text: '응답이 정말 빨라졌어요' },
  { stars: 2, text: '대기시간이 길어요' },
  { stars: 5, text: '직원분들이 친절해요' },
  { stars: 3, text: '가격이 조금 아쉬워요' },
]

const PROCESS_STEPS = [
  { num: 1, label: '리뷰 접수' },
  { num: 2, label: '감정 분석' },
  { num: 3, label: '답변 초안' },
]

const REPORT_KEYWORDS = ['대기시간', '직원 친절', '가격']

const SENTIMENT_BARS = [
  { label: '긍정', percent: 83, colorVar: '--color-primary', delay: 0 },
  { label: '보통', percent: 12, colorVar: '--color-lp-bar-neutral', delay: 0.1 },
  { label: '부정', percent: 5, colorVar: '--color-lp-bar-negative', delay: 0.2 },
]

const INDUSTRIES = [
  { label: '카페', badge: '카', bgVar: '--color-lp-industry-cafe-bg', textVar: '--color-lp-industry-cafe-text' },
  {
    label: '식당',
    badge: '식',
    bgVar: '--color-lp-industry-restaurant-bg',
    textVar: '--color-lp-industry-restaurant-text',
  },
  {
    label: '미용실',
    badge: '미',
    bgVar: '--color-lp-industry-salon-bg',
    textVar: '--color-lp-industry-salon-text',
  },
  {
    label: '숙박',
    badge: '숙',
    bgVar: '--color-lp-industry-lodging-bg',
    textVar: '--color-lp-industry-lodging-text',
  },
  {
    label: '소매점',
    badge: '소',
    bgVar: '--color-lp-industry-retail-bg',
    textVar: '--color-lp-industry-retail-text',
  },
]

function Stars({ count }) {
  return (
    <span className="lp-ticker-stars">{'★'.repeat(count)}{'☆'.repeat(5 - count)}</span>
  )
}

function LandingPage() {
  const [featuresRef, featuresInView] = useInView()
  const [processRef, processInView] = useInView()
  const [reportRef, reportInView] = useInView()
  const [industriesRef, industriesInView] = useInView()
  const [testimonialsRef, testimonialsInView] = useInView()

  const tickerItems = [...TICKER_REVIEWS, ...TICKER_REVIEWS]

  return (
    <div className="page">
      <Header />

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

      <section
        ref={processRef}
        className={`lp-process scroll-reveal ${processInView ? 'in-view' : ''}`}
      >
        <h2 className="section-title">리뷰가 쌓이면, 이런 흐름으로 정리돼요</h2>
        <p className="section-sub">최대 15개 리뷰를 한 번에 분석하고, 답변 초안까지 만들어드려요</p>

        <div className="lp-process-row">
          <div className="lp-process-line" />
          <div className="lp-process-dot" />
          {PROCESS_STEPS.map((step) => (
            <div className="lp-process-step" key={step.num}>
              <div className="lp-process-num">{step.num}</div>
              <div className="lp-process-label">{step.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        ref={reportRef}
        className={`lp-report scroll-reveal ${reportInView ? 'in-view' : ''}`}
      >
        <div className="lp-report-text">
          <h2 className="section-title">총 분석 리포트로 한눈에</h2>
          <p className="section-sub">감정 비율과 반복되는 불만 키워드를 자동으로 모아드려요</p>
          <div className="lp-report-keywords">
            {REPORT_KEYWORDS.map((keyword) => (
              <span className="lp-report-keyword" key={keyword}>
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="lp-report-card">
          <div className="lp-donut">
            <div className="lp-donut-center">4.7</div>
          </div>
          <div className="lp-bars">
            {SENTIMENT_BARS.map((bar) => (
              <div className="lp-bar-row" key={bar.label}>
                <span className="lp-bar-label">{bar.label}</span>
                <div className="lp-bar-track">
                  <div
                    className="lp-bar-fill"
                    style={{
                      width: reportInView ? `${bar.percent}%` : 0,
                      background: `var(${bar.colorVar})`,
                      transitionDelay: `${bar.delay}s`,
                    }}
                  />
                </div>
                <span className="lp-bar-percent">{bar.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={industriesRef}
        className={`lp-industries scroll-reveal ${industriesInView ? 'in-view' : ''}`}
      >
        <h2 className="section-title">이런 업종에서 쓰고 있어요</h2>
        <div className="lp-industry-list">
          {INDUSTRIES.map((industry) => (
            <div className="lp-industry-chip" key={industry.label}>
              <span
                className="lp-industry-badge"
                style={{ background: `var(${industry.bgVar})`, color: `var(${industry.textVar})` }}
              >
                {industry.badge}
              </span>
              {industry.label}
            </div>
          ))}
        </div>
      </section>

      <section
        ref={testimonialsRef}
        className={`testimonials scroll-reveal ${testimonialsInView ? 'in-view' : ''}`}
      >
        <h2 className="section-title">이런 반응을 목표로 해요</h2>
        <p className="section-sub">※ 아직 실제 사용자 후기는 없어요 — 목표로 하는 반응을 가상으로 구성한 예시예요</p>
        <div className="testimonial-grid">
          {TESTIMONIALS.map((testimonial) => (
            <div className="testimonial-card" key={testimonial.name}>
              <p className="testimonial-text">&quot;{testimonial.text}&quot;</p>
              <div className="testimonial-name">{testimonial.name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <BrandMark />
          <span>리뷰 매니저 AI</span>
        </div>
        <span className="lp-footer-copyright">© 2026 리뷰 매니저 AI</span>
      </footer>
    </div>
  )
}

export default LandingPage
