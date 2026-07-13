import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CandlestickSeries, ColorType, createChart, createSeriesMarkers } from 'lightweight-charts'
import { supabase } from '../lib/supabase.js'
import { resolveSymbol } from '../lib/symbols.js'
import './JournalPage.css'

// 캔들/마커 색은 CSS 토큰(--up/--down)에서 읽어 테마를 추종한다.
// 국내 관례(docs/research.md §10): 상승/매수=빨강, 하락/매도=파랑. 값이 비면 다크 폴백.
function readToken(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function symbolKey(ticker, market) {
  return `${ticker}|${market}`
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

/** traded_at(timestamptz)의 날짜 부분만 "YYYY-MM-DD"로 뽑아 차트 마커 time에 사용한다. */
function tradedDateOnly(iso) {
  return String(iso).slice(0, 10)
}

/**
 * 매매 기록 1건 카드: 메모 인라인 편집 + AI 복기 요청/보기 버튼.
 */
function TradeRecordCard({
  trade,
  active,
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
    <div className={active ? 'journal-rec journal-rec--active' : 'journal-rec'}>
      <div className="journal-rec__top">
        <span className="journal-rec__name">
          {trade.ticker} <span className="journal-rec__market">{trade.market}</span>
        </span>
        <span
          className={
            trade.side === 'buy' ? 'journal-tag journal-tag--buy' : 'journal-tag journal-tag--sell'
          }
        >
          {trade.side === 'buy' ? '매수' : '매도'}
        </span>
      </div>
      <div className="journal-rec__sub">
        {formatDateTime(trade.traded_at)} · {formatPrice(trade.price, trade.market)}
        {trade.quantity ? ` · ${trade.quantity}주` : ''}
      </div>

      <div className="journal-memo-label">메모</div>
      <textarea
        className="journal-memo-input"
        rows={2}
        value={memoDraft}
        onChange={(event) => onMemoChange(event.target.value)}
        placeholder="메모를 추가하면 복기 정확도가 올라가요…"
      />
      {memoChanged && (
        <button type="button" className="journal-memo-save" onClick={onMemoSave} disabled={saving}>
          {saving ? '저장 중...' : '메모 저장'}
        </button>
      )}

      {hasReview ? (
        <button type="button" className="journal-review-btn" onClick={onViewReview}>
          복기 보기
        </button>
      ) : (
        <button
          type="button"
          className="journal-review-btn"
          onClick={onRequestReview}
          disabled={requesting}
        >
          {requesting ? '복기 요청 중...' : '⚡ AI 복기 요청'}
        </button>
      )}
      {reviewError && <p className="journal-review-error">{reviewError}</p>}
    </div>
  )
}

function JournalPage() {
  const navigate = useNavigate()
  const { symbol: symbolParam } = useParams()
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const markersRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [trades, setTrades] = useState([])
  const [reviewedTradeIds, setReviewedTradeIds] = useState(() => new Set())
  const [exchangeBySymbol, setExchangeBySymbol] = useState({})
  const [selectedKey, setSelectedKey] = useState(null)
  // 트레이드가 없는 종목(대시보드 검색으로 진입)도 탭에 표시하기 위한 항목
  const [extraSymbol, setExtraSymbol] = useState(null)

  const [candles, setCandles] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState('')

  const [tradeColors, setTradeColors] = useState({ up: '#e0453f', down: '#2f6bd6' })

  const [memoDrafts, setMemoDrafts] = useState({})
  const [savingMemoId, setSavingMemoId] = useState(null)
  const [reviewRequestingId, setReviewRequestingId] = useState(null)
  const [reviewErrorByTrade, setReviewErrorByTrade] = useState({})

  // 매매 기록 + 복기 존재 여부 + (US만) symbols 거래소 조회
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabase) {
        setLoadError('Supabase 환경변수가 설정되지 않아 저널을 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError('')

      const { data: tradeRows, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .order('traded_at', { ascending: false })

      if (cancelled) return

      if (tradeError) {
        console.error('[JournalPage] trades 조회 실패:', tradeError)
        setLoadError('매매 기록을 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const tradeList = tradeRows ?? []
      setTrades(tradeList)

      const drafts = {}
      for (const trade of tradeList) drafts[trade.id] = trade.memo ?? ''
      setMemoDrafts(drafts)

      if (tradeList.length > 0) {
        const tradeIds = tradeList.map((trade) => trade.id)
        const { data: reviewRows, error: reviewError } = await supabase
          .from('reviews')
          .select('trade_id')
          .in('trade_id', tradeIds)
        if (!cancelled && !reviewError && reviewRows) {
          setReviewedTradeIds(new Set(reviewRows.map((row) => row.trade_id)))
        }

        const usTickers = [...new Set(
          tradeList.filter((trade) => trade.market === 'US').map((trade) => trade.ticker),
        )]
        if (usTickers.length > 0) {
          const { data: symbolRows, error: symbolError } = await supabase
            .from('symbols')
            .select('ticker, market, exchange')
            .eq('market', 'US')
            .in('ticker', usTickers)
          if (!cancelled && !symbolError && symbolRows) {
            const map = {}
            for (const row of symbolRows) map[symbolKey(row.ticker, row.market)] = row.exchange
            setExchangeBySymbol(map)
          }
        }
      }

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const symbolOptions = useMemo(() => {
    const map = new Map()
    for (const trade of trades) {
      const key = symbolKey(trade.ticker, trade.market)
      if (!map.has(key)) {
        map.set(key, { key, ticker: trade.ticker, market: trade.market })
      }
    }
    // 트레이드 없는 진입 종목(대시보드 검색)도 탭에 노출
    if (extraSymbol && !map.has(extraSymbol.key)) {
      map.set(extraSymbol.key, extraSymbol)
    }
    return [...map.values()]
  }, [trades, extraSymbol])

  // 선택 종목 결정: URL :symbol 우선(없으면 첫 기록). 트레이드 없는 종목은 symbols에서 해석.
  useEffect(() => {
    if (loading) return
    let cancelled = false

    async function pick() {
      if (symbolParam) {
        const paramTicker = symbolParam.toUpperCase()
        const fromTrades = symbolOptions.find((o) => o.ticker.toUpperCase() === paramTicker)
        if (fromTrades) {
          setSelectedKey(fromTrades.key)
          return
        }
        if (extraSymbol && extraSymbol.ticker.toUpperCase() === paramTicker) {
          setSelectedKey(extraSymbol.key)
          return
        }
        const resolved = await resolveSymbol(symbolParam)
        if (cancelled) return
        if (resolved) {
          const key = symbolKey(resolved.ticker, resolved.market)
          setExtraSymbol({ key, ticker: resolved.ticker, market: resolved.market, name: resolved.name })
          if (resolved.market === 'US' && resolved.exchange) {
            setExchangeBySymbol((prev) => ({ ...prev, [key]: resolved.exchange }))
          }
          setSelectedKey(key)
        }
        return
      }
      // 파라미터 없음 → 첫 기록 종목
      if (!selectedKey && symbolOptions.length > 0) {
        setSelectedKey(symbolOptions[0].key)
      }
    }

    pick()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolParam, loading, trades])

  const symbolTrades = useMemo(() => {
    if (!selectedKey) return []
    return trades.filter((trade) => symbolKey(trade.ticker, trade.market) === selectedKey)
  }, [trades, selectedKey])

  // 선택된 종목의 일봉 조회 (market-data Edge Function)
  useEffect(() => {
    if (!selectedKey || !supabase) return
    let cancelled = false

    async function loadCandles() {
      const [ticker, market] = selectedKey.split('|')
      const exchange = market === 'US' ? exchangeBySymbol[selectedKey] ?? null : null

      setChartLoading(true)
      setChartError('')
      try {
        const { data, error } = await supabase.functions.invoke('market-data', {
          body: { ticker, market, exchange },
        })
        if (cancelled) return
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        setCandles(data?.candles ?? [])
      } catch (err) {
        console.error('[JournalPage] market-data 호출 실패:', err)
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
  }, [selectedKey, exchangeBySymbol])

  // 차트 생성 (1회) — 색은 CSS 토큰에서 읽어 테마(다크/라이트)를 추종
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return

    const up = readToken('--up', '#e0453f')
    const down = readToken('--down', '#2f6bd6')
    const border = readToken('--border', '#e4e8ee')
    setTradeColors({ up, down })

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: readToken('--bg', '#ffffff') },
        textColor: readToken('--text', '#3c4257'),
      },
      grid: {
        vertLines: { color: border },
        horzLines: { color: border },
      },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true },
      crosshair: { mode: 1 },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    })

    chartRef.current = chart
    seriesRef.current = series
    markersRef.current = createSeriesMarkers(series, [])

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // 캔들 데이터 갱신
  useEffect(() => {
    seriesRef.current?.setData(candles)
  }, [candles])

  // 매매 마커 갱신 (research.md §10: v5 네이티브 createSeriesMarkers)
  useEffect(() => {
    if (!markersRef.current) return
    const markers = symbolTrades
      .map((trade) => ({
        time: tradedDateOnly(trade.traded_at),
        position: trade.side === 'buy' ? 'belowBar' : 'aboveBar',
        color: trade.side === 'buy' ? tradeColors.up : tradeColors.down,
        shape: trade.side === 'buy' ? 'arrowUp' : 'arrowDown',
        text: trade.side === 'buy' ? '매수' : '매도',
      }))
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
    markersRef.current.setMarkers(markers)
  }, [symbolTrades, tradeColors])

  async function handleMemoSave(tradeId) {
    if (!supabase) return
    const memo = memoDrafts[tradeId] ?? ''
    setSavingMemoId(tradeId)
    const { error } = await supabase.from('trades').update({ memo }).eq('id', tradeId)
    setSavingMemoId(null)
    if (error) {
      console.error('[JournalPage] 메모 저장 실패:', error)
      return
    }
    setTrades((prev) => prev.map((trade) => (trade.id === tradeId ? { ...trade, memo } : trade)))
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
      console.error('[JournalPage] AI 복기 요청 실패:', err)
      setReviewErrorByTrade((prev) => ({
        ...prev,
        [tradeId]: 'AI 복기 요청에 실패했습니다. (review-agent 함수가 아직 배포되지 않았을 수 있어요)',
      }))
    } finally {
      setReviewRequestingId(null)
    }
  }

  const selectedTicker = selectedKey ? selectedKey.split('|')[0] : ''

  return (
    <section className="journal-page">
      <h1>저널</h1>

      {loading && <p className="journal-status">불러오는 중...</p>}
      {!loading && loadError && <p className="journal-status journal-status--error">{loadError}</p>}

      {!loading && !loadError && symbolOptions.length === 0 && (
        <div className="journal-empty">
          <p>Discord 알림에서 매수/매도 버튼을 누르면 여기 기록됩니다.</p>
          <p className="journal-status">대시보드에서 종목을 검색하면 차트를 바로 볼 수 있어요.</p>
        </div>
      )}

      {!loading && !loadError && symbolOptions.length > 0 && (
        <>
          <div className="journal-tabs">
            {symbolOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={
                  option.key === selectedKey ? 'journal-tab journal-tab--active' : 'journal-tab'
                }
                onClick={() => setSelectedKey(option.key)}
              >
                {option.ticker} <span className="journal-tab__market">{option.market}</span>
              </button>
            ))}
          </div>

          <div className="journal-layout">
            <div className="journal-card journal-chart-card">
              <div className="journal-chart-head">
                <span className="journal-chart-head__name">{selectedTicker} · 일봉</span>
                {chartLoading && <span className="journal-chart-head__hint">불러오는 중...</span>}
              </div>
              {chartError && <p className="journal-status journal-status--error">{chartError}</p>}
              <div ref={chartContainerRef} className="journal-chart" />
              <div className="journal-legend">
                <span>
                  <i className="journal-dot" style={{ background: tradeColors.up }} />
                  상승 / 매수
                </span>
                <span>
                  <i className="journal-dot" style={{ background: tradeColors.down }} />
                  하락 / 매도
                </span>
              </div>
            </div>

            <div className="journal-card journal-record-card">
              <div className="journal-panel-title">
                <span>매매 기록</span>
                <span>{symbolTrades.length}건</span>
              </div>

              {symbolTrades.length === 0 && (
                <p className="journal-status">
                  이 종목은 아직 기록이 없어요. Discord 알림 버튼으로 기록하거나, 조건을 추가해보세요.
                </p>
              )}

              {symbolTrades.map((trade) => (
                <TradeRecordCard
                  key={trade.id}
                  trade={trade}
                  active={symbolKey(trade.ticker, trade.market) === selectedKey}
                  memoDraft={memoDrafts[trade.id] ?? ''}
                  onMemoChange={(value) =>
                    setMemoDrafts((prev) => ({ ...prev, [trade.id]: value }))
                  }
                  onMemoSave={() => handleMemoSave(trade.id)}
                  saving={savingMemoId === trade.id}
                  hasReview={reviewedTradeIds.has(trade.id)}
                  requesting={reviewRequestingId === trade.id}
                  reviewError={reviewErrorByTrade[trade.id]}
                  onRequestReview={() => handleRequestReview(trade.id)}
                  onViewReview={() => navigate(`/review/${trade.id}`)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default JournalPage
