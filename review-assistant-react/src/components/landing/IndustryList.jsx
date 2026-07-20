import { useInView } from '../../hooks/useInView.js'

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

function IndustryList() {
  const [industriesRef, industriesInView] = useInView()

  return (
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
  )
}

export default IndustryList
