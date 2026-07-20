import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { SETUP_TAGS, EMOTIONS, HORIZONS } from '../lib/tradeMeta.js'
import './TradeDetailPage.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }
const SIDES = ['buy', 'sell', 'hold']

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

/** ISO(timestamptz) → <input type="datetime-local"> 로컬 값 */
function toDatetimeLocal(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 인용된 과거 매매 근거 카드 (구 ReviewPage) */
function CitedCard({ trade }) {
  return (
    <div className="td-cited__card">
      <div className="td-cited__date">
        {formatDateTime(trade.traded_at)} · {trade.ticker} {SIDE_LABEL[trade.side] ?? trade.side}
      </div>
      <div className="td-cited__price">{formatPrice(trade.price, trade.market)}</div>
      {trade.memo && <div className="td-cited__memo">“{trade.memo}”</div>}
    </div>
  )
}

/**
 * 기록 상세 화면 (`/trade/:id`, WP-D D1).
 * 전 필드 수정 + 삭제 + AI 복기 섹션(구 ReviewPage `/review/:tradeId` 흡수)을 담당한다.
 * TradeForm 컴포넌트는 재사용하지 않는다(WP-C가 병행 수정 중) — 편집 폼은 이 페이지 전용으로 둔다.
 */
function TradeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [trade, setTrade] = useState(null)

  // 편집 폼 상태
  const [side, setSide] = useState('buy')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [memo, setMemo] = useState('')
  const [tradedAt, setTradedAt] = useState('')
  const [tags, setTags] = useState([])
  const [emotion, setEmotion] = useState(null)
  const [thesis, setThesis] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [horizon, setHorizon] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedAt, setSavedAt] = useState(0)
  const [deleting, setDeleting] = useState(false)

  // AI 복기 상태
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
      console.error('[TradeDetailPage] 인용 매매 조회 실패:', error)
      setCitedTrades([])
      return
    }
    setCitedTrades(data ?? [])
  }, [])

  const load = useCallback(async () => {
    if (!supabase) {
      setLoadError('Supabase 환경변수가 설정되지 않아 기록을 불러올 수 없습니다.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    const { data: tradeRow, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (tradeError) {
      console.error('[TradeDetailPage] trade 조회 실패:', tradeError)
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
    setSide(tradeRow.side)
    setPrice(String(tradeRow.price ?? ''))
    setQuantity(tradeRow.quantity != null ? String(tradeRow.quantity) : '')
    setMemo(tradeRow.memo ?? '')
    setTradedAt(toDatetimeLocal(tradeRow.traded_at))
    setTags(tradeRow.tags ?? [])
    setEmotion(tradeRow.emotion ?? null)
    setThesis(tradeRow.thesis ?? '')
    setTargetPrice(tradeRow.target_price != null ? String(tradeRow.target_price) : '')
    setStopPrice(tradeRow.stop_price != null ? String(tradeRow.stop_price) : '')
    setHorizon(tradeRow.horizon ?? null)
    setConfidence(tradeRow.confidence ?? null)

    const { data: reviewRow, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('trade_id', id)
      .maybeSingle()

    if (reviewError) {
      console.error('[TradeDetailPage] review 조회 실패:', reviewError)
    }
    setReview(reviewRow ?? null)
    await loadCitedTrades(reviewRow?.cited_trade_ids ?? [])

    setLoading(false)
  }, [id, loadCitedTrades])

  useEffect(() => {
    load()
  }, [load])

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!supabase || !trade) return
    setSaveError('')
    if (!price) {
      setSaveError('가격을 입력하세요.')
      return
    }
    const tradedIso = tradedAt ? new Date(tradedAt).toISOString() : trade.traded_at
    if (Number.isNaN(new Date(tradedIso).getTime())) {
      setSaveError('거래 일시가 올바르지 않습니다.')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('trades')
      .update({
        side,
        price: Number(price),
        quantity: quantity ? Number(quantity) : null,
        memo: memo || null,
        traded_at: tradedIso,
        tags: tags.length ? tags : [],
        emotion: emotion || null,
        thesis: thesis || null,
        target_price: targetPrice ? Number(targetPrice) : null,
        stop_price: stopPrice ? Number(stopPrice) : null,
        horizon: horizon || null,
        confidence: confidence || null,
      })
      .eq('id', id)
      .select()
      .single()
    setSaving(false)

    if (error) {
      console.error('[TradeDetailPage] 기록 저장 실패:', error)
      setSaveError('기록을 저장하지 못했습니다.')
      return
    }
    setTrade(data)
    setSavedAt(Date.now())
  }

  async function handleDelete() {
    if (!supabase || !trade) return
    if (!window.confirm('이 매매 기록을 삭제할까요? 저장된 AI 복기도 함께 삭제됩니다.')) return
    setDeleting(true)
    const { error } = await supabase.from('trades').delete().eq('id', id)
    setDeleting(false)
    if (error) {
      console.error('[TradeDetailPage] 기록 삭제 실패:', error)
      setSaveError('기록을 삭제하지 못했습니다.')
      return
    }
    navigate('/history')
  }

  async function handleRequestReview() {
    if (!supabase) return
    setRequesting(true)
    setRequestError('')
    try {
      const { data, error } = await supabase.functions.invoke('review-agent', {
        body: { trade_id: id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const nextReview = data?.review ?? null
      setReview(nextReview)
      await loadCitedTrades(nextReview?.cited_trade_ids ?? [])
    } catch (err) {
      console.error('[TradeDetailPage] AI 복기 요청 실패:', err)
      setRequestError('AI 복기 요청에 실패했습니다. (review-agent 함수 배포 상태를 확인하세요)')
    } finally {
      setRequesting(false)
    }
  }

  const citedCount = review?.cited_trade_ids?.length ?? 0

  return (
    <section className="trade-detail-page">
      <div className="td-crumb">
        <Link to="/history">← 히스토리</Link>
      </div>

      {loading && <p className="td-status">불러오는 중...</p>}
      {!loading && loadError && <p className="td-status td-status--error">{loadError}</p>}

      {!loading && !loadError && trade && (
        <>
          <h1 className="td-title">
            {trade.ticker} <span className="mono td-title__market">{trade.market}</span>
          </h1>

          <form className="card td-form" onSubmit={handleSave}>
            <div className="td-form__title">기록 수정</div>

            <div className="td-form__side">
              {SIDES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={
                    s === side ? `td-side-btn td-side-btn--${s} is-active` : `td-side-btn td-side-btn--${s}`
                  }
                  onClick={() => setSide(s)}
                >
                  {SIDE_LABEL[s]}
                </button>
              ))}
            </div>

            <div className="td-form__row">
              <label className="td-form__field">
                <span>가격</span>
                <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              <label className="td-form__field">
                <span>수량 (선택)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
            </div>

            <label className="td-form__field">
              <span>거래 일시</span>
              <input type="datetime-local" value={tradedAt} onChange={(e) => setTradedAt(e.target.value)} />
            </label>

            <label className="td-form__field">
              <span>메모 (선택)</span>
              <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
            </label>

            <div className="td-form__field">
              <span>셋업 태그 (선택)</span>
              <div className="td-form__tags">
                {SETUP_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={tags.includes(tag) ? 'td-tag-btn is-active' : 'td-tag-btn'}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="td-form__field">
              <span>감정 상태 (선택)</span>
              <div className="td-form__tags">
                {EMOTIONS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    className={emotion === e.value ? 'td-tag-btn is-active' : 'td-tag-btn'}
                    onClick={() => setEmotion((prev) => (prev === e.value ? null : e.value))}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 투자 계획 (선택) — 복기의 '계획 대비 실행' 축이 참조한다. */}
            <div className="td-form__plan">
              <span className="td-form__plan-title">투자 계획 (선택)</span>
              <label className="td-form__field">
                <span>진입 가설 (왜 이 매매를?)</span>
                <textarea rows={2} value={thesis} onChange={(e) => setThesis(e.target.value)} />
              </label>
              <div className="td-form__row">
                <label className="td-form__field">
                  <span>목표가</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </label>
                <label className="td-form__field">
                  <span>손절가</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                  />
                </label>
              </div>
              <div className="td-form__field">
                <span>예정 보유 기간</span>
                <div className="td-form__tags">
                  {HORIZONS.map((h) => (
                    <button
                      key={h.value}
                      type="button"
                      className={horizon === h.value ? 'td-tag-btn is-active' : 'td-tag-btn'}
                      onClick={() => setHorizon((prev) => (prev === h.value ? null : h.value))}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="td-form__field">
                <span>확신도</span>
                <div className="td-form__tags">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={confidence === n ? 'td-tag-btn is-active' : 'td-tag-btn'}
                      onClick={() => setConfidence((prev) => (prev === n ? null : n))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {saveError && <p className="td-form__error">{saveError}</p>}
            {savedAt > 0 && !saveError && <p className="td-form__saved">저장됐습니다.</p>}

            <div className="td-form__actions">
              <button type="submit" className="btn accent" disabled={saving}>
                {saving ? '저장 중...' : '변경사항 저장'}
              </button>
              <button type="button" className="td-form__delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? '삭제 중...' : '기록 삭제'}
              </button>
            </div>
          </form>

          <div className="card td-review">
            <div className="td-review__trade">
              <div>
                <div className="td-review__trade-main">
                  {trade.ticker} <span className="td-review__trade-market">{trade.market}</span>
                </div>
                <div className="td-review__trade-sub mono">
                  {formatDateTime(trade.traded_at)} · {formatPrice(trade.price, trade.market)}
                  {trade.quantity ? ` · ${trade.quantity}주` : ''}
                </div>
              </div>
              <span className={`badge ${trade.side}`}>{SIDE_LABEL[trade.side] ?? trade.side}</span>
            </div>

            {!review ? (
              <div className="td-review__request">
                <p className="td-review__request-desc">
                  아직 이 매매에 대한 AI 복기가 없습니다. 코칭 에이전트가 과거 매매·주가 흐름·지난 복기를
                  도구로 직접 조회해 반복 패턴을 짚어줍니다.
                </p>
                <button type="button" className="btn accent" onClick={handleRequestReview} disabled={requesting}>
                  {requesting ? '복기 생성 중… (에이전트가 도구를 호출하고 있어요)' : '⚡ AI 복기 요청'}
                </button>
                {requesting && (
                  <div className="td-review__spinner" aria-label="로딩 중">
                    <span className="td-review__dot" />
                    <span className="td-review__dot" />
                    <span className="td-review__dot" />
                  </div>
                )}
                {requestError && <p className="td-status td-status--error">{requestError}</p>}
              </div>
            ) : (
              <>
                <div className="verdict td-verdict">
                  <div className="tag td-verdict__tag">⚡ 복기 노트</div>
                  <div className="headline td-verdict__headline">{review.headline}</div>
                </div>

                <div className="td-grid">
                  <div className="cell td-cell">
                    <div className="td-cell__label">계획 대비</div>
                    <div className="td-cell__desc">{review.plan_adherence || '—'}</div>
                  </div>
                  <div className="cell td-cell">
                    <div className="td-cell__label">타이밍</div>
                    <div className="td-cell__desc">{review.timing || '—'}</div>
                  </div>
                  <div className="cell td-cell">
                    <div className="td-cell__label">감정</div>
                    <div className="td-cell__desc">{review.emotion || '—'}</div>
                  </div>
                  <div className="cell td-cell">
                    <div className="td-cell__label">행동 패턴</div>
                    <div className="td-cell__desc">{review.behavior_pattern || '—'}</div>
                  </div>
                </div>

                <div className="td-section-label">
                  이 복기가 참고한 기록
                  <span className="pill">과거 기록 {citedCount}건 참고</span>
                </div>
                {citedTrades.length > 0 ? (
                  <div className="td-cited">
                    {citedTrades.map((cited) => (
                      <CitedCard key={cited.id} trade={cited} />
                    ))}
                  </div>
                ) : (
                  <p className="td-cited__empty">참고한 과거 기록 없음</p>
                )}

                <p className="td-disclaimer">
                  Beacon의 복기는 회원님의 과거 기록을 돌아보기 위한 참고 정보이며, 투자자문·매매 권유가
                  아닙니다. 모든 투자 판단과 책임은 회원님 본인에게 있습니다.
                </p>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default TradeDetailPage
