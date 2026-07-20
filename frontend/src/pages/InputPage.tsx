import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface Hypothesis {
  id: string
  cause: string
  effect: string
}

export interface Interview {
  id: string
  interviewee_name: string
  transcript: string
}

export interface ProjectFormState {
  title: string
  problem_definition: string
  additional_notes: string
  hypotheses: Hypothesis[]
  interviews: Interview[]
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

function createInterview(): Interview {
  return { id: crypto.randomUUID(), interviewee_name: '', transcript: '' }
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

function InputPage() {
  const navigate = useNavigate()
  const [formState, setFormState] = useState<ProjectFormState>({
    title: '새로운 PM 분석 프로젝트',
    problem_definition: '',
    additional_notes: '',
    hypotheses: [{ id: 'init-1', cause: '', effect: '' }],
    interviews: [{ id: 'interview-1', interviewee_name: '', transcript: '' }],
  })
  const [uploadingInterviewId, setUploadingInterviewId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showJson, setShowJson] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  function handleInterviewChange(id: string, field: 'interviewee_name' | 'transcript', value: string) {
    setFormState((prev) => ({
      ...prev,
      interviews: prev.interviews.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }))
  }

  function addInterview() {
    setFormState((prev) => ({ ...prev, interviews: [...prev.interviews, createInterview()] }))
  }

  function removeInterview(id: string) {
    setFormState((prev) => ({
      ...prev,
      interviews: prev.interviews.filter((i) => i.id !== id),
    }))
  }

  async function handleTranscriptFile(id: string, file: File) {
    setUploadError(null)
    setUploadingInterviewId(id)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`${API_BASE_URL}/api/extract`, { method: 'POST', body })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || '파일에서 텍스트를 추출하지 못했습니다.')
      }
      const { text } = await res.json()
      handleInterviewChange(id, 'transcript', text)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingInterviewId(null)
    }
  }

  async function handleSubmit() {
    setHasSubmitted(true)
    const errors = validateForm(formState)
    setValidationErrors(errors)
    if (hasAnyError(errors)) return

    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const createRes = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formState.title,
          problem_definition: formState.problem_definition,
          additional_notes: formState.additional_notes,
          hypotheses: formState.hypotheses.map((h) => ({ cause: h.cause, effect: h.effect })),
          interviews: formState.interviews
            .filter((i) => i.transcript.trim())
            .map((i) => ({ interviewee_name: i.interviewee_name, transcript: i.transcript })),
        }),
      })
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}))
        throw new Error(body.error || '프로젝트 생성에 실패했습니다.')
      }
      const { project_id: projectId } = await createRes.json()

      const analyzeRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/analyze`, {
        method: 'POST',
      })
      if (!analyzeRes.ok) {
        const body = await analyzeRes.json().catch(() => ({}))
        throw new Error(body.error || '분석 요청에 실패했습니다.')
      }

      // 분석 완료 후 대시보드로 이동.
      navigate(`/projects/${projectId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
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
        <label className="field-label">인터뷰 전사문</label>
        {formState.interviews.map((interview, index) => (
          <div className="field" key={interview.id} style={{ marginTop: 'var(--space-md)' }}>
            <div className="hypothesis-row">
              <input
                className="input"
                placeholder="인터뷰 대상자 이름 (선택)"
                value={interview.interviewee_name}
                onChange={(e) => handleInterviewChange(interview.id, 'interviewee_name', e.target.value)}
              />
              <input
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                disabled={uploadingInterviewId === interview.id}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleTranscriptFile(interview.id, file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className="btn btn-remove"
                onClick={() => removeInterview(interview.id)}
                disabled={formState.interviews.length === 1}
                aria-label="인터뷰 삭제"
              >
                삭제
              </button>
            </div>
            <textarea
              className="textarea"
              placeholder={`인터뷰 ${index + 1} 전사문을 붙여넣거나 .md/.txt 파일을 업로드하세요.\n예) 지연: 처음 들어왔을 때 뭐 하는 서비스인지 잘 모르겠더라고요.\n    민수: 저는 버튼이 눈에 안 띄어서 헤맸어요.\n\n"화자명: 발언" 형태로 줄바꿈 구분해 입력하면 분석 시 발언자를 더 정확하게 인식합니다. (필수는 아닙니다)`}
              value={interview.transcript}
              onChange={(e) => handleInterviewChange(interview.id, 'transcript', e.target.value)}
            />
            {uploadingInterviewId === interview.id && (
              <p className="field-label">파일에서 텍스트를 추출하는 중...</p>
            )}
          </div>
        ))}
        {uploadError && <p className="error-text">{uploadError}</p>}
        <button type="button" className="btn btn-add" onClick={addInterview}>
          + 인터뷰 추가
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
        {submitError && <span className="error-text">{submitError}</span>}
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? '분석 중...' : '분석 시작'}
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

export default InputPage
