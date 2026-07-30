import { useState } from 'react'
import useCertificationOptions from '../hooks/useCertificationOptions.js'
import useCertificationPath from '../hooks/useCertificationPath.js'
import PathResult from './PathResult.jsx'

function CertPathPlanner() {
  const { options, isLoading: optionsLoading, error: optionsError } = useCertificationOptions()
  const { result, isLoading, error, computePath } = useCertificationPath()
  const [selectedIds, setSelectedIds] = useState([])

  const toggle = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    computePath(selectedIds)
  }

  return (
    <div className="cert-planner">
      <form className="path-planner" onSubmit={handleSubmit}>
        <div className="path-planner__eyebrow">
          <span className="cert-search__dot" aria-hidden="true" />
          <span>CERT_PLANNER / PATH</span>
        </div>
        <h1 className="path-planner__title">경로 최적화</h1>
        <p className="path-planner__subtitle">
          목표로 하는 자격증을 2개 이상 골라 선수조건을 반영한 취득 순서를 확인하세요.
        </p>

        {optionsLoading && <div className="cert-list__status">불러오는 중...</div>}
        {optionsError && <div className="cert-list__status cert-list__status--error">{optionsError}</div>}

        {!optionsLoading && !optionsError && (
          <div className="path-planner__options">
            {options.map((option) => (
              <label key={option.id} className="path-planner__option">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => toggle(option.id)}
                />
                {option.name}
              </label>
            ))}
          </div>
        )}

        <button type="submit" className="path-planner__submit" disabled={selectedIds.length < 2 || isLoading}>
          {isLoading ? '계산 중...' : '순서 계산하기 →'}
        </button>
      </form>

      <PathResult result={result} isLoading={isLoading} error={error} />
    </div>
  )
}

export default CertPathPlanner
