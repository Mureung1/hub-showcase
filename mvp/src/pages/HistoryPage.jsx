import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import './HistoryPage.css'

const OPERATOR_LABEL = { '>=': '이상', '<=': '이하', '>': '초과', '<': '미만' }
const SMA_OPERATOR_LABEL = { '>=': '상향 돌파', '<=': '하향 이탈' }

function formatNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}

function formatPrice(price, market) {
  const value = Number(price)
  if (!Number.isFinite(value)) return '-'
  return market === 'US' ? `$${value.toLocaleString('en-US')}` : `${value.toLocaleString('ko-KR')}원`
}

function formatDateTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function describeCondition(condition) {
  if (!condition) return '수동 기록'
  if (condition.type === 'price') {
    const opText = OPERATOR_LABEL[condition.operator] ?? condition.operator
    return `${condition.name} 현재가 ${formatNumber(condition.target)} ${opText}`
  }
  if (condition.type === 'sma_cross') {
    const opText = SMA_OPERATOR_LABEL[condition.operator] ?? condition.operator
    return `${condition.name} SMA${condition.sma_window ?? '?'} ${opText}`
  }
  return condition.name
}

/**
 * 히스토리: North Star인 "끊기지 않은 루프"(감시→기록→복기 완주)를 보여주는 화면.
 * trades를 traded_at desc로 조회하고, condition_id/trade_id로 conditions·reviews를
 * 각각 조회해 붙인다(JournalPage와 동일하게 개별 조회 방식 사용).
 * 근거: 작업 지시서, docs/prd.md §7(화면 스펙) §8(루프 완주 수용 기준)
 */
function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loops, setLoops] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabase) {
        setError('Supabase 환경변수가 설정되지 않아 히스토리를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data: tradeRows, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .order('traded_at', { ascending: false })

      if (cancelled) return

      if (tradeError) {
        console.error('[HistoryPage] trades 조회 실패:', tradeError)
        setError('히스토리를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const trades = tradeRows ?? []

      let conditionMap = {}
      const conditionIds = [...new Set(trades.map((t) => t.condition_id).filter(Boolean))]
      if (conditionIds.length > 0) {
        const { data: conditionRows, error: conditionError } = await supabase
          .from('conditions')
          .select('id, name, ticker, type, operator, target, sma_window')
          .in('id', conditionIds)
        if (!cancelled && !conditionError && conditionRows) {
          conditionMap = Object.fromEntries(conditionRows.map((c) => [c.id, c]))
        }
      }

      let reviewMap = {}
      if (trades.length > 0) {
        const tradeIds = trades.map((t) => t.id)
        const { data: reviewRows, error: reviewError } = await supabase
          .from('reviews')
          .select('trade_id, headline, created_at')
          .in('trade_id', tradeIds)
          .order('created_at', { ascending: false })
        if (!cancelled && !reviewError && reviewRows) {
          for (const row of reviewRows) {
            if (!(row.trade_id in reviewMap)) reviewMap[row.trade_id] = row
          }
        }
      }

      if (cancelled) return

      const nextLoops = trades.map((trade) => {
        const condition = trade.condition_id ? conditionMap[trade.condition_id] ?? null : null
        const review = reviewMap[trade.id] ?? null
        return {
          trade,
          condition,
          review,
          complete: Boolean(condition) && Boolean(review),
        }
      })

      setLoops(nextLoops)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const completeCount = loops.filter((loop) => loop.complete).length

  // 종목별 그룹 (investment_journal 히스토리 구조)
  const groups = useMemo(() => {
    const map = new Map()
    for (const loop of loops) {
      const key = `${loop.trade.ticker}|${loop.trade.market}`
      if (!map.has(key)) {
        map.set(key, { key, ticker: loop.trade.ticker, market: loop.trade.market, items: [] })
      }
      map.get(key).items.push(loop)
    }
    return [...map.values()]
  }, [loops])

  return (
    <section className="history-page">
      <h1>히스토리</h1>

      {loading && <p className="history-status">불러오는 중...</p>}
      {!loading && error && <p className="history-status history-status--error">{error}</p>}

      {!loading && !error && loops.length === 0 && (
        <div className="history-empty">
          <p>아직 기록된 매매가 없습니다. 조건 알림을 받거나 저널에서 매매를 기록하면 여기 루프로 쌓입니다.</p>
        </div>
      )}

      {!loading && !error && loops.length > 0 && (
        <>
          <div className="history-summary">
            <span className="history-summary__count">
              완주한 루프 <strong>{completeCount}</strong>개 / 전체 {loops.length}개
            </span>
          </div>

          {groups.map((group) => (
            <div key={group.key} className="history-group">
              <div className="history-group__head">
                <span className="history-group__name">
                  {group.ticker} <span className="history-card__market">{group.market}</span>
                  <span className="history-group__count"> · {group.items.length}건</span>
                </span>
                <Link to={`/journal/${group.ticker}`} className="history-group__chart">
                  차트 보기 →
                </Link>
              </div>
              <ul className="history-list">
                {group.items.map(({ trade, condition, review, complete }) => (
                  <li
                    key={trade.id}
                    className={complete ? 'history-card history-card--complete' : 'history-card'}
                  >
                <div className="history-card__head">
                  <span className="history-card__name">
                    {trade.ticker} <span className="history-card__market">{trade.market}</span>
                  </span>
                  {complete && <span className="history-badge">루프 완주</span>}
                </div>

                <div className="history-chain">
                  <div className="history-step">
                    <span className="history-step__icon">🔔</span>
                    <div className="history-step__body">
                      <div className="history-step__label">조건</div>
                      <div className="history-step__value">{describeCondition(condition)}</div>
                    </div>
                  </div>

                  <span className="history-arrow">→</span>

                  <div className="history-step">
                    <span className="history-step__icon">💰</span>
                    <div className="history-step__body">
                      <div className="history-step__label">기록</div>
                      <div className="history-step__value">
                        {trade.side === 'buy' ? '매수' : '매도'} @{formatPrice(trade.price, trade.market)}
                        <span className="history-step__meta"> · {formatDateTime(trade.traded_at)}</span>
                      </div>
                    </div>
                  </div>

                  <span className="history-arrow">→</span>

                  <div className="history-step">
                    <span className="history-step__icon">🧠</span>
                    <div className="history-step__body">
                      <div className="history-step__label">복기</div>
                      <div className="history-step__value">
                        {review ? (
                          <Link to={`/review/${trade.id}`} className="history-review-link">
                            {review.headline}
                          </Link>
                        ) : (
                          <span className="history-step__pending">복기 대기</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

export default HistoryPage
