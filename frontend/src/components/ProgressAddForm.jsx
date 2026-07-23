import { useState } from 'react'
import useCertificationOptions from '../hooks/useCertificationOptions.js'

const STATUS_OPTIONS = [
  { value: 'PLANNED', label: '예정' },
  { value: 'IN_PROGRESS', label: '준비 중' },
  { value: 'COMPLETED', label: '완료' },
]

function ProgressAddForm({ onAdd }) {
  const { options, isLoading: optionsLoading, error: optionsError } = useCertificationOptions()
  const [certificationId, setCertificationId] = useState('')
  const [status, setStatus] = useState('PLANNED')
  const [targetDate, setTargetDate] = useState('')
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!certificationId) {
      setValidationError('추적할 자격증을 선택해주세요.')
      return
    }
    setValidationError('')
    setSubmitError('')
    setIsSubmitting(true)
    try {
      await onAdd({ certificationId: Number(certificationId), status, targetDate })
      setCertificationId('')
      setStatus('PLANNED')
      setTargetDate('')
    } catch (err) {
      setSubmitError(err.message ?? '추가에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="progress-add" onSubmit={handleSubmit}>
      <div className="progress-add__eyebrow">
        <span className="cert-search__dot" aria-hidden="true" />
        <span>CERT_PLANNER / TRACK</span>
      </div>
      <h1 className="progress-add__title">진행 상황 추가</h1>

      <label className="progress-add__label" htmlFor="progress-cert-select">
        추적할 자격증
      </label>
      <select
        id="progress-cert-select"
        className={`progress-add__select ${validationError ? 'progress-add__select--error' : ''}`}
        value={certificationId}
        onChange={(e) => {
          setCertificationId(e.target.value)
          setValidationError('')
        }}
        disabled={optionsLoading}
      >
        <option value="">{optionsLoading ? '불러오는 중...' : '선택하세요'}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {validationError && <div className="progress-add__error">{validationError}</div>}
      {optionsError && <div className="progress-add__error">{optionsError}</div>}

      <div className="progress-add__row">
        <div>
          <label className="progress-add__label" htmlFor="progress-status-select">
            상태
          </label>
          <select
            id="progress-status-select"
            className="progress-add__select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="progress-add__label" htmlFor="progress-target-date">
            목표일 (선택)
          </label>
          <input
            id="progress-target-date"
            type="date"
            className="progress-add__input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
      </div>

      {submitError && <div className="progress-add__error">{submitError}</div>}

      <button type="submit" className="progress-add__submit" disabled={isSubmitting}>
        {isSubmitting ? '추가 중...' : '추적 시작하기 →'}
      </button>
    </form>
  )
}

export default ProgressAddForm
