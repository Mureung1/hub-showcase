import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import './ConditionsPage.css'

const OPERATOR_LABEL = { '>=': '이상', '<=': '이하', '>': '초과', '<': '미만' }
const SMA_OPERATOR_LABEL = { '>=': '상향 돌파', '<=': '하향 이탈' }
const STATUS_LABEL = { active: '감시 중', done: '완료', disabled: '대기' }

function formatNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}

function describeCondition(condition) {
  if (condition.type === 'price') {
    const opText = OPERATOR_LABEL[condition.operator] ?? condition.operator
    return `현재가 ${formatNumber(condition.target)} ${opText}`
  }
  if (condition.type === 'sma_cross') {
    const opText = SMA_OPERATOR_LABEL[condition.operator] ?? condition.operator
    return `SMA${condition.sma_window ?? '?'} ${opText}`
  }
  return '조건을 확인할 수 없습니다.'
}

/**
 * 감시 조건 조회 전용 화면: 종목별 그룹 + 상태 뱃지 + 삭제.
 * 조건 추가는 각 종목 페이지(/stock/:ticker)에서 한다 — 여기서는 만들지 않는다.
 */
function ConditionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conditions, setConditions] = useState([])
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabase) {
        setError('Supabase 환경변수가 설정되지 않아 조건을 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('conditions')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        console.error('[ConditionsPage] conditions 조회 실패:', fetchError)
        setError('조건 목록을 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      setConditions(data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleDelete(conditionId) {
    if (!supabase) return
    if (!window.confirm('이 조건을 삭제할까요?')) return

    setDeletingId(conditionId)
    const { error: deleteError } = await supabase
      .from('conditions')
      .delete()
      .eq('id', conditionId)
    setDeletingId(null)

    if (deleteError) {
      console.error('[ConditionsPage] 조건 삭제 실패:', deleteError)
      return
    }
    setConditions((prev) => prev.filter((condition) => condition.id !== conditionId))
  }

  const groups = useMemo(() => {
    const map = new Map()
    for (const condition of conditions) {
      const key = `${condition.ticker}|${condition.market}`
      if (!map.has(key)) {
        map.set(key, { key, ticker: condition.ticker, market: condition.market, items: [] })
      }
      map.get(key).items.push(condition)
    }
    return [...map.values()]
  }, [conditions])

  return (
    <section className="conditions-page">
      <h1>조건 관리</h1>

      {loading && <p className="conditions-status">불러오는 중...</p>}
      {!loading && error && <p className="conditions-status conditions-status--error">{error}</p>}

      {!loading && !error && conditions.length === 0 && (
        <div className="conditions-empty">
          <p>
            아직 설정된 조건이 없어요. 대시보드에서 종목을 검색해 종목 페이지에서 조건을
            추가하거나, Discord에서 <code>/알림</code>으로 만들어보세요.
          </p>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="conditions-groups">
          {groups.map((group) => (
            <div key={group.key} className="conditions-group">
              <div className="conditions-group__head">
                <span className="conditions-group__name">
                  {group.ticker} <span className="conditions-row__ticker">{group.market}</span>
                  <span className="conditions-group__count"> · {group.items.length}건</span>
                </span>
                <Link to={`/stock/${group.ticker}`} className="conditions-group__link">
                  종목 보기 →
                </Link>
              </div>
              <ul className="conditions-list">
                {group.items.map((condition) => (
                  <li key={condition.id} className="conditions-row">
                    <div className="conditions-row__main">
                      <div className="conditions-row__desc">{describeCondition(condition)}</div>
                    </div>
                    <span className={`conditions-badge conditions-badge--${condition.status}`}>
                      {STATUS_LABEL[condition.status] ?? condition.status}
                    </span>
                    <button
                      type="button"
                      className="conditions-delete"
                      onClick={() => handleDelete(condition.id)}
                      disabled={deletingId === condition.id}
                    >
                      {deletingId === condition.id ? '삭제 중...' : '삭제'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default ConditionsPage
