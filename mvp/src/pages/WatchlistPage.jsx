import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { fetchQuote, formatPrice, symbolKey } from '../lib/quotes.js'
import Icon from '../components/Icon.jsx'
// === MOCK (제거: 이 import + 아래 display* 블록 삭제, 또는 USE_MOCK_DASHBOARD=false) ===
import { USE_MOCK_DASHBOARD, MOCK_WATCHLIST, MOCK_QUOTES } from '../lib/mockDashboard.js'
// === /MOCK ===
import './WatchlistPage.css'

/**
 * 관심종목 전용 탭. `watchlists` 테이블을 조회해 시세 카드로 보여준다.
 * StockPage의 ⭐버튼·대시보드 관심종목과 같은 테이블을 공유해 연동된다.
 */
export default function WatchlistPage() {
  const navigate = useNavigate()

  const [watchlist, setWatchlist] = useState([])
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)

  const goSymbol = (ticker) => navigate(`/stock/${ticker}`)

  const loadData = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
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
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function removeWatch(w) {
    if (!supabase) return
    await supabase.from('watchlists').delete().eq('symbol', w.symbol).eq('market', w.market)
    setWatchlist((prev) => prev.filter((x) => !(x.symbol === w.symbol && x.market === w.market)))
  }

  const hasSupabase = Boolean(supabase)

  // === MOCK (제거: 이 블록 + mockDashboard import 삭제) ===
  const displayWatchlist =
    USE_MOCK_DASHBOARD && watchlist.length === 0 ? MOCK_WATCHLIST : watchlist
  const displayQuotes =
    USE_MOCK_DASHBOARD && Object.keys(quotes).length === 0 ? MOCK_QUOTES : quotes
  // === /MOCK ===

  return (
    <section className="watchlist-page">
      <div className="watchlist-head">
        <h1>
          <Icon name="star" size={22} className="watchlist-head__icon" /> 관심 종목
        </h1>
        <p className="watchlist-sub">
          종목 페이지의 ⭐로 추가한 종목을 모아 봅니다. 클릭하면 차트로 이동해요.
        </p>
      </div>

      {loading && displayWatchlist.length === 0 && (
        <p className="watchlist-status">불러오는 중...</p>
      )}

      {!loading && !hasSupabase && displayWatchlist.length === 0 && (
        <p className="watchlist-status">Supabase 미연결 상태입니다.</p>
      )}

      {!loading && hasSupabase && displayWatchlist.length === 0 && (
        <div className="watchlist-empty">
          <p>아직 관심 종목이 없어요.</p>
          <p className="watchlist-status">
            대시보드에서 종목을 검색해 종목 페이지에서 ⭐로 추가하세요.
          </p>
        </div>
      )}

      {displayWatchlist.length > 0 && (
        <div className="watchlist-grid">
          {displayWatchlist.map((w) => {
            const q = displayQuotes[symbolKey(w.symbol, w.market)]
            return (
              <div key={symbolKey(w.symbol, w.market)} className="card watchlist-card">
                <button className="watchlist-card__main" onClick={() => goSymbol(w.symbol)}>
                  <div className="watchlist-card__top">
                    <span className="watchlist-card__name">{w.name ?? w.symbol}</span>
                    <span className="mono watchlist-card__ticker">
                      {w.symbol}
                      <span className="watchlist-card__market"> · {w.market}</span>
                    </span>
                  </div>
                  <div className="watchlist-card__bottom">
                    <span className="mono watchlist-card__price">
                      {q ? formatPrice(q.price, w.market) : '—'}
                    </span>
                    {q && (
                      <span className={`watchlist-chg ${q.up ? 'up' : 'down'}`}>
                        {q.up ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  className="watchlist-card__remove"
                  onClick={() => removeWatch(w)}
                  aria-label="관심 종목 삭제"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
