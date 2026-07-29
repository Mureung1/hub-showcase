import { useInView } from '../../hooks/useInView.js'

const STAT_TILES = [
  { label: '누적 분석 리뷰 수', value: '1,482 건', delta: '전월 대비 +18.4%' },
  { label: '평균 만족도 점수', value: '4.8 / 5.0', delta: '매우 우수 수준 유지' },
  { label: '불만 신속 해결률', value: '94.5%', delta: '업계 평균 대비 24% 높음' },
]

const COMPLAINT_KEYWORDS = [
  { label: '식기 세척 상태 불량', count: 6, percent: 100 },
  { label: '음식 간이 짬', count: 4, percent: 66 },
  { label: '포장 꼼꼼하지 못함', count: 2, percent: 33 },
]

const MONTHLY_TREND = [
  { month: '10월', positive: 78, negative: 22 },
  { month: '11월', positive: 82, negative: 18 },
  { month: '12월', positive: 85, negative: 15 },
  { month: '1월', positive: 80, negative: 20 },
  { month: '2월', positive: 88, negative: 12 },
  { month: '이번 달', positive: 92, negative: 8 },
]

function ReportPreview() {
  const [reportRef, reportInView] = useInView()

  return (
    <section
      ref={reportRef}
      className={`lp-report scroll-reveal ${reportInView ? 'in-view' : ''}`}
    >
      <div className="lp-report-header">
        <h2 className="section-title">통계부터 리포트까지 한눈에, 인사이트 대시보드</h2>
        <p className="section-sub">
          매일 쏟아지는 리뷰 데이터를 손쉽게 해석하세요. 굳이 데이터를 가공할 필요 없이, AI가
          매주 깔끔하게 요약해 드립니다.
        </p>
      </div>

      <div className="lp-dashboard">
        <div className="lp-dash-stats">
          {STAT_TILES.map((tile) => (
            <div className="lp-dash-tile" key={tile.label}>
              <span className="lp-dash-tile-label">{tile.label}</span>
              <strong className="lp-dash-tile-value">{tile.value}</strong>
              <span className="lp-dash-tile-delta">{tile.delta}</span>
            </div>
          ))}
        </div>

        <div className="lp-dash-card lp-dash-keywords">
          <h3 className="lp-dash-card-title">금월 불만족 키워드 분석</h3>
          <div className="lp-dash-keyword-list">
            {COMPLAINT_KEYWORDS.map((keyword) => (
              <div className="lp-dash-keyword-row" key={keyword.label}>
                <div className="lp-dash-keyword-head">
                  <span>{keyword.label}</span>
                  <span className="lp-dash-keyword-count">{keyword.count}건 감지</span>
                </div>
                <div className="lp-bar-track">
                  <div
                    className="lp-bar-fill lp-bar-fill--warning"
                    style={{ width: reportInView ? `${keyword.percent}%` : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-dash-card lp-dash-trend">
          <div className="lp-dash-card-headrow">
            <h3 className="lp-dash-card-title">최근 6개월 긍부정 리뷰 비중 추이</h3>
            <div className="lp-dash-legend">
              <span className="lp-dash-legend-item">
                <i className="lp-dot lp-dot--positive" />긍정
              </span>
              <span className="lp-dash-legend-item">
                <i className="lp-dot lp-dot--negative" />부정
              </span>
            </div>
          </div>
          <div className="lp-trend-chart">
            {MONTHLY_TREND.map((month) => (
              <div className="lp-trend-col" key={month.month}>
                <div className="lp-trend-stack">
                  <div
                    className="lp-trend-seg lp-trend-seg--positive"
                    style={{ height: reportInView ? `${month.positive}%` : 0 }}
                  />
                  <div
                    className="lp-trend-seg lp-trend-seg--negative"
                    style={{ height: reportInView ? `${month.negative}%` : 0 }}
                  />
                </div>
                <span className="lp-trend-month">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-dash-card lp-dash-guide">
          <h3 className="lp-dash-guide-title">💡 금주의 솔루션 가이드</h3>
          <p className="lp-dash-guide-text">
            &quot;지난 주말 세척 상태 불만이 2회 추가 포착되었습니다. 주말 세척 파트타이머
            교육 강화 혹은 식기세척기 헹굼 세팅 확인이 긴급합니다.&quot;
          </p>
        </div>
      </div>
    </section>
  )
}

export default ReportPreview
