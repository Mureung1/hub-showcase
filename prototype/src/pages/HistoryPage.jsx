import { Link } from 'react-router-dom'
import { ENTRIES } from '../mock/entries.js'
import { getCondition } from '../mock/conditions.js'
import { getReview } from '../mock/reviews.js'
import './HistoryPage.css'

const TYPE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

function fmtPrice(symbol, price) {
  return symbol === '005930'
    ? `${price.toLocaleString()}원`
    : `$${price.toLocaleString()}`
}

export default function HistoryPage() {
  const rows = ENTRIES.map((e) => ({
    entry: e,
    condition: getCondition(e.condition_id),
    review: getReview(e.review_id),
  }))
  const completed = rows.filter((r) => r.condition && r.review).length

  return (
    <div className="page history">
      <div className="topbar">
        <span className="brand">🔦 Beacon</span>
        <span className="crumb">· 히스토리</span>
      </div>
      <h1>히스토리</h1>

      <div className="loop-kpi card">
        <div className="kpi-num">{completed}</div>
        <div className="kpi-text">
          <strong>완주한 루프</strong>
          <span className="caption">
            감시 → 원클릭 기록 → AI 복기까지 끊기지 않은 매매 (전체 {rows.length}건)
          </span>
        </div>
      </div>

      <div className="hist-list">
        {rows.map(({ entry, condition, review }) => {
          const done = condition && review
          return (
            <div key={entry.id} className={`card hist-row${done ? ' done' : ''}`}>
              <div className="hist-title">
                <span className={`badge ${entry.entry_type}`}>
                  {TYPE_LABEL[entry.entry_type]}
                </span>
                <span className="hist-name">{entry.symbolName}</span>
                <span className="mono caption">
                  {entry.entry_date} · {fmtPrice(entry.symbol, entry.price)}
                </span>
                {done && <span className="status done">루프 완주</span>}
              </div>

              <div className="chain">
                <div className={`chain-step${condition ? ' on' : ''}`}>
                  <div className="chain-icon">👀</div>
                  <div className="chain-body">
                    <div className="chain-label">감시</div>
                    <div className="chain-desc">
                      {condition ? `“${condition.raw}”` : '수동 기록 (조건 없음)'}
                    </div>
                  </div>
                </div>
                <div className="chain-arrow">→</div>
                <div className="chain-step on">
                  <div className="chain-icon">📥</div>
                  <div className="chain-body">
                    <div className="chain-label">기록</div>
                    <div className="chain-desc">
                      {entry.memo || '메모 없음'}
                    </div>
                  </div>
                </div>
                <div className="chain-arrow">→</div>
                <div className={`chain-step${review ? ' on' : ''}`}>
                  <div className="chain-icon">🔁</div>
                  <div className="chain-body">
                    <div className="chain-label">복기</div>
                    <div className="chain-desc">
                      {review ? (
                        <Link to={`/review/${entry.id}`} className="chain-link">
                          복기 결과 보기 →
                        </Link>
                      ) : (
                        <Link to={`/review/${entry.id}`} className="chain-link muted">
                          아직 복기 안 함
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
