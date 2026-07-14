import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import './HistoryPage.css'

const OPERATOR_LABEL = { '>=': '이상', '<=': '이하', '>': '초과', '<': '미만' }
const SMA_OPERATOR_LABEL = { '>=': '상향 돌파', '<=': '하향 이탈' }
const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

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
 * 저널 기능(메모 편집·AI 복기 요청)을 흡수해 기록·복기 조회 탭으로 통합됐다.
 */
function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loops, setLoops] = useState([])

  const [memoDrafts, setMemoDrafts] = useState({})
  const [editingMemoId, setEditingMemoId] = useState(null)
  const [savingMemoId, setSavingMemoId] = useState(null)
  const [requestingId, setRequestingId] = useState(null)
  const [requestErrorById, setRequestErrorById] = useState({})

  const load = useCallback(async () => {
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

    if (tradeError) {
      console.error('[HistoryPage] trades 조회 실패:', tradeError)
      setError('히스토리를 불러오지 못했습니다.')
      setLoading(false)
      return
    }

    const trades = tradeRows ?? []
    setMemoDrafts((prev) => {
      const next = { ...prev }
      for (const t of trades) if (!(t.id in next)) next[t.id] = t.memo ?? ''
      return next
    })

    let conditionMap = {}
    const conditionIds = [...new Set(trades.map((t) => t.condition_id).filter(Boolean))]
    if (conditionIds.length > 0) {
      const { data: conditionRows } = await supabase
        .from('conditions')
        .select('id, name, ticker, type, operator, target, sma_window')
        .in('id', conditionIds)
      if (conditionRows) conditionMap = Object.fromEntries(conditionRows.map((c) => [c.id, c]))
    }

    let reviewMap = {}
    if (trades.length > 0) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('trade_id, headline, created_at')
        .in('trade_id', trades.map((t) => t.id))
        .order('created_at', { ascending: false })
      if (reviewRows) {
        for (const row of reviewRows) {
          if (!(row.trade_id in reviewMap)) reviewMap[row.trade_id] = row
        }
      }
    }

    const nextLoops = trades.map((trade) => {
      const condition = trade.condition_id ? conditionMap[trade.condition_id] ?? null : null
      const review = reviewMap[trade.id] ?? null
      return { trade, condition, review, complete: Boolean(condition) && Boolean(review) }
    })

    setLoops(nextLoops)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleMemoSave(tradeId) {
    if (!supabase) return
    const value = memoDrafts[tradeId] ?? ''
    setSavingMemoId(tradeId)
    const { error: saveError } = await supabase.from('trades').update({ memo: value }).eq('id', tradeId)
    setSavingMemoId(null)
    if (saveError) return
    setLoops((prev) =>
      prev.map((loop) =>
        loop.trade.id === tradeId ? { ...loop, trade: { ...loop.trade, memo: value } } : loop,
      ),
    )
    setEditingMemoId(null)
  }

  async function handleRequestReview(tradeId) {
    if (!supabase) return
    setRequestingId(tradeId)
    setRequestErrorById((prev) => ({ ...prev, [tradeId]: '' }))
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('review-agent', {
        body: { trade_id: tradeId },
      })
      if (invokeError) throw invokeError
      if (data?.error) throw new Error(data.error)
      const review = data?.review ?? null
      setLoops((prev) =>
        prev.map((loop) =>
          loop.trade.id === tradeId
            ? { ...loop, review, complete: Boolean(loop.condition) && Boolean(review) }
            : loop,
        ),
      )
    } catch (err) {
      console.error('[HistoryPage] AI 복기 요청 실패:', err)
      setRequestErrorById((prev) => ({
        ...prev,
        [tradeId]: 'AI 복기 요청에 실패했습니다. (review-agent 함수 배포 상태를 확인하세요)',
      }))
    } finally {
      setRequestingId(null)
    }
  }

  const completeCount = loops.filter((loop) => loop.complete).length

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
          <p>아직 기록된 매매가 없습니다. 종목 페이지에서 조건 알림을 받거나 직접 매매를 기록하면 여기 루프로 쌓입니다.</p>
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
                <Link to={`/stock/${group.ticker}`} className="history-group__chart">
                  차트 보기 →
                </Link>
              </div>
              <ul className="history-list">
                {group.items.map(({ trade, condition, review, complete }) => {
                  const isEditing = editingMemoId === trade.id
                  const memoDraft = memoDrafts[trade.id] ?? ''
                  const memoChanged = memoDraft !== (trade.memo ?? '')
                  return (
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
                              {SIDE_LABEL[trade.side] ?? trade.side} @{formatPrice(trade.price, trade.market)}
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
                                <button
                                  type="button"
                                  className="history-review-request"
                                  onClick={() => handleRequestReview(trade.id)}
                                  disabled={requestingId === trade.id}
                                >
                                  {requestingId === trade.id ? '요청 중...' : '⚡ AI 복기 요청'}
                                </button>
                              )}
                              {requestErrorById[trade.id] && (
                                <p className="history-review-error">{requestErrorById[trade.id]}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="history-memo">
                        {isEditing ? (
                          <>
                            <textarea
                              className="history-memo__input"
                              rows={2}
                              value={memoDraft}
                              onChange={(e) =>
                                setMemoDrafts((prev) => ({ ...prev, [trade.id]: e.target.value }))
                              }
                              placeholder="메모를 추가하면 복기 정확도가 올라가요…"
                            />
                            {memoChanged && (
                              <button
                                type="button"
                                className="history-memo__save"
                                onClick={() => handleMemoSave(trade.id)}
                                disabled={savingMemoId === trade.id}
                              >
                                {savingMemoId === trade.id ? '저장 중...' : '메모 저장'}
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className="history-memo__toggle"
                            onClick={() => setEditingMemoId(trade.id)}
                          >
                            {trade.memo ? `“${trade.memo}”` : '+ 메모 추가'}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

export default HistoryPage
