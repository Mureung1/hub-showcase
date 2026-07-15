import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { JOB_CATEGORY_OPTIONS } from '../constants/filterOptions'

// ResultPage/SpecPage가 navigate(..., { state: { filters } })로 넘겨준 값이 있으면 그걸로 폼을 채운다 —
// AppStateContext가 없는 이번 주 스코프에서 뒤로 갔다 와도 선택값이 날아가지 않게 하는 임시 방편.
function buildInitialFilters(incoming) {
  return {
    job_category: incoming?.job_category ?? '',
    is_intern: incoming?.is_intern === true ? 'true' : incoming?.is_intern === false ? 'false' : '',
  }
}

function FilterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [filters, setFilters] = useState(() => buildInitialFilters(location.state?.filters))

  function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      ...(filters.job_category && { job_category: filters.job_category }),
      ...(filters.is_intern !== '' && { is_intern: filters.is_intern === 'true' }),
    }
    navigate('/spec', { state: { filters: payload } })
  }

  return (
    <div className="screen">
      <h1>1단계 · 조건 필터링</h1>
      <p className="sub">
        관심 있는 직종과 인턴 여부를 고르면 그 조건에 맞는 공고만 모아서 갭 분석을 진행해요. 비워두면 전체
        공고를 대상으로 합니다.
      </p>

      <form className="field-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">직종</span>
          <select
            value={filters.job_category}
            onChange={(e) => setFilters((prev) => ({ ...prev, job_category: e.target.value }))}
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
            onChange={(e) => setFilters((prev) => ({ ...prev, is_intern: e.target.value }))}
          >
            <option value="">전체</option>
            <option value="true">인턴 공고만</option>
            <option value="false">정규 공고만</option>
          </select>
        </label>

        <div className="btn-row field-full">
          <button type="submit" className="btn-primary">
            다음: 스펙 입력하기
          </button>
        </div>
      </form>
    </div>
  )
}

export default FilterPage
