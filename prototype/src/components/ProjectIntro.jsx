import { useState } from 'react'
import './ProjectIntro.css'

const CORE_FEATURES = [
  {
    icon: '🔔',
    title: '실시간 타임세일 푸시 알림',
    desc: '사장님이 마감 임박 상품과 수량을 등록하면, 매장을 즐겨찾기했거나 반경 N km 이내의 유저에게 즉시 알림을 발송합니다.',
    tag: '위치 기반',
  },
  {
    icon: '🎟️',
    title: '실시간 재고 차감 · 픽업 예약',
    desc: '유저가 결제/예약하면 재고가 실시간으로 반영되고 픽업용 바코드가 발급됩니다. 남은 수량이 0이 되면 즉시 마감됩니다.',
    tag: '픽업 예약',
  },
]

const IMPACT_STATS = [
  { value: '~30%', label: '마감 손실 절감', sub: '소상공인 폐기 비용 감소' },
  { value: '50%+', label: '평균 할인율', sub: '대학생 가성비 픽업' },
  { value: '< 100ms', label: '주변 매장 조회', sub: 'GeoSpatial 응답속도' },
]

function ProjectIntro() {
  const [activeFeature, setActiveFeature] = useState(0)

  return (
    <main className="intro">
      <div className="intro__glow" aria-hidden="true" />

      <section className="intro__hero">
        <span className="intro__badge">소상공인 · 로컬 커머스 프로젝트</span>
        <h1 className="intro__title">
          오늘의 <span className="intro__title-accent">마감 할인</span>
          <br />
          유동적 재고 매칭 플랫폼
        </h1>
        <p className="intro__lead">
          당일 소비되어야 하는 마감 직전 상품(베이커리 · 디저트 · 신선식품)을
          지역 주민과 대학생에게 할인가로 실시간 매칭하는 <b>타임세일 서비스</b>.
          소상공인의 손실은 줄이고, 대학생에게는 가성비 있는 선택지를 제공합니다.
        </p>

        <div className="intro__stats">
          {IMPACT_STATS.map((s) => (
            <div className="intro__stat" key={s.label}>
              <div className="intro__stat-value">{s.value}</div>
              <div className="intro__stat-label">{s.label}</div>
              <div className="intro__stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="intro__section">
        <h2 className="intro__section-title">핵심 기능</h2>
        <div className="intro__cards">
          {CORE_FEATURES.map((f, i) => (
            <button
              type="button"
              key={f.title}
              className={
                'intro__card' + (activeFeature === i ? ' intro__card--active' : '')
              }
              onClick={() => setActiveFeature(i)}
            >
              <div className="intro__card-top">
                <span className="intro__card-icon">{f.icon}</span>
                <span className="intro__card-tag">{f.tag}</span>
              </div>
              <h3 className="intro__card-title">{f.title}</h3>
              <p className="intro__card-desc">{f.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <footer className="intro__footer">
        마감 임박 알림 → 선착순 예약 → 픽업 바코드. 낭비 없는 로컬 커머스.
      </footer>
    </main>
  )
}

export default ProjectIntro
