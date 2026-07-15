import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import ExampleResultCard from '../components/ExampleResultCard.jsx'
import { EXAMPLE_REVIEW } from '../data/exampleReview.js'
import { useInView } from '../hooks/useInView.js'
import { useCountUp } from '../hooks/useCountUp.js'

const TARGET_INDUSTRIES = ['☕ 카페', '🍽️ 식당', '💇 미용실', '🏨 숙박', '🛍️ 소매점']

const CORE_FEATURES = [
  { icon: '😊', title: '감정 분석', desc: '긍정/부정/중립을 자동으로 분류해요' },
  { icon: '🏷️', title: '키워드 추출', desc: '맛·친절도·대기시간 등 6가지 카테고리로 정리' },
  { icon: '🎯', title: 'AI 관심도 점수', desc: '어떤 리뷰부터 챙겨야 할지 0~100점으로 알려줘요' },
  { icon: '🤖', title: '답변 초안 3종', desc: '정중함·친근함·간결함, 원하는 톤 그대로 복사' },
  {
    icon: '🔁',
    title: '반복 문제 감지',
    desc: '같은 불만이 쌓이면 가장 먼저 알려드려요 — 다른 도구엔 없는 기능',
    highlight: true,
  },
  { icon: '📊', title: '총 분석 · 월별 통계', desc: '쌓인 리뷰를 한눈에, 월별 추이까지' },
]

const MONTHLY_PREVIEW = [
  { month: '2026-05', totalReviews: 34, averageScore: 52, negative: 11 },
  { month: '2026-06', totalReviews: 41, averageScore: 55, negative: 13 },
  { month: '2026-07', totalReviews: 53, averageScore: 58, negative: 17 },
]

const TESTIMONIALS = [
  { name: '카페 사장님 A (예시)', text: '반복되는 대기시간 불만을 놓치지 않게 돼서 좋아요.' },
  { name: '식당 사장님 B (예시)', text: '답변 톤을 고민할 필요가 없어서 시간이 많이 절약돼요.' },
  { name: '미용실 원장님 C (예시)', text: '리뷰마다 점수가 있어서 뭐부터 답장할지 헷갈리지 않아요.' },
]

function DashboardPreviewCard({ active }) {
  const totalReviews = useCountUp(128, active)
  const averageScore = useCountUp(58, active)

  return (
    <div className="dashboard-preview-card">
      <div className="example-data-badge">예시 데이터</div>
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-number">{totalReviews}개</div>
          <div className="stat-label">분석한 리뷰</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{averageScore}</div>
          <div className="stat-label">평균 관심도 점수</div>
        </div>
      </div>
      <div className="sentiment-breakdown">
        <span className="sentiment-tag positive">긍정 62</span>
        <span className="sentiment-tag negative">부정 41</span>
        <span className="sentiment-tag neutral">중립 25</span>
      </div>
      <div className="industry-list">
        <span className="industry-chip">#대기시간 18</span>
        <span className="industry-chip">#친절도 12</span>
        <span className="industry-chip">#맛 9</span>
      </div>
    </div>
  )
}

function LandingPage() {
  const [introRef, introInView] = useInView()
  const [featuresRef, featuresInView] = useInView()
  const [dashboardRef, dashboardInView] = useInView()
  const [stepsRef, stepsInView] = useInView()
  const [exampleRef, exampleInView] = useInView()
  const [monthlyRef, monthlyInView] = useInView()
  const [testimonialsRef, testimonialsInView] = useInView()

  return (
    <div className="page">
      <Header />

      <section className="hero">
        <div className="hero-content">
          <h1>리뷰를 관리하면 매장의 문제가 보입니다</h1>
          <p>감정분석·답변 초안은 물론, 같은 불만이 쌓이면 가장 먼저 알려드립니다</p>
          <Link className="hero-cta" to="/app">
            지금 시작하기
          </Link>
        </div>

        <div className="hero-preview-card">
          <div className="hero-preview-dots">
            <span className="hero-preview-dot" />
            <span className="hero-preview-dot" />
            <span className="hero-preview-dot" />
          </div>
          <div className="hero-preview-rating">
            <span className="hero-preview-stars">★★★★★</span>
            <span className="hero-preview-rating-num">4.7</span>
          </div>

          <div className="hero-preview-label">이번달 리뷰</div>
          <div className="hero-preview-count">132개</div>

          <div className="hero-preview-divider" />

          <div className="hero-preview-sentiment">
            <div className="hero-preview-sentiment-row">
              <span>😊 긍정</span>
              <span className="hero-preview-percent positive">83%</span>
            </div>
            <div className="hero-preview-sentiment-row">
              <span>😐 보통</span>
              <span className="hero-preview-percent neutral">12%</span>
            </div>
            <div className="hero-preview-sentiment-row">
              <span>😡 부정</span>
              <span className="hero-preview-percent negative">5%</span>
            </div>
          </div>

          <div className="hero-preview-divider" />

          <div className="hero-preview-label">반복 불만</div>
          <div className="hero-preview-recurring-list">
            <span className="hero-preview-recurring-chip">대기시간</span>
            <span className="hero-preview-recurring-chip">직원 친절</span>
            <span className="hero-preview-recurring-chip">가격</span>
          </div>
        </div>
      </section>

      <section ref={introRef} className={`service-intro scroll-reveal ${introInView ? 'in-view' : ''}`}>
        <h2 className="section-title">이런 서비스예요</h2>
        <p className="section-sub">
          소상공인이 매일 받는 손님 리뷰를 붙여넣기만 하면, 감정 분석부터 답변 초안, 반복되는 문제까지
          AI가 한 번에 정리해드려요. 최대 15개 리뷰를 한 번에 분석할 수 있어요.
        </p>
        <div className="industry-list">
          {TARGET_INDUSTRIES.map((industry) => (
            <span className="industry-chip" key={industry}>
              {industry}
            </span>
          ))}
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
              <span className="feature-icon">{feature.icon}</span>
              <div className="feature-title">{feature.title}</div>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        ref={dashboardRef}
        className={`dashboard-preview scroll-reveal ${dashboardInView ? 'in-view' : ''}`}
      >
        <h2 className="section-title">Dashboard 미리보기</h2>
        <p className="section-sub">쌓인 리뷰를 이렇게 한눈에 볼 수 있어요</p>
        <DashboardPreviewCard active={dashboardInView} />
        <div className="guide-cta-row">
          <Link className="hero-cta" to="/dashboard">
            내 대시보드 보기
          </Link>
        </div>
      </section>

      <section ref={stepsRef} className={`how-it-works scroll-reveal ${stepsInView ? 'in-view' : ''}`}>
        <div className="step">
          <span className="step-num">1</span>
          리뷰 붙여넣기
        </div>
        <div className="step">
          <span className="step-num">2</span>
          분석 시작
        </div>
        <div className="step">
          <span className="step-num">3</span>
          답변 복사
        </div>
      </section>

      <section
        ref={exampleRef}
        className={`example-preview scroll-reveal ${exampleInView ? 'in-view' : ''}`}
      >
        <h2 className="section-title">분석 예시</h2>
        <ExampleResultCard review={EXAMPLE_REVIEW} />
      </section>

      <section
        ref={monthlyRef}
        className={`monthly-preview scroll-reveal ${monthlyInView ? 'in-view' : ''}`}
      >
        <h2 className="section-title">월별 통계</h2>
        <p className="section-sub">시간이 지날수록 가게 리뷰 추이를 볼 수 있어요 (예시 데이터)</p>
        <div className="monthly-table">
          {MONTHLY_PREVIEW.map((month) => (
            <div className="monthly-row" key={month.month}>
              <span className="monthly-month">{month.month}</span>
              <span>{month.totalReviews}건 분석</span>
              <span>평균 {month.averageScore}점</span>
              <span>부정 {month.negative}건</span>
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

      <footer className="site-footer">
        <p>🍊 리뷰 매니저 AI · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default LandingPage
