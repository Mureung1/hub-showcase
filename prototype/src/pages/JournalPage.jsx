import { useParams, useNavigate, Link } from 'react-router-dom'
import TradeChart from '../components/TradeChart.jsx'
import { getCandles } from '../mock/candles.js'
import { getEntriesBySymbol, ENTRIES } from '../mock/entries.js'
import './JournalPage.css'

const SYMBOLS = [
  { symbol: '005930', name: '삼성전자' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
]

const TYPE_LABEL = { buy: '매수', sell: '매도', hold: '관망' }

function fmtPrice(symbol, price) {
  return symbol === '005930'
    ? `${price.toLocaleString()}원`
    : `$${price.toLocaleString()}`
}

export default function JournalPage() {
  const { symbol = '005930' } = useParams()
  const navigate = useNavigate()
  const candles = getCandles(symbol)
  const entries = getEntriesBySymbol(symbol)
  const meta = SYMBOLS.find((s) => s.symbol === symbol) ?? SYMBOLS[0]
  const last = candles[candles.length - 1]
  const prev = candles[candles.length - 2] ?? last
  const change = (((last.close - prev.close) / prev.close) * 100).toFixed(2)
  const up = last.close >= prev.close

  return (
    <div className="page journal">
      <div className="topbar">
        <span className="brand">🔦 Beacon</span>
        <span className="crumb">· 저널</span>
      </div>
      <div className="journal-head">
        <h1>저널</h1>
        <div className="symbol-switch">
          {SYMBOLS.map((s) => (
            <Link
              key={s.symbol}
              to={`/journal/${s.symbol}`}
              className={`sym-tab${s.symbol === symbol ? ' active' : ''}`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="journal-grid">
        <section className="card chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-name">
                {meta.name}{' '}
                <span className="mono chart-ticker">{symbol}</span>
              </div>
              <div className="chart-price mono">
                {fmtPrice(symbol, last.close)}{' '}
                <span className={up ? 'up' : 'down'}>
                  {up ? '▲' : '▼'} {Math.abs(change)}%
                </span>
              </div>
            </div>
            <div className="chart-legend caption">
              <span className="lg up">▲ 매수</span>
              <span className="lg down">▼ 매도</span>
              <span className="lg hold">⏸ 관망</span>
            </div>
          </div>
          <TradeChart candles={candles} entries={entries} height={380} />
        </section>

        <aside className="records">
          <div className="records-head">
            <h2>매매 기록</h2>
            <span className="caption">{entries.length}건</span>
          </div>
          {entries.map((e) => (
            <div key={e.id} className="card rec-card">
              <div className="rec-top">
                <span className={`badge ${e.entry_type}`}>
                  {TYPE_LABEL[e.entry_type]}
                </span>
                <span className="rec-date mono caption">{e.entry_date}</span>
              </div>
              <div className="rec-sub mono">
                {fmtPrice(symbol, e.price)}
                {e.amount ? ` · ${e.amount}주` : ''}
              </div>
              <div className={`rec-memo${e.memo ? '' : ' empty'}`}>
                {e.memo || '메모를 남겨 복기 근거를 보완하세요.'}
              </div>
              {e.review_id ? (
                <button
                  className="btn accent block rec-btn"
                  onClick={() => navigate(`/review/${e.id}`)}
                >
                  복기 결과 보기 →
                </button>
              ) : (
                <button
                  className="btn block rec-btn"
                  onClick={() => navigate(`/review/${e.id}`)}
                >
                  ⚡ AI 복기 요청
                </button>
              )}
            </div>
          ))}
          <p className="caption records-foot">
            전체 기록 {ENTRIES.length}건 · Discord 알림 버튼으로 원클릭 기록됩니다.
          </p>
        </aside>
      </div>
    </div>
  )
}
