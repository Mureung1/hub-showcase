import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import ConditionForm from '../components/ConditionForm.jsx'
import './ConditionDetailPage.css'

const OPERATOR_LABEL = { '>=': '이상', '<=': '이하', '>': '초과', '<': '미만' }
const SMA_OPERATOR_LABEL = { '>=': '상향 돌파', '<=': '하향 이탈' }
const STATUS_LABEL = { active: '감시 중', done: '완료', disabled: '대기' }

function formatNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
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
 * 조건 상세 화면 (`/condition/:id`, WP-D D2): operator/target/상태 수정 + 삭제.
 * 수정 폼은 `ConditionForm`의 편집 모드(`editCondition` prop)를 그대로 재사용한다.
 */
function ConditionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [condition, setCondition] = useState(null)
  const [savedAt, setSavedAt] = useState(0)

  const load = useCallback(async () => {
    if (!supabase) {
      setLoadError('Supabase 환경변수가 설정되지 않아 조건을 불러올 수 없습니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.from('conditions').select('*').eq('id', id).maybeSingle()
    if (error) {
      console.error('[ConditionDetailPage] condition 조회 실패:', error)
      setLoadError('조건을 불러오지 못했습니다.')
      setLoading(false)
      return
    }
    if (!data) {
      setLoadError('해당 조건을 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    setCondition(data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function handleUpdated(next) {
    setCondition(next)
    setSavedAt(Date.now())
  }

  function handleDeleted() {
    navigate('/conditions')
  }

  return (
    <section className="condition-detail-page">
      <div className="condition-detail-crumb">
        <Link to="/conditions">← 조건 관리</Link>
      </div>

      {loading && <p className="condition-detail-status">불러오는 중...</p>}
      {!loading && loadError && (
        <p className="condition-detail-status condition-detail-status--error">{loadError}</p>
      )}

      {!loading && !loadError && condition && (
        <>
          <div className="condition-detail-head">
            <div>
              <h1>
                {condition.name} <span className="mono condition-detail-ticker">{condition.ticker}</span>
              </h1>
              <p className="condition-detail-sub mono">
                {describeCondition(condition)} ·{' '}
                <span className={`status ${condition.status === 'active' ? 'active' : condition.status === 'done' ? 'done' : 'pending'}`}>
                  {STATUS_LABEL[condition.status] ?? condition.status}
                </span>
              </p>
              <p className="condition-detail-meta caption">
                생성 {formatDateTime(condition.created_at)}
                {condition.triggered_at ? ` · 최근 충족 ${formatDateTime(condition.triggered_at)}` : ''}
              </p>
            </div>
            <Link to={`/stock/${condition.ticker}`} className="condition-detail-chart-link">
              차트 보기 →
            </Link>
          </div>

          {savedAt > 0 && <p className="condition-detail-saved">변경사항이 저장됐습니다.</p>}

          <ConditionForm editCondition={condition} onUpdated={handleUpdated} onDeleted={handleDeleted} />
        </>
      )}
    </section>
  )
}

export default ConditionDetailPage
