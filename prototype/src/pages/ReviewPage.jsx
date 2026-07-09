import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import TradeChart from '../components/TradeChart.jsx'
import { getEntry } from '../mock/entries.js'
import { getReview } from '../mock/reviews.js'
import { getCandles } from '../mock/candles.js'
import './ReviewPage.css'

const TYPE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }
const EMOTION_LABEL = {
  calm: '침착 😌',
  fomo: 'FOMO 🚀',
  fear: '공포 😨',
  greed: '탐욕 🔥',
  uncertain: '불확실 🤔',
}
const HORIZON_LABEL = { short: '단기', medium: '중기', long: '장기' }

function fmtPrice(symbol, price) {
  if (price == null) return '—'
  return symbol === '005930'
    ? `${price.toLocaleString()}원`
    : `$${price.toLocaleString()}`
}

export default function ReviewPage() {
  const { entryId } = useParams()
  const entry = getEntry(entryId)
  const review = getReview(entry?.review_id)
  const [requested, setRequested] = useState(false)

  if (!entry) {
    return (
      <div className="page">
        <p>기록을 찾을 수 없습니다.</p>
        <Link to="/journal" className="btn">
          저널로
        </Link>
      </div>
    )
  }

  const candles = getCandles(entry.symbol)

  return (
    <div className="page review">
      <div className="topbar">
        <span className="brand">🔦 Beacon</span>
        <span className="crumb">· 저널 › AI 복기</span>
      </div>
      <h1>AI 복기</h1>

      <div className="review-grid">
        {/* 좌: 읽기전용 차트 + 스냅샷 */}
        <aside className="review-side">
          <div className="card">
            <div className="side-label">기록 시점 차트</div>
            <TradeChart
              candles={candles}
              entries={[entry]}
              readOnly
              height={220}
            />
          </div>

          <div className="card snapshot">
            <div className="snap-top">
              <div className="snap-name">
                {entry.symbolName}{' '}
                <span className="mono snap-ticker">{entry.symbol}</span>
              </div>
              <span className={`badge ${entry.entry_type}`}>
                {TYPE_LABEL[entry.entry_type]}
              </span>
            </div>
            <div className="snap-sub mono caption">
              {entry.entry_date} · {fmtPrice(entry.symbol, entry.price)}
              {entry.amount ? ` · ${entry.amount}주` : ''}
            </div>
            <div className="snap-metrics">
              <div>
                <span className="m-label">투자기간</span>
                <span className="m-val">
                  {HORIZON_LABEL[entry.time_horizon]}
                </span>
              </div>
              <div>
                <span className="m-label">확신도</span>
                <span className="m-val">{entry.conviction}</span>
              </div>
              <div>
                <span className="m-label">감정</span>
                <span className="m-val">
                  {EMOTION_LABEL[entry.emotion] ?? entry.emotion}
                </span>
              </div>
              <div>
                <span className="m-label">목표가</span>
                <span className="m-val mono">
                  {fmtPrice(entry.symbol, entry.target_price)}
                </span>
              </div>
            </div>
            {entry.reasons?.length > 0 && (
              <div className="snap-reasons">
                {entry.reasons.map((r) => (
                  <span key={r} className="reason-chip">
                    {r}
                  </span>
                ))}
              </div>
            )}
            <div className="snap-cond">
              <span className="m-label">가설 무효화 조건</span>
              <p>{entry.condition_text}</p>
            </div>
          </div>
        </aside>

        {/* 우: 복기 결과 */}
        <section className="review-main">
          {review ? (
            <div className="card">
              <div className="verdict">
                <div className="tag">⚡ 코칭 에이전트 판단</div>
                <div className="headline">{review.verdict}</div>
              </div>

              <div className="review-cells">
                {review.cells.map((c) => (
                  <div key={c.label} className="cell">
                    <div className="icon">{c.icon}</div>
                    <div className="label">{c.label}</div>
                    <div className="desc">{c.desc}</div>
                  </div>
                ))}
              </div>

              <div className="section-label">
                이 판단의 근거{' '}
                <span className="pill">
                  과거 기록 {review.cited.length}건 인용
                </span>
              </div>
              <div className="cited">
                {review.cited.map((ct) => (
                  <div key={ct.date} className="ct">
                    <div className="ct-d mono">
                      {ct.date} · {ct.title}
                    </div>
                    <div className="ct-m">{ct.pattern}</div>
                    <div className="ct-q">{ct.note}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : requested ? (
            <div className="card review-loading">
              <div className="spinner" />
              <div className="load-title">에이전트가 근거를 모으는 중…</div>
              <ul className="load-steps">
                <li>과거 유사 매매 검색 (search_past_trades)</li>
                <li>매매 전후 주가 흐름 조회 (get_price_context)</li>
                <li>지난 복기 기록 조회 (get_past_reviews)</li>
              </ul>
              <p className="caption">
                프로토타입에서는 복기 예시가{' '}
                <Link to="/review/e-samsung-buy" className="inline-link">
                  삼성전자 매수 기록
                </Link>
                에 준비되어 있습니다.
              </p>
            </div>
          ) : (
            <div className="card review-empty">
              <div className="empty-icon">🔍</div>
              <h2>아직 복기하지 않은 매매예요</h2>
              <p className="caption">
                AI 코칭 에이전트가 과거 매매·주가 흐름·지난 복기를 도구로
                직접 조회해 반복 패턴을 짚어줍니다.
              </p>
              <button
                className="btn accent"
                onClick={() => setRequested(true)}
              >
                ⚡ AI 복기 요청
              </button>
            </div>
          )}
        </section>
      </div>

      <Link to="/journal" className="review-back caption">
        ← 저널로 돌아가기
      </Link>
    </div>
  )
}
