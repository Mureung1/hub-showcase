import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { EMOTION_LABEL } from '../lib/tradeMeta.js'
import Icon from '../components/Icon.jsx'
import './HistoryPage.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

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

/**
 * 히스토리: North Star인 "끊기지 않은 루프"(감시→기록→복기 완주)를 보여주는 화면.
 * 종목별 소형 카드 그리드로 조회하며, 수정·복기 요청 등 실제 조작은 카드 클릭 시
 * 이동하는 `/trade/:id` 상세 화면에서 담당한다(WP-E).
 */
function HistoryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loops, setLoops] = useState([])
  const [deletingId, setDeletingId] = useState(null)

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

    let conditionMap = {}
    const conditionIds = [...new Set(trades.map((t) => t.condition_id).filter(Boolean))]
    if (conditionIds.length > 0) {
      const { data: conditionRows } = await supabase.from('conditions').select('id').in('id', conditionIds)
      if (conditionRows) conditionMap = Object.fromEntries(conditionRows.map((c) => [c.id, c]))
    }

    let reviewMap = {}
    if (trades.length > 0) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('trade_id, created_at')
        .in('trade_id', trades.map((t) => t.id))
        .order('created_at', { ascending: false })
      if (reviewRows) {
        for (const row of reviewRows) {
          if (!(row.trade_id in reviewMap)) reviewMap[row.trade_id] = row
        }
      }
    }

    const nextLoops = trades.map((trade) => {
      const hasCondition = Boolean(trade.condition_id && conditionMap[trade.condition_id])
      const hasReview = Boolean(reviewMap[trade.id])
      return { trade, hasReview, complete: hasCondition && hasReview }
    })

    setLoops(nextLoops)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(tradeId) {
    if (!supabase) return
    if (!window.confirm('이 매매 기록을 삭제할까요? 저장된 AI 복기도 함께 삭제됩니다.')) return
    setDeletingId(tradeId)
    const { error: deleteError } = await supabase.from('trades').delete().eq('id', tradeId)
    setDeletingId(null)
    if (deleteError) {
      console.error('[HistoryPage] 기록 삭제 실패:', deleteError)
      return
    }
    setLoops((prev) => prev.filter((loop) => loop.trade.id !== tradeId))
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
              <ul className="history-grid">
                {group.items.map(({ trade, hasReview }) => {
                  const tags = trade.tags ?? []
                  const visibleTags = tags.slice(0, 3)
                  const extraTagCount = tags.length - visibleTags.length
                  return (
                    <li
                      key={trade.id}
                      className="history-card history-card--clickable"
                      onClick={() => navigate(`/trade/${trade.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/trade/${trade.id}`)
                      }}
                    >
                      <div className="history-card__top">
                        <span className={`badge ${trade.side}`}>{SIDE_LABEL[trade.side] ?? trade.side}</span>
                        <div className="history-card__top-right">
                          <span className={hasReview ? 'status done' : 'status pending'}>
                            {hasReview ? '분석완료' : '미복기'}
                          </span>
                          <button
                            type="button"
                            className="history-card__delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(trade.id)
                            }}
                            disabled={deletingId === trade.id}
                            aria-label="기록 삭제"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="history-card__line mono">
                        {formatDateTime(trade.traded_at)} · {formatPrice(trade.price, trade.market)}
                        {trade.quantity ? ` · ${trade.quantity}주` : ''}
                      </div>

                      {(visibleTags.length > 0 || trade.emotion) && (
                        <div className="history-card__chips">
                          {visibleTags.map((tag) => (
                            <span key={tag} className="history-card__tag">
                              {tag}
                            </span>
                          ))}
                          {extraTagCount > 0 && (
                            <span className="history-card__tag history-card__tag--more">+{extraTagCount}</span>
                          )}
                          {trade.emotion && (
                            <span className="history-card__emotion">{EMOTION_LABEL[trade.emotion] ?? trade.emotion}</span>
                          )}
                        </div>
                      )}
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
