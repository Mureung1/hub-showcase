import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineStyle,
} from 'lightweight-charts'
import { supabase } from '../lib/supabase.js'
import { resolveSymbol } from '../lib/symbols.js'
import ConditionForm from '../components/ConditionForm.jsx'
import Icon from '../components/Icon.jsx'
import './StockPage.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }
const OPERATOR_LABEL = { '>=': '이상', '<=': '이하', '>': '초과', '<': '미만' }
const SMA_OPERATOR_LABEL = { '>=': '상향 돌파', '<=': '하향 이탈' }
const STATUS_LABEL = { active: '감시 중', done: '완료', disabled: '대기' }

function readToken(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
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

/** traded_at/created_at(timestamptz)의 날짜 부분만 차트 마커 time에 사용 */
function dateOnly(iso) {
  return String(iso).slice(0, 10)
}

function describeCondition(condition) {
  if (condition.type === 'price') {
    const opText = OPERATOR_LABEL[condition.operator] ?? condition.operator
    return `현재가 ${Number(condition.target).toLocaleString('ko-KR')} ${opText}`
  }
  if (condition.type === 'sma_cross') {
    const opText = SMA_OPERATOR_LABEL[condition.operator] ?? condition.operator
    return `SMA${condition.sma_window ?? '?'} ${opText}`
  }
  return '조건을 확인할 수 없습니다.'
}

/** 매매 기록 1건 카드: 메모 인라인 편집 + AI 복기 요청/보기 버튼. */
function TradeRecordCard({
  trade,
  memoDraft,
  onMemoChange,
  onMemoSave,
  saving,
  hasReview,
  requesting,
  reviewError,
  onRequestReview,
  onViewReview,
}) {
  const memoChanged = memoDraft !== (trade.memo ?? '')

  return (
    <div className="stock-rec">
      <div className="stock-rec__top">
        <span className={`badge ${trade.side}`}>{SIDE_LABEL[trade.side] ?? trade.side}</span>
        <span className="mono stock-rec__sub">
          {formatPrice(trade.price, trade.market)} · {formatDateTime(trade.traded_at)}
          {trade.quantity ? ` · ${trade.quantity}주` : ''}
        </span>
      </div>

      <textarea
        className="stock-rec__memo"
        rows={2}
        value={memoDraft}
        onChange={(event) => onMemoChange(event.target.value)}
        placeholder="메모를 추가하면 복기 정확도가 올라가요…"
      />
      {memoChanged && (
        <button type="button" className="stock-rec__save" onClick={onMemoSave} disabled={saving}>
          {saving ? '저장 중...' : '메모 저장'}
        </button>
      )}

      {hasReview ? (
        <button type="button" className="stock-rec__review" onClick={onViewReview}>
          복기 보기
        </button>
      ) : (
        <button
          type="button"
          className="stock-rec__review"
          onClick={onRequestReview}
          disabled={requesting}
        >
          {requesting ? '복기 요청 중...' : '⚡ AI 복기 요청'}
        </button>
      )}
      {reviewError && <p className="stock-rec__error">{reviewError}</p>}
    </div>
  )
}

export default function StockPage() {
  const navigate = useNavigate()
  const { ticker: tickerParam } = useParams()
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const markersRef = useRef(null)
  const priceLinesRef = useRef([])

  const [meta, setMeta] = useState(null) // {ticker, market, exchange, name}
  const [metaError, setMetaError] = useState('')

  const [candles, setCandles] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState('')
  const [markerColors, setMarkerColors] = useState({
    up: '#e0453f',
    down: '#2f6bd6',
    hold: '#d99a2b',
    accent: '#635bff',
    accent2: '#8b5cf6',
  })

  const [starred, setStarred] = useState(false)
  const [starBusy, setStarBusy] = useState(false)

  const [trades, setTrades] = useState([])
  const [conditions, setConditions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [reviewedIds, setReviewedIds] = useState(() => new Set())

  const [side, setSide] = useState('buy')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [memo, setMemo] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState('')

  const [memoDrafts, setMemoDrafts] = useState({})
  const [savingMemoId, setSavingMemoId] = useState(null)
  const [reviewRequestingId, setReviewRequestingId] = useState(null)
  const [reviewErrorByTrade, setReviewErrorByTrade] = useState({})
  const [deletingConditionId, setDeletingConditionId] = useState(null)

  // 종목 메타 해석: symbols 마스터 우선, 없으면 기존 trades로 시장 추정
  useEffect(() => {
    if (!tickerParam) return
    let cancelled = false

    async function resolveMeta() {
      setMetaError('')
      const resolved = await resolveSymbol(tickerParam)
      if (cancelled) return
      if (resolved) {
        setMeta(resolved)
        return
      }
      if (!supabase) {
        setMetaError('Supabase 환경변수가 설정되지 않았습니다.')
        return
      }
      const { data } = await supabase
        .from('trades')
        .select('ticker, market')
        .eq('ticker', tickerParam.toUpperCase())
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setMeta({ ticker: data.ticker, market: data.market, exchange: null, name: data.ticker })
      } else {
        setMetaError('종목 정보를 찾을 수 없습니다.')
      }
    }

    resolveMeta()
    return () => {
      cancelled = true
    }
  }, [tickerParam])

  // 관심종목 여부
  useEffect(() => {
    if (!meta || !supabase) return
    let cancelled = false
    supabase
      .from('watchlists')
      .select('symbol')
      .eq('symbol', meta.ticker)
      .eq('market', meta.market)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setStarred(Boolean(data))
      })
    return () => {
      cancelled = true
    }
  }, [meta])

  async function toggleStar() {
    if (!supabase || !meta) return
    setStarBusy(true)
    try {
      if (starred) {
        await supabase.from('watchlists').delete().eq('symbol', meta.ticker).eq('market', meta.market)
        setStarred(false)
      } else {
        // watchlists.user_id 는 NOT NULL + RLS(with check auth.uid()=user_id) → user_id 필수
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id
        if (!userId) return
        await supabase.from('watchlists').insert({
          user_id: userId,
          symbol: meta.ticker,
          market: meta.market,
          exchange: meta.exchange ?? null,
          name: meta.name,
        })
        setStarred(true)
      }
    } finally {
      setStarBusy(false)
    }
  }

  // 이 종목의 매매/조건/알림 로드
  const loadRecords = useCallback(async () => {
    if (!meta || !supabase) return

    const { data: tradeRows } = await supabase
      .from('trades')
      .select('*')
      .eq('ticker', meta.ticker)
      .eq('market', meta.market)
      .order('traded_at', { ascending: false })
    const tradeList = tradeRows ?? []
    setTrades(tradeList)
    setMemoDrafts((prev) => {
      const next = { ...prev }
      for (const t of tradeList) if (!(t.id in next)) next[t.id] = t.memo ?? ''
      return next
    })

    if (tradeList.length > 0) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('trade_id')
        .in('trade_id', tradeList.map((t) => t.id))
      if (reviewRows) setReviewedIds(new Set(reviewRows.map((r) => r.trade_id)))
    }

    const { data: conditionRows } = await supabase
      .from('conditions')
      .select('*')
      .eq('ticker', meta.ticker)
      .eq('market', meta.market)
      .order('created_at', { ascending: false })
    setConditions(conditionRows ?? [])

    // alerts 테이블은 0005 마이그레이션 적용 전엔 없을 수 있음 — 실패해도 조용히 빈 배열
    try {
      const { data: alertRows, error } = await supabase
        .from('alerts')
        .select('id, triggered_at, price')
        .eq('ticker', meta.ticker)
        .eq('market', meta.market)
        .order('triggered_at', { ascending: false })
      if (error) throw error
      setAlerts(alertRows ?? [])
    } catch {
      setAlerts([])
    }
  }, [meta])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // 일봉 조회
  useEffect(() => {
    if (!meta || !supabase) return
    let cancelled = false

    async function loadCandles() {
      setChartLoading(true)
      setChartError('')
      try {
        const { data, error } = await supabase.functions.invoke('market-data', {
          body: { ticker: meta.ticker, market: meta.market, exchange: meta.exchange ?? null },
        })
        if (cancelled) return
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        setCandles(data?.candles ?? [])
      } catch (err) {
        console.error('[StockPage] market-data 호출 실패:', err)
        if (!cancelled) {
          setChartError('차트 데이터를 불러오지 못했습니다. (market-data 함수 배포 상태를 확인하세요)')
          setCandles([])
        }
      } finally {
        if (!cancelled) setChartLoading(false)
      }
    }

    loadCandles()
    return () => {
      cancelled = true
    }
  }, [meta])

  // 차트 생성 — meta 로딩 후 차트 컨테이너가 DOM에 나타난 뒤 1회 생성.
  // (meta 로딩 전엔 "불러오는 중" 화면이라 컨테이너가 없어 생성 불가 → meta 의존 필요)
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container || chartRef.current) return

    const colors = {
      up: readToken('--up', '#e0453f'),
      down: readToken('--down', '#2f6bd6'),
      hold: readToken('--hold', '#d99a2b'),
      accent: readToken('--accent', '#635bff'),
      accent2: readToken('--accent-2', '#8b5cf6'),
    }
    const border = readToken('--border', '#e4e8ee')
    setMarkerColors(colors)

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: readToken('--bg', '#ffffff') },
        textColor: readToken('--text', '#3c4257'),
      },
      grid: { vertLines: { color: border }, horzLines: { color: border } },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true },
      crosshair: { mode: 1 },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      borderUpColor: colors.up,
      borderDownColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    })

    chartRef.current = chart
    seriesRef.current = series
    markersRef.current = createSeriesMarkers(series, [])

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      markersRef.current = null
      priceLinesRef.current = []
    }
  }, [meta])

  useEffect(() => {
    seriesRef.current?.setData(candles)
  }, [candles])

  // 마커 4종: 매수▲ / 매도▼ / 관망● / 조건설정■ / 조건충족●(accent-2)
  useEffect(() => {
    if (!markersRef.current) return
    const tradeMarkers = trades.map((t) => ({
      time: dateOnly(t.traded_at),
      position: t.side === 'buy' ? 'belowBar' : t.side === 'sell' ? 'aboveBar' : 'inBar',
      color: t.side === 'buy' ? markerColors.up : t.side === 'sell' ? markerColors.down : markerColors.hold,
      shape: t.side === 'buy' ? 'arrowUp' : t.side === 'sell' ? 'arrowDown' : 'circle',
      text: SIDE_LABEL[t.side] ?? t.side,
    }))
    // 가격 조건은 수평 임계선(아래 별도 effect)으로, sma_cross만 시점 마커로 표시
    const conditionMarkers = conditions
      .filter((c) => c.type === 'sma_cross')
      .map((c) => ({
        time: dateOnly(c.created_at),
        position: 'aboveBar',
        color: markerColors.accent,
        shape: 'square',
        text: '조건 설정',
      }))
    const alertMarkers = alerts.map((a) => ({
      time: dateOnly(a.triggered_at),
      position: 'aboveBar',
      color: markerColors.accent2,
      shape: 'circle',
      text: '조건 충족',
    }))
    const markers = [...tradeMarkers, ...conditionMarkers, ...alertMarkers].sort((a, b) =>
      a.time < b.time ? -1 : a.time > b.time ? 1 : 0,
    )
    markersRef.current.setMarkers(markers)
  }, [trades, conditions, alerts, markerColors])

  // 가격 조건(type=price)은 목표가 수평 임계선(priceLine)으로 표시 — 시점 마커보다 직관적
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    for (const line of priceLinesRef.current) series.removePriceLine(line)
    priceLinesRef.current = conditions
      .filter((c) => c.type === 'price' && c.target != null)
      .map((c) => {
        const opText = OPERATOR_LABEL[c.operator] ?? c.operator
        return series.createPriceLine({
          price: Number(c.target),
          color: markerColors.accent,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `조건 ${opText}`,
        })
      })
  }, [conditions, markerColors])

  // 최신 종가 → 기록 폼 가격 자동 채움 (사용자가 아직 수정하지 않았을 때만)
  const latestClose = useMemo(() => {
    if (candles.length === 0) return null
    return candles[candles.length - 1].close
  }, [candles])
  useEffect(() => {
    if (latestClose != null) setPrice((prev) => (prev === '' ? String(latestClose) : prev))
  }, [latestClose])

  async function handleRecord(e) {
    e.preventDefault()
    if (!supabase || !meta) return
    setRecordError('')
    if (!price) {
      setRecordError('가격을 입력하세요.')
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      setRecordError('로그인이 필요합니다.')
      return
    }

    setRecording(true)
    const { error } = await supabase.from('trades').insert({
      user_id: userId,
      ticker: meta.ticker,
      market: meta.market,
      side,
      price: Number(price),
      quantity: quantity ? Number(quantity) : null,
      memo: memo || null,
      traded_at: new Date().toISOString(),
      source: 'manual',
    })
    setRecording(false)

    if (error) {
      console.error('[StockPage] 매매 기록 저장 실패:', error)
      setRecordError('기록을 저장하지 못했습니다.')
      return
    }
    setQuantity('')
    setMemo('')
    await loadRecords()
  }

  async function handleMemoSave(tradeId) {
    if (!supabase) return
    const value = memoDrafts[tradeId] ?? ''
    setSavingMemoId(tradeId)
    const { error } = await supabase.from('trades').update({ memo: value }).eq('id', tradeId)
    setSavingMemoId(null)
    if (error) return
    setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, memo: value } : t)))
  }

  async function handleRequestReview(tradeId) {
    if (!supabase) return
    setReviewRequestingId(tradeId)
    setReviewErrorByTrade((prev) => ({ ...prev, [tradeId]: '' }))
    try {
      const { data, error } = await supabase.functions.invoke('review-agent', {
        body: { trade_id: tradeId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      navigate(`/review/${tradeId}`)
    } catch (err) {
      console.error('[StockPage] AI 복기 요청 실패:', err)
      setReviewErrorByTrade((prev) => ({
        ...prev,
        [tradeId]: 'AI 복기 요청에 실패했습니다. (review-agent 함수가 아직 배포되지 않았을 수 있어요)',
      }))
    } finally {
      setReviewRequestingId(null)
    }
  }

  async function handleDeleteCondition(id) {
    if (!supabase) return
    if (!window.confirm('이 조건을 삭제할까요?')) return
    setDeletingConditionId(id)
    const { error } = await supabase.from('conditions').delete().eq('id', id)
    setDeletingConditionId(null)
    if (error) return
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }

  if (metaError) {
    return (
      <section className="stock-page">
        <p className="stock-status stock-status--error">{metaError}</p>
        <Link to="/dashboard" className="stock-back">
          ← 대시보드로
        </Link>
      </section>
    )
  }

  if (!meta) {
    return (
      <section className="stock-page">
        <p className="stock-status">불러오는 중...</p>
      </section>
    )
  }

  return (
    <section className="stock-page">
      <div className="stock-head">
        <div>
          <div className="stock-head__name">
            {meta.name} <span className="mono stock-head__ticker">{meta.ticker}</span>
          </div>
          {latestClose != null && (
            <div className="mono stock-head__price">{formatPrice(latestClose, meta.market)}</div>
          )}
        </div>
        <button
          type="button"
          className={starred ? 'stock-star stock-star--active' : 'stock-star'}
          onClick={toggleStar}
          disabled={starBusy}
        >
          <Icon name="star" size={16} /> {starred ? '관심 해제' : '관심 등록'}
        </button>
      </div>

      <div className="stock-layout">
        <div className="card stock-chart-card">
          <div className="stock-chart-head">
            <span>{meta.ticker} · 일봉</span>
            {chartLoading && <span className="stock-chart-head__hint">불러오는 중...</span>}
          </div>
          {chartError && <p className="stock-status stock-status--error">{chartError}</p>}
          <div ref={chartContainerRef} className="stock-chart" />
          <div className="stock-legend">
            <span>
              <i className="stock-dot" style={{ background: markerColors.up }} />
              매수
            </span>
            <span>
              <i className="stock-dot" style={{ background: markerColors.down }} />
              매도
            </span>
            <span>
              <i className="stock-dot" style={{ background: markerColors.hold }} />
              관망
            </span>
            <span>
              <i className="stock-line" style={{ borderColor: markerColors.accent }} />
              조건 가격
            </span>
            <span>
              <i className="stock-dot stock-dot--square" style={{ background: markerColors.accent }} />
              조건 이평
            </span>
            <span>
              <i className="stock-dot" style={{ background: markerColors.accent2 }} />
              조건 충족
            </span>
          </div>
        </div>

        <div className="stock-side">
          <form className="card stock-record" onSubmit={handleRecord}>
            <div className="stock-record__title">매매 기록</div>
            <div className="stock-record__side">
              {['buy', 'sell', 'hold'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={s === side ? `stock-side-btn stock-side-btn--${s} is-active` : `stock-side-btn stock-side-btn--${s}`}
                  onClick={() => setSide(s)}
                >
                  {SIDE_LABEL[s]}
                </button>
              ))}
            </div>
            <label className="stock-record__field">
              <span>가격</span>
              <input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label className="stock-record__field">
              <span>수량 (선택)</span>
              <input
                type="number"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label className="stock-record__field">
              <span>메모 (선택)</span>
              <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
            </label>
            {recordError && <p className="stock-status stock-status--error">{recordError}</p>}
            <button type="submit" className="btn accent block" disabled={recording}>
              {recording ? '기록 중...' : '기록하기'}
            </button>
          </form>

          <ConditionForm
            fixedSymbol={{ ticker: meta.ticker, market: meta.market, exchange: meta.exchange, name: meta.name }}
            onCreated={(c) => setConditions((prev) => [c, ...prev])}
          />

          <div className="card stock-panel">
            <div className="stock-panel__title">이 종목의 조건</div>
            {conditions.length === 0 && <p className="stock-status">설정된 조건이 없어요.</p>}
            {conditions.map((c) => (
              <div key={c.id} className="stock-condition-row">
                <div>
                  <div className="stock-condition-row__desc">{describeCondition(c)}</div>
                  <span className={`status ${c.status === 'active' ? 'active' : c.status === 'done' ? 'done' : 'pending'}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
                <button
                  type="button"
                  className="stock-condition-row__delete"
                  onClick={() => handleDeleteCondition(c.id)}
                  disabled={deletingConditionId === c.id}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="card stock-panel">
            <div className="stock-panel__title">이 종목의 기록</div>
            {trades.length === 0 && <p className="stock-status">아직 기록이 없어요.</p>}
            {trades.map((t) => (
              <TradeRecordCard
                key={t.id}
                trade={t}
                memoDraft={memoDrafts[t.id] ?? ''}
                onMemoChange={(v) => setMemoDrafts((prev) => ({ ...prev, [t.id]: v }))}
                onMemoSave={() => handleMemoSave(t.id)}
                saving={savingMemoId === t.id}
                hasReview={reviewedIds.has(t.id)}
                requesting={reviewRequestingId === t.id}
                reviewError={reviewErrorByTrade[t.id]}
                onRequestReview={() => handleRequestReview(t.id)}
                onViewReview={() => navigate(`/review/${t.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
