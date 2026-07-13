import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { searchSymbols } from '../lib/symbols.js'

const PRICE_OPERATORS = [
  { value: '>=', label: '이상' },
  { value: '<=', label: '이하' },
  { value: '>', label: '초과' },
  { value: '<', label: '미만' },
]
const SMA_OPERATORS = [
  { value: '>=', label: '상향 돌파' },
  { value: '<=', label: '하향 이탈' },
]
const SMA_WINDOWS = [20, 60, 240, 480]

function preview({ symbol, type, operator, target, smaWindow }) {
  if (!symbol) return '종목을 선택하면 미리보기가 표시됩니다.'
  if (type === 'price') {
    const op = PRICE_OPERATORS.find((o) => o.value === operator)?.label ?? operator
    return `${symbol.name} 현재가 ${target ? Number(target).toLocaleString('ko-KR') : '?'} ${op}면 알림`
  }
  const op = SMA_OPERATORS.find((o) => o.value === operator)?.label ?? operator
  return `${symbol.name} ${smaWindow}일선 ${op} 시 알림`
}

/**
 * 웹 구조화 조건 추가 폼: 종목 검색 → 조건 타입/연산자/값 → conditions insert(status active).
 * 자연어 파싱(Gemini)은 Discord 전용이라 웹은 구조화 입력을 쓴다.
 */
export default function ConditionForm({ onCreated }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [symbol, setSymbol] = useState(null) // {ticker, market, exchange, name}

  const [type, setType] = useState('price')
  const [operator, setOperator] = useState('>=')
  const [target, setTarget] = useState('')
  const [smaWindow, setSmaWindow] = useState(20)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const debounceRef = useRef(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || symbol) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setResults(await searchSymbols(query))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query, symbol])

  const operators = type === 'price' ? PRICE_OPERATORS : SMA_OPERATORS

  function selectSymbol(s) {
    setSymbol(s)
    setQuery(`${s.name} (${s.ticker})`)
    setResults([])
  }

  function clearSymbol() {
    setSymbol(null)
    setQuery('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!supabase) {
      setError('Supabase 미연결 상태입니다.')
      return
    }
    if (!symbol) {
      setError('종목을 선택하세요.')
      return
    }
    if (type === 'price' && !target) {
      setError('목표 가격을 입력하세요.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      setError('로그인이 필요합니다.')
      return
    }

    setSubmitting(true)
    const row = {
      user_id: userId,
      name: symbol.name,
      ticker: symbol.ticker,
      market: symbol.market,
      exchange: symbol.exchange ?? null,
      type,
      operator: type === 'sma_cross' && !['>=', '<='].includes(operator) ? '>=' : operator,
      target: type === 'price' ? Number(target) : null,
      sma_window: type === 'sma_cross' ? smaWindow : null,
      status: 'active',
    }
    const { data, error: insertError } = await supabase
      .from('conditions')
      .insert(row)
      .select()
      .single()
    setSubmitting(false)

    if (insertError) {
      console.error('[ConditionForm] 조건 저장 실패:', insertError)
      setError('조건을 저장하지 못했습니다.')
      return
    }

    onCreated?.(data)
    // 폼 리셋
    clearSymbol()
    setType('price')
    setOperator('>=')
    setTarget('')
    setSmaWindow(20)
  }

  // 타입 변경 시 sma 연산자 정합
  useEffect(() => {
    if (type === 'sma_cross' && !['>=', '<='].includes(operator)) setOperator('>=')
  }, [type, operator])

  return (
    <form className="card cf" onSubmit={handleSubmit}>
      <div className="cf__title">조건 추가</div>

      <div className="cf__field cf__symbol">
        <label>종목</label>
        <div className="cf__symbol-wrap">
          <input
            type="text"
            placeholder="삼성전자, NVDA, 005930…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (symbol) setSymbol(null)
            }}
            autoComplete="off"
          />
          {symbol && (
            <button type="button" className="cf__clear" onClick={clearSymbol} aria-label="종목 지우기">
              ✕
            </button>
          )}
          {results.length > 0 && (
            <ul className="cf__dropdown">
              {results.map((s) => (
                <li key={`${s.ticker}|${s.market}`}>
                  <button type="button" className="cf__drop-item" onMouseDown={() => selectSymbol(s)}>
                    <span>
                      {s.name} <span className="mono cf__drop-ticker">{s.ticker}</span>
                    </span>
                    <span className="cf__drop-market">
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

      <div className="cf__row">
        <div className="cf__field">
          <label>조건 종류</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="price">가격</option>
            <option value="sma_cross">이동평균</option>
          </select>
        </div>

        <div className="cf__field">
          <label>{type === 'price' ? '연산자' : '방향'}</label>
          <select value={operator} onChange={(e) => setOperator(e.target.value)}>
            {operators.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {type === 'price' ? (
          <div className="cf__field">
            <label>목표 가격</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="80000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        ) : (
          <div className="cf__field">
            <label>이동평균선</label>
            <select value={smaWindow} onChange={(e) => setSmaWindow(Number(e.target.value))}>
              {SMA_WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w}일선
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="cf__preview mono">{preview({ symbol, type, operator, target, smaWindow })}</div>
      {error && <p className="cf__error">{error}</p>}

      <button type="submit" className="btn accent" disabled={submitting || !symbol}>
        {submitting ? '저장 중...' : '조건 추가'}
      </button>
    </form>
  )
}
