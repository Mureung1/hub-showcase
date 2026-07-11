import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { SYMBOLS, searchSymbols, resolveSymbol, formatPrice } from '../mock/symbols.js'
import { getCandles } from '../mock/candles.js'
import { ENTRIES } from '../mock/entries.js'
import './DashboardPage.css'

const TYPE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

function quote(symbol) {
  const c = getCandles(symbol)
  const last = c[c.length - 1]
  const prev = c[c.length - 2] ?? last
  const changePct = ((last.close - prev.close) / prev.close) * 100
  return { price: last.close, changePct, up: last.close >= prev.close }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const matches = searchSymbols(query)

  const go = (symbol) => navigate(`/journal/${symbol}`)

  const submit = (e) => {
    e.preventDefault()
    const resolved = resolveSymbol(query)
    if (resolved) go(resolved)
  }

  const recent = [...ENTRIES].sort((a, b) =>
    a.entry_date < b.entry_date ? 1 : -1,
  )

  return (
    <div className="page dashboard">
      {/* 히어로 검색 */}
      <section className="dash-hero">
        <div className="crumb dash-eyebrow">대시보드</div>
        <h1>어떤 종목을 복기할까요?</h1>
        <p className="dash-sub">
          티커를 검색해 차트로 이동하고, 관심 종목과 최근 기록을 한 화면에서
          확인하세요.
        </p>

        <form className="card dash-search" onSubmit={submit}>
          <label className="dash-search-label" htmlFor="dash-q">
            종목 검색
          </label>
          <div className="dash-search-row">
            <div className="dash-input-wrap">
              <span className="dash-input-icon">🔍</span>
              <input
                id="dash-q"
                type="text"
                placeholder="삼성전자, NVDA, 005930…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {matches.length > 0 && (
                <ul className="dash-dropdown">
                  {matches.map((s) => {
                    const q = quote(s.symbol)
                    return (
                      <li key={s.symbol}>
                        <button
                          type="button"
                          className="dash-drop-item"
                          onClick={() => go(s.symbol)}
                        >
                          <span className="ddi-name">
                            {s.name}{' '}
                            <span className="mono ddi-ticker">{s.symbol}</span>
                          </span>
                          <span className="mono ddi-price">
                            {formatPrice(s.symbol, q.price)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <button
              type="submit"
              className="btn accent dash-go"
              disabled={!resolveSymbol(query)}
            >
              → 이동
            </button>
          </div>
        </form>
      </section>

      {/* 관심 종목 + 최근 기록 */}
      <section className="dash-grid">
        <div className="dash-col">
          <div className="dash-col-head">
            <h2>⭐ 관심 종목</h2>
          </div>
          <div className="watchlist">
            {SYMBOLS.map((s) => {
              const q = quote(s.symbol)
              return (
                <button
                  key={s.symbol}
                  className="card watch-card"
                  onClick={() => go(s.symbol)}
                >
                  <div className="watch-top">
                    <span className="watch-name">{s.name}</span>
                    <span className="mono watch-ticker">{s.symbol}</span>
                  </div>
                  <div className="watch-bottom">
                    <span className="mono watch-price">
                      {formatPrice(s.symbol, q.price)}
                    </span>
                    <span className={`mono watch-chg ${q.up ? 'up' : 'down'}`}>
                      {q.up ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                    </span>
                  </div>
                </button>
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
            {recent.map((e) => (
              <Link key={e.id} to={`/review/${e.id}`} className="card recent-card">
                <div className="recent-main">
                  <span className={`badge ${e.entry_type}`}>
                    {TYPE_LABEL[e.entry_type]}
                  </span>
                  <span className="recent-name">{e.symbolName}</span>
                  <span className="mono recent-sub">
                    {e.entry_date} · {formatPrice(e.symbol, e.price)}
                  </span>
                </div>
                <span
                  className={`status ${e.review_id ? 'done' : 'pending'}`}
                >
                  {e.review_id ? '복기 완료' : '복기 전'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
