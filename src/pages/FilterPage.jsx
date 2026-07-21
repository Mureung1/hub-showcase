import { useNavigate } from 'react-router-dom'
import { JOB_CATEGORY_OPTIONS } from '../constants/filterOptions'
import { useAppState } from '../context/AppStateContext'

function FilterPage() {
  const navigate = useNavigate()
  const { filters, setFilters } = useAppState()

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/spec')
  }

  return (
    <div className="screen">
      <h1>1단계 · 조건 필터링</h1>
      <p className="sub">
        관심 있는 직종과 인턴 여부를 고르면 그 조건에 맞는 공고만 모아서 갭 분석을 진행해요. 비워두면 전체
        공고를 대상으로 합니다.
      </p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">직종</span>
            <select
              value={filters.job_category}
              onChange={(e) => setFilters({ job_category: e.target.value })}
            >
              <option value="">전체</option>
              {JOB_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">인턴 여부</span>
            <select
              value={filters.is_intern}
              onChange={(e) => setFilters({ is_intern: e.target.value })}
            >
              <option value="">전체</option>
              <option value="true">인턴 공고만</option>
              <option value="false">정규 공고만</option>
            </select>
          </label>
        </div>

        <div className="btn-row">
          <button type="submit" className="btn-primary">
            다음: 스펙 입력하기
          </button>
        </div>
      </form>
    </div>
  )
}

export default FilterPage
