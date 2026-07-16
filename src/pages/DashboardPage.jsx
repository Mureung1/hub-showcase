import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { searchSymbols } from '../lib/symbols.js'
import { fetchQuote, formatPrice, symbolKey } from '../lib/quotes.js'
import Icon from '../components/Icon.jsx'
import './DashboardPage.css'

const SIDE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

export default function DashboardPage() {
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDrop, setShowDrop] = useState(false)

  const [watchlist, setWatchlist] = useState([])
  const [quotes, setQuotes] = useState({}) // key -> {price, changePct, up}
  const [recent, setRecent] = useState([])
  const [reviewedIds, setReviewedIds] = useState(() => new Set())
  const [refreshing, setRefreshing] = useState(false)

  // 스크롤 리빌: 히어로를 지나면 아래 그리드가 드러난다.
  const [scrolled, setScrolled] = useState(false)

  const goSymbol = (ticker) => navigate(`/stock/${ticker}`)

  // 검색 제출: 첫 결과로 이동 (결과 없으면 무시)
  const submitSearch = () => {
    const first = results[0]
    if (first) goSymbol(first.ticker)
  }

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

  // 스크롤 위치 추적 (120px 넘으면 리빌)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 관심종목 + 최근기록 로드 (새로고침 버튼도 재사용)
  const loadData = useCallback(async () => {
    if (!supabase) return
    setRefreshing(true)
    try {
      const { data: wl } = await supabase
        .from('watchlists')
        .select('symbol, market, exchange, name')
        .order('created_at', { ascending: false })
      if (wl) {
        setWatchlist(wl)
        const qs = await Promise.all(wl.map((w) => fetchQuote(w)))
        const map = {}
        wl.forEach((w, i) => {
          if (qs[i]) map[symbolKey(w.symbol, w.market)] = qs[i]
        })
        setQuotes(map)
      }

      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .order('traded_at', { ascending: false })
        .limit(6)
      if (trades) {
        setRecent(trades)
        const ids = trades.map((t) => t.id)
        if (ids.length) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('trade_id')
            .in('trade_id', ids)
          if (reviews) setReviewedIds(new Set(reviews.map((r) => r.trade_id)))
        }
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function removeWatch(symbol) {
    if (!supabase) return
    await supabase.from('watchlists').delete().eq('symbol', symbol)
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol))
  }

  const hasSupabase = Boolean(supabase)

  const krWatchlist = watchlist.filter((w) => w.market === 'KR')
  const usWatchlist = watchlist.filter((w) => w.market === 'US')

  function renderWatchCard(w) {
    const q = quotes[symbolKey(w.symbol, w.market)]
    return (
      <div key={w.symbol} className="watch-card">
        <button className="watch-main" onClick={() => goSymbol(w.symbol)}>
          <div className="watch-top">
            <span className="watch-name">{w.name ?? w.symbol}</span>
            <span className="mono watch-ticker">{w.symbol}</span>
          </div>
          <div className="watch-bottom">
            <span className="mono watch-price">{q ? formatPrice(q.price, w.market) : '—'}</span>
            {q && (
              <span className={`watch-chg ${q.up ? 'up' : 'down'}`}>
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
          <Icon name="trash" size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className={`dashboard${scrolled ? ' is-scrolled' : ''}`}>
      <section className="dash-hero">
        <div className="crumb">대시보드</div>
        <h1>어떤 종목을 살펴볼까요?</h1>
        <p className="dash-sub">
          티커를 검색해 차트로 이동하고, 관심 종목과 최근 기록을 한 화면에서 확인하세요.
        </p>

        <div className="card dash-search">
          <div className="dash-search-row">
            <div className="dash-input-wrap">
              <span className="dash-input-icon">
                <Icon name="search" size={16} />
              </span>
              <input
                type="text"
                placeholder="삼성전자, NVDA, 005930…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowDrop(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitSearch()
                  }
                }}
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
            <button
              type="button"
              className="btn accent dash-go"
              onClick={submitSearch}
              disabled={results.length === 0}
            >
              이동 <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>

        <div className="dash-scroll-hint" aria-hidden="true">
          아래로 스크롤 · 관심 종목과 최근 기록
        </div>
      </section>

      <section className="dash-grid">
        <div className="card dash-col">
          <div className="dash-col-head">
            <h2>
              <Icon name="star" size={18} className="dash-col-icon" /> 관심 종목
            </h2>
            {hasSupabase && (
              <button
                type="button"
                className="dash-refresh"
                onClick={loadData}
                disabled={refreshing}
              >
                <Icon name="refresh" size={14} className={refreshing ? 'is-spinning' : ''} />
                새로고침
              </button>
            )}
          </div>
          {!hasSupabase && watchlist.length === 0 && (
            <p className="dash-empty">Supabase 미연결 상태입니다.</p>
          )}
          {hasSupabase && watchlist.length === 0 && (
            <p className="dash-empty">
              아직 관심 종목이 없어요. 종목을 검색해 종목 페이지에서 ⭐로 추가하세요.
            </p>
          )}
          {krWatchlist.length > 0 && (
            <div className="watch-section">
              <div className="watch-subhead">국내</div>
              <div className="watch-grid">{krWatchlist.map(renderWatchCard)}</div>
            </div>
          )}
          {usWatchlist.length > 0 && (
            <div className="watch-section">
              <div className="watch-subhead">해외</div>
              <div className="watch-grid">{usWatchlist.map(renderWatchCard)}</div>
            </div>
          )}
        </div>

        <div className="card dash-col">
          <div className="dash-col-head">
            <h2>
              <Icon name="history" size={18} className="dash-col-icon" /> 최근 기록
            </h2>
            <Link to="/history" className="dash-link">
              전체 보기
            </Link>
          </div>
          <div className="recent">
            {recent.length === 0 && (
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
                <Link key={t.id} to={`/review/${t.id}`} className="recent-card">
                  {body}
                </Link>
              ) : (
                <button
                  key={t.id}
                  className="recent-card"
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
