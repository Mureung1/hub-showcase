import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { searchSymbols } from '../lib/symbols.js'
import './DashboardPage.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

function formatPrice(price, market) {
  const value = Number(price)
  if (!Number.isFinite(value)) return '-'
  return market === 'US'
    ? `$${value.toLocaleString('en-US')}`
    : `${value.toLocaleString('ko-KR')}원`
}

function symbolKey(ticker, market) {
  return `${ticker}|${market}`
}

/** market-data 캔들에서 최신가·등락률 계산 */
async function fetchQuote(item) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { ticker: item.symbol, market: item.market, exchange: item.exchange ?? null },
    })
    if (error || data?.error) return null
    const candles = data?.candles ?? []
    if (candles.length === 0) return null
    const last = candles[candles.length - 1]
    const prev = candles[candles.length - 2] ?? last
    const changePct = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0
    return { price: last.close, changePct, up: last.close >= prev.close }
  } catch {
    return null
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDrop, setShowDrop] = useState(false)

  const [watchlist, setWatchlist] = useState([])
  const [quotes, setQuotes] = useState({}) // key -> {price, changePct, up}
  const [recent, setRecent] = useState([])
  const [reviewedIds, setReviewedIds] = useState(() => new Set())

  const goSymbol = (ticker) => navigate(`/journal/${ticker}`)

  // 디바운스 종목 검색
  const debounceRef = useRef(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setResults(await searchSymbols(query))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // 관심종목 + 최근기록 로드
  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function load() {
      const { data: wl } = await supabase
        .from('watchlists')
        .select('symbol, market, exchange, name')
        .order('created_at', { ascending: false })
      if (!cancelled && wl) {
        setWatchlist(wl)
        // 시세는 병렬 조회 후 채움
        Promise.all(wl.map((w) => fetchQuote(w))).then((qs) => {
          if (cancelled) return
          const map = {}
          wl.forEach((w, i) => {
            if (qs[i]) map[symbolKey(w.symbol, w.market)] = qs[i]
          })
          setQuotes(map)
        })
      }

      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .order('traded_at', { ascending: false })
        .limit(6)
      if (!cancelled && trades) {
        setRecent(trades)
        const ids = trades.map((t) => t.id)
        if (ids.length) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('trade_id')
            .in('trade_id', ids)
          if (!cancelled && reviews) {
            setReviewedIds(new Set(reviews.map((r) => r.trade_id)))
          }
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function removeWatch(symbol) {
    if (!supabase) return
    await supabase.from('watchlists').delete().eq('symbol', symbol)
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol))
  }

  const hasSupabase = Boolean(supabase)

  return (
    <div className="dashboard">
      <section className="dash-hero">
        <div className="crumb">대시보드</div>
        <h1>어떤 종목을 지켜볼까요?</h1>
        <p className="dash-sub">
          종목을 검색해 차트로 이동하고, 관심 종목과 최근 기록을 한 화면에서 확인하세요.
        </p>

        <div className="card dash-search">
          <div className="dash-input-wrap">
            <span className="dash-input-icon">🔍</span>
            <input
              type="text"
              placeholder="삼성전자, NVDA, 005930…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowDrop(true)}
              autoComplete="off"
            />
            {showDrop && results.length > 0 && (
              <ul className="dash-dropdown">
                {results.map((s) => (
                  <li key={symbolKey(s.ticker, s.market)}>
                    <button
                      type="button"
                      className="dash-drop-item"
                      onMouseDown={() => goSymbol(s.ticker)}
                    >
                      <span className="ddi-name">
                        {s.name} <span className="mono ddi-ticker">{s.ticker}</span>
                      </span>
                      <span className="mono ddi-market">
                        {s.market}
                        {s.exchange ? ` · ${s.exchange}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="dash-grid">
        <div className="dash-col">
          <div className="dash-col-head">
            <h2>⭐ 관심 종목</h2>
          </div>
          <div className="watchlist">
            {!hasSupabase && <p className="dash-empty">Supabase 미연결 상태입니다.</p>}
            {hasSupabase && watchlist.length === 0 && (
              <p className="dash-empty">
                아직 관심 종목이 없어요. 종목을 검색해 저널에서 ⭐로 추가하세요.
              </p>
            )}
            {watchlist.map((w) => {
              const q = quotes[symbolKey(w.symbol, w.market)]
              return (
                <div key={w.symbol} className="card watch-card">
                  <button className="watch-main" onClick={() => goSymbol(w.symbol)}>
                    <div className="watch-top">
                      <span className="watch-name">{w.name ?? w.symbol}</span>
                      <span className="mono watch-ticker">{w.symbol}</span>
                    </div>
                    <div className="watch-bottom">
                      <span className="mono watch-price">
                        {q ? formatPrice(q.price, w.market) : '—'}
                      </span>
                      {q && (
                        <span className={`mono watch-chg ${q.up ? 'up' : 'down'}`}>
                          {q.up ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="watch-remove"
                    onClick={() => removeWatch(w.symbol)}
                    aria-label="관심 종목 삭제"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="dash-col">
          <div className="dash-col-head">
            <h2>🕑 최근 기록</h2>
            <Link to="/history" className="dash-link">
              전체 보기
            </Link>
          </div>
          <div className="recent">
            {hasSupabase && recent.length === 0 && (
              <p className="dash-empty">아직 매매 기록이 없어요.</p>
            )}
            {recent.map((t) => {
              const reviewed = reviewedIds.has(t.id)
              const body = (
                <>
                  <div className="recent-main">
                    <span className={`badge ${t.side}`}>{SIDE_LABEL[t.side] ?? t.side}</span>
                    <span className="recent-name">{t.ticker}</span>
                    <span className="mono recent-sub">{formatPrice(t.price, t.market)}</span>
                  </div>
                  <span className={`status ${reviewed ? 'done' : 'pending'}`}>
                    {reviewed ? '복기 완료' : '복기 전'}
                  </span>
                </>
              )
              return reviewed ? (
                <Link key={t.id} to={`/review/${t.id}`} className="card recent-card">
                  {body}
                </Link>
              ) : (
                <button
                  key={t.id}
                  className="card recent-card"
                  onClick={() => goSymbol(t.ticker)}
                >
                  {body}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
