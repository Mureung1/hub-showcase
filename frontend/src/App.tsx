import { useEffect, useState } from 'react'
import './App.css'

export interface Hypothesis {
  id: string
  cause: string
  effect: string
}

export interface ProjectFormState {
  title: string
  problem_definition: string
  additional_notes: string
  hypotheses: Hypothesis[]
}

interface ValidationErrors {
  title?: string
  problem_definition?: string
  additional_notes?: string
  hypotheses?: Record<string, { cause?: string; effect?: string }>
}

function createHypothesis(): Hypothesis {
  return { id: crypto.randomUUID(), cause: '', effect: '' }
}

function validateForm(state: ProjectFormState): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!state.title.trim()) {
    errors.title = '프로젝트 제목을 입력해주세요.'
  }
  if (!state.problem_definition.trim()) {
    errors.problem_definition = '문제 정의를 입력해주세요.'
  }

  const hypothesisErrors: Record<string, { cause?: string; effect?: string }> = {}
  for (const h of state.hypotheses) {
    const rowError: { cause?: string; effect?: string } = {}
    if (!h.cause.trim()) rowError.cause = '원인을 입력해주세요.'
    if (!h.effect.trim()) rowError.effect = '결과를 입력해주세요.'
    if (rowError.cause || rowError.effect) hypothesisErrors[h.id] = rowError
  }
  if (Object.keys(hypothesisErrors).length > 0) {
    errors.hypotheses = hypothesisErrors
  }

  return errors
}

function hasAnyError(errors: ValidationErrors): boolean {
  return Boolean(errors.title || errors.problem_definition || errors.hypotheses)
}

function App() {
  const [formState, setFormState] = useState<ProjectFormState>({
    title: '새로운 PM 분석 프로젝트',
    problem_definition: '',
    additional_notes: '',
    hypotheses: [{ id: 'init-1', cause: '', effect: '' }],
  })
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showJson, setShowJson] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  // 한 번 제출한 뒤에는 입력이 바뀔 때마다 다시 검증해서, 값을 채우면 빨간 표시가 즉시 사라지도록 함.
  // 제출 전에는 검증을 실행하지 않으므로 처음에는 빨갛게 표시되지 않음.
  useEffect(() => {
    if (hasSubmitted) {
      setValidationErrors(validateForm(formState))
    }
  }, [formState, hasSubmitted])

  function handleFieldChange<K extends keyof ProjectFormState>(field: K, value: ProjectFormState[K]) {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  function handleHypothesisChange(id: string, field: 'cause' | 'effect', value: string) {
    setFormState((prev) => ({
      ...prev,
      hypotheses: prev.hypotheses.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    }))
  }

  function addHypothesis() {
    setFormState((prev) => ({ ...prev, hypotheses: [...prev.hypotheses, createHypothesis()] }))
  }

  function removeHypothesis(id: string) {
    setFormState((prev) => ({
      ...prev,
      hypotheses: prev.hypotheses.filter((h) => h.id !== id),
    }))
  }

  function handleSubmit() {
    setHasSubmitted(true)
    const errors = validateForm(formState)
    setValidationErrors(errors)
    setSubmitted(!hasAnyError(errors))
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>가설 검증 인터뷰 분석 도구</h1>
        <p>프로젝트 정보와 가설을 입력하고 분석을 시작하세요.</p>
      </header>

      <section className="card">
        <div className="field">
          <label className="field-label" htmlFor="title">프로젝트 제목</label>
          <input
            id="title"
            className={`input${validationErrors.title ? ' has-error' : ''}`}
            value={formState.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
          />
          {validationErrors.title && <p className="error-text">{validationErrors.title}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="problem_definition">문제 정의</label>
          <textarea
            id="problem_definition"
            className={`textarea${validationErrors.problem_definition ? ' has-error' : ''}`}
            value={formState.problem_definition}
            onChange={(e) => handleFieldChange('problem_definition', e.target.value)}
          />
          {validationErrors.problem_definition && (
            <p className="error-text">{validationErrors.problem_definition}</p>
          )}
        </div>
      </section>

      <section className="card">
        <label className="field-label">가설 (원인 → 결과)</label>
        {formState.hypotheses.map((h) => {
          const rowError = validationErrors.hypotheses?.[h.id]
          return (
            <div className="hypothesis-row" key={h.id}>
              <div className="field">
                <input
                  className={`input${rowError?.cause ? ' has-error' : ''}`}
                  placeholder="원인"
                  value={h.cause}
                  onChange={(e) => handleHypothesisChange(h.id, 'cause', e.target.value)}
                />
                {rowError?.cause && <p className="error-text">{rowError.cause}</p>}
              </div>
              <div className="field">
                <input
                  className={`input${rowError?.effect ? ' has-error' : ''}`}
                  placeholder="결과"
                  value={h.effect}
                  onChange={(e) => handleHypothesisChange(h.id, 'effect', e.target.value)}
                />
                {rowError?.effect && <p className="error-text">{rowError.effect}</p>}
              </div>
              <button
                type="button"
                className="btn btn-remove"
                onClick={() => removeHypothesis(h.id)}
                disabled={formState.hypotheses.length === 1}
                aria-label="가설 삭제"
              >
                삭제
              </button>
            </div>
          )
        })}
        <button type="button" className="btn btn-add" onClick={addHypothesis}>
          + 가설 추가
        </button>
      </section>

      <section className="card">
        <div className="field">
          <label className="field-label" htmlFor="additional_notes">추가 컨텍스트</label>
          <textarea
            id="additional_notes"
            className="textarea"
            value={formState.additional_notes}
            onChange={(e) => handleFieldChange('additional_notes', e.target.value)}
          />
        </div>
      </section>

      <div className="submit-row">
        {submitted && <span className="success-banner">프로젝트가 생성되었습니다.</span>}
        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
          프로젝트 생성
        </button>
      </div>

      <section className="json-panel" style={{ marginTop: 'var(--space-lg)' }}>
        <button
          type="button"
          className="json-panel-toggle"
          onClick={() => setShowJson((prev) => !prev)}
        >
          {showJson ? '▼' : '▶'} 실시간 상태 (JSON)
        </button>
        {showJson && <pre>{JSON.stringify(formState, null, 2)}</pre>}
      </section>
    </div>
  )
}

export default App
