import { useInView } from '../../hooks/useInView.js'

const REPORT_KEYWORDS = ['대기시간', '직원 친절', '가격']

const SENTIMENT_BARS = [
  { label: '긍정', percent: 83, colorVar: '--color-primary', delay: 0 },
  { label: '보통', percent: 12, colorVar: '--color-lp-bar-neutral', delay: 0.1 },
  { label: '부정', percent: 5, colorVar: '--color-lp-bar-negative', delay: 0.2 },
]

function ReportPreview() {
  const [reportRef, reportInView] = useInView()

  return (
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
  )
}

export default ReportPreview
