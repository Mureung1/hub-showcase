import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import './ReviewPage.css'

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

function sideLabel(side) {
  return side === 'buy' ? '매수' : '매도'
}

/** 대상 매매 요약 칩 */
function TradeSummary({ trade }) {
  return (
    <div className="review-trade">
      <div>
        <div className="review-trade__main">
          {trade.ticker} <span className="review-trade__market">{trade.market}</span>
        </div>
        <div className="review-trade__sub">
          {formatDateTime(trade.traded_at)} · {formatPrice(trade.price, trade.market)}
          {trade.quantity ? ` · ${trade.quantity}주` : ''}
        </div>
      </div>
      <span
        className={trade.side === 'buy' ? 'review-badge review-badge--buy' : 'review-badge review-badge--sell'}
      >
        {sideLabel(trade.side)}
      </span>
    </div>
  )
}

/** 인용된 과거 매매 근거 카드 */
function CitedCard({ trade }) {
  return (
    <div className="review-cited__card">
      <div className="review-cited__date">
        {formatDateTime(trade.traded_at)} · {trade.ticker} {sideLabel(trade.side)}
      </div>
      <div className="review-cited__price">{formatPrice(trade.price, trade.market)}</div>
      {trade.memo && <div className="review-cited__memo">“{trade.memo}”</div>}
    </div>
  )
}

function ReviewPage() {
  const { tradeId } = useParams()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [trade, setTrade] = useState(null)
  const [review, setReview] = useState(null)
  const [citedTrades, setCitedTrades] = useState([])

  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState('')

  const loadCitedTrades = useCallback(async (ids) => {
    if (!supabase || !Array.isArray(ids) || ids.length === 0) {
      setCitedTrades([])
      return
    }
    const { data, error } = await supabase
      .from('trades')
      .select('id, ticker, market, side, price, traded_at, memo')
      .in('id', ids)
    if (error) {
      console.error('[ReviewPage] 인용 매매 조회 실패:', error)
      setCitedTrades([])
      return
    }
    setCitedTrades(data ?? [])
  }, [])

  const load = useCallback(async () => {
    if (!supabase) {
      setLoadError('Supabase 환경변수가 설정되지 않아 복기 결과를 불러올 수 없습니다.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    const { data: tradeRow, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .maybeSingle()

    if (tradeError) {
      console.error('[ReviewPage] trade 조회 실패:', tradeError)
      setLoadError('매매 기록을 불러오지 못했습니다.')
      setLoading(false)
      return
    }
    if (!tradeRow) {
      setLoadError('해당 매매 기록을 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    setTrade(tradeRow)

    const { data: reviewRow, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('trade_id', tradeId)
      .maybeSingle()

    if (reviewError) {
      console.error('[ReviewPage] review 조회 실패:', reviewError)
    }
    setReview(reviewRow ?? null)
    await loadCitedTrades(reviewRow?.cited_trade_ids ?? [])

    setLoading(false)
  }, [tradeId, loadCitedTrades])

  useEffect(() => {
    load()
  }, [load])

  async function handleRequestReview() {
    if (!supabase) return
    setRequesting(true)
    setRequestError('')
    try {
      const { data, error } = await supabase.functions.invoke('review-agent', {
        body: { trade_id: tradeId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const nextReview = data?.review ?? null
      setReview(nextReview)
      await loadCitedTrades(nextReview?.cited_trade_ids ?? [])
    } catch (err) {
      console.error('[ReviewPage] AI 복기 요청 실패:', err)
      setRequestError('AI 복기 요청에 실패했습니다. (review-agent 함수 배포 상태를 확인하세요)')
    } finally {
      setRequesting(false)
    }
  }

  const citedCount = review?.cited_trade_ids?.length ?? 0

  return (
    <section className="review-page">
      <div className="review-topbar">
        <span className="review-brand">🔦 Beacon</span>
        <span className="review-crumb">· 저널 › AI 복기</span>
      </div>
      <h1 className="review-title">AI 복기</h1>

      {loading && <p className="review-status">불러오는 중...</p>}
      {!loading && loadError && (
        <p className="review-status review-status--error">{loadError}</p>
      )}

      {!loading && !loadError && trade && (
        <div className="review-card">
          <TradeSummary trade={trade} />

          {!review ? (
            <div className="review-request">
              <p className="review-request__desc">
                아직 이 매매에 대한 AI 복기가 없습니다. 코칭 에이전트가 과거 매매·주가 흐름·지난 복기를
                도구로 직접 조회해 반복 패턴을 짚어줍니다.
              </p>
              <button
                type="button"
                className="review-request__btn"
                onClick={handleRequestReview}
                disabled={requesting}
              >
                {requesting ? '복기 생성 중… (에이전트가 도구를 호출하고 있어요)' : '⚡ AI 복기 요청'}
              </button>
              {requesting && (
                <div className="review-spinner" aria-label="로딩 중">
                  <span className="review-spinner__dot" />
                  <span className="review-spinner__dot" />
                  <span className="review-spinner__dot" />
                </div>
              )}
              {requestError && <p className="review-status review-status--error">{requestError}</p>}
            </div>
          ) : (
            <>
              <div className="review-verdict">
                <div className="review-verdict__tag">⚡ 코칭 에이전트 판단</div>
                <div className="review-verdict__headline">{review.headline}</div>
              </div>

              <div className="review-grid">
                <div className="review-cell">
                  <div className="review-cell__icon">⏱️</div>
                  <div className="review-cell__label">타이밍</div>
                  <div className="review-cell__desc">{review.timing || '—'}</div>
                </div>
                <div className="review-cell">
                  <div className="review-cell__icon">🌡️</div>
                  <div className="review-cell__label">감정</div>
                  <div className="review-cell__desc">{review.emotion || '—'}</div>
                </div>
                <div className="review-cell">
                  <div className="review-cell__icon">🔁</div>
                  <div className="review-cell__label">반복 실수</div>
                  <div className="review-cell__desc">{review.repeated_mistake || '—'}</div>
                </div>
              </div>

              <div className="review-section-label">
                이 판단의 근거
                <span className="review-pill">과거 기록 {citedCount}건 인용</span>
              </div>
              {citedTrades.length > 0 ? (
                <div className="review-cited">
                  {citedTrades.map((cited) => (
                    <CitedCard key={cited.id} trade={cited} />
                  ))}
                </div>
              ) : (
                <p className="review-cited__empty">인용된 과거 기록 없음</p>
              )}
            </>
          )}
        </div>
      )}

      <p className="review-back">
        <Link to="/journal">← 저널로 돌아가기</Link>
      </p>
    </section>
  )
}

export default ReviewPage
