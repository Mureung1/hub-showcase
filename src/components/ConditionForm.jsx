import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { searchSymbols } from '../lib/symbols.js'
import './ConditionForm.css'

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
const STATUS_OPTIONS = [
  { value: 'active', label: '감시 중' },
  { value: 'disabled', label: '대기' },
]

function preview({ symbol, type, operator, target, smaWindow }) {
  if (!symbol) return '종목을 선택하면 미리보기가 표시됩니다.'
  if (type === 'price') {
    const op = PRICE_OPERATORS.find((o) => o.value === operator)?.label ?? operator
    return `${symbol.name} 현재가 ${target ? Number(target).toLocaleString('ko-KR') : '?'} ${op}면 알림`
  }
  const op = SMA_OPERATORS.find((o) => o.value === operator)?.label ?? operator
  return `${symbol.name} ${smaWindow}일선 ${op} 시 알림`
}

/** editCondition row → 종목 표시용 객체로 변환 (name/ticker/market/exchange 컬럼 보유) */
function symbolFromCondition(condition) {
  if (!condition) return null
  return {
    ticker: condition.ticker,
    market: condition.market,
    exchange: condition.exchange ?? null,
    name: condition.name,
  }
}

/**
 * 웹 구조화 조건 폼: 종목 검색 → 조건 타입/연산자/값 → conditions insert(status active).
 * 자연어 파싱(Gemini)은 Discord 전용이라 웹은 구조화 입력을 쓴다.
 *
 * 생성 모드(기본)와 수정 모드(`editCondition` 지정) 둘 다 이 컴포넌트가 담당한다
 * (ConditionDetailPage `/condition/:id`에서 수정 모드로 재사용, WP-D).
 *
 * @param {object} [fixedSymbol] 지정 시 종목검색 UI를 생략하고 이 종목으로 고정한다
 *   (StockPage에서 이미 확정된 종목의 조건을 추가할 때 사용).
 * @param {(condition: object) => void} [onCreated] 생성 성공 시 호출(insert된 row).
 * @param {object} [editCondition] 지정 시 수정 모드로 동작: 종목 고정 표시 + operator/target/
 *   sma_window/type 프리필 + 상태(active/disabled) 선택 필드 추가. 제출 시 insert 대신
 *   update를 수행하고 `onCreated` 대신 `onUpdated`를 호출한다. 삭제 버튼도 노출되어
 *   `onDeleted` 콜백으로 삭제 후처리(예: 목록으로 이동)를 호출부에 위임한다.
 * @param {(condition: object) => void} [onUpdated] 수정 저장 성공 시 호출(갱신된 row).
 * @param {() => void} [onDeleted] 삭제 성공 시 호출.
 */
export default function ConditionForm({ onCreated, fixedSymbol, editCondition, onUpdated, onDeleted }) {
  const isEdit = Boolean(editCondition)
  const lockedSymbol = fixedSymbol ?? symbolFromCondition(editCondition)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [symbol, setSymbol] = useState(lockedSymbol ?? null) // {ticker, market, exchange, name}

  const [type, setType] = useState(editCondition?.type ?? 'price')
  const [operator, setOperator] = useState(editCondition?.operator ?? '>=')
  const [target, setTarget] = useState(editCondition?.target != null ? String(editCondition.target) : '')
  const [smaWindow, setSmaWindow] = useState(editCondition?.sma_window ?? 20)
  const [status, setStatus] = useState(editCondition?.status ?? 'active')

  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

    const normalizedOperator = type === 'sma_cross' && !['>=', '<='].includes(operator) ? '>=' : operator

    if (isEdit) {
      setSubmitting(true)
      const { data, error: updateError } = await supabase
        .from('conditions')
        .update({
          type,
          operator: normalizedOperator,
          target: type === 'price' ? Number(target) : null,
          sma_window: type === 'sma_cross' ? smaWindow : null,
          status,
        })
        .eq('id', editCondition.id)
        .select()
        .single()
      setSubmitting(false)

      if (updateError) {
        console.error('[ConditionForm] 조건 수정 실패:', updateError)
        setError('조건을 저장하지 못했습니다.')
        return
      }
      onUpdated?.(data)
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
      operator: normalizedOperator,
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
    // 폼 리셋 (fixedSymbol이면 종목은 유지)
    if (!fixedSymbol) clearSymbol()
    setType('price')
    setOperator('>=')
    setTarget('')
    setSmaWindow(20)
  }

  async function handleDelete() {
    if (!supabase || !editCondition) return
    if (!window.confirm('이 조건을 삭제할까요?')) return
    setError('')
    setDeleting(true)
    const { error: deleteError } = await supabase.from('conditions').delete().eq('id', editCondition.id)
    setDeleting(false)
    if (deleteError) {
      console.error('[ConditionForm] 조건 삭제 실패:', deleteError)
      setError('조건을 삭제하지 못했습니다.')
      return
    }
    onDeleted?.()
  }

  // 타입 변경 시 sma 연산자 정합
  useEffect(() => {
    if (type === 'sma_cross' && !['>=', '<='].includes(operator)) setOperator('>=')
  }, [type, operator])

  return (
    <form className="card cf" onSubmit={handleSubmit}>
      <div className="cf__title">{isEdit ? '조건 수정' : '조건 추가'}</div>

      {lockedSymbol ? (
        <div className="cf__field cf__symbol">
          <label>종목</label>
          <div className="cf__fixed-symbol mono">
            {lockedSymbol.name} <span className="cf__drop-ticker">{lockedSymbol.ticker}</span>
          </div>
        </div>
      ) : (
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
      )}

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

        {isEdit && (
          <div className="cf__field">
            <label>상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="cf__preview mono">{preview({ symbol, type, operator, target, smaWindow })}</div>
      {error && <p className="cf__error">{error}</p>}

      <div className="cf__actions">
        <button type="submit" className="btn accent" disabled={submitting || !symbol}>
          {submitting ? '저장 중...' : isEdit ? '변경사항 저장' : '조건 추가'}
        </button>
        {isEdit && (
          <button type="button" className="cf__delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        )}
      </div>
    </form>
  )
}
