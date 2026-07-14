import { useState } from 'react'
import { EXAMPLE_JOBS, ANALYSIS_PREVIEW_ITEMS, MOCK_POST_COUNT } from '../data/jobs'
import './ProductPage.css'

// 오늘 범위: 컴포넌트를 나누지 않고 한 화면 안에서 useState로 입력값·선택 상태·제출 결과를
// 관리한다. 서버 없이 mock 데이터로 화면이 상태에 따라 바뀌는지 확인하는 것이 목표다.
function ProductPage() {
  const [jobInput, setJobInput] = useState(EXAMPLE_JOBS[0])
  const [selectedJob, setSelectedJob] = useState(EXAMPLE_JOBS[0])
  const [submittedJob, setSubmittedJob] = useState(null)

  function handleInputChange(e) {
    setJobInput(e.target.value)
    setSelectedJob(null)
    setSubmittedJob(null)
  }

  function handleExampleClick(job) {
    setJobInput(job)
    setSelectedJob(job)
    setSubmittedJob(null)
  }

  function handleSubmit() {
    if (!jobInput.trim()) return
    setSubmittedJob(jobInput.trim())
  }

  return (
    <div className="product-page">
      <header className="top-bar">
        <div className="top-bar__brand">
          <span className="top-bar__mark">CS</span>
          <span>
            <span className="top-bar__name">CareerSignal</span>
            <span className="top-bar__tagline">채용공고 기반 진로탐색 에이전트</span>
          </span>
        </div>
        <div className="top-bar__meta">
          <span className="top-bar__step">
            STEP <strong>1</strong> / 3 · 직무 선택
          </span>
        </div>
      </header>

      <main className="app-shell">
        <div className="page">
          <section className="job-select-card">
            <div className="card-header">
              <span className="badge">STEP 1 · 직무 선택</span>
              <h1>어떤 직무의 채용 신호를 분석할까요?</h1>
              <p>
                관심 직무의 채용공고에서 반복되는 필수 요구사항과 우대사항,
                기업군별 구현 기준을 분석해 지원 준비 우선순위로 정리합니다.
              </p>
            </div>

            <div className="input-group">
              <label htmlFor="jobInput">관심 직무 입력</label>
              <input
                className="job-input"
                type="text"
                id="jobInput"
                placeholder="예: 프론트엔드 개발자, 데이터 분석가, ML 엔지니어"
                value={jobInput}
                onChange={handleInputChange}
              />
            </div>

            <div className="example-section">
              <div className="example-label">빠르게 시작하기</div>
              <div className="example-buttons">
                {EXAMPLE_JOBS.map((job) => (
                  <button
                    key={job}
                    type="button"
                    className={`example-btn${job === selectedJob ? ' is-selected' : ''}`}
                    aria-pressed={job === selectedJob}
                    onClick={() => handleExampleClick(job)}
                  >
                    {job}
                  </button>
                ))}
              </div>
            </div>

            <div className="analysis-preview" aria-label="분석 항목 미리보기">
              {ANALYSIS_PREVIEW_ITEMS.map((item) => (
                <div className="preview-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>

            <button type="button" className="submit-btn" onClick={handleSubmit}>
              {jobInput.trim() ? `${jobInput.trim()} 분석 시작하기 →` : '분석 시작하기 →'}
            </button>

            {submittedJob && (
              <p className="submit-confirm">
                “{submittedJob}” 직무의 mock 공고 {MOCK_POST_COUNT}건 분석을 준비했습니다. 분석 결과 화면은 다음
                작업에서 이어집니다.
              </p>
            )}

            <p className="footnote">
              프로토타입 데이터는 최근 3개월 주니어 프론트엔드 공고 {MOCK_POST_COUNT}건을 가정한 mock 리서치입니다.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default ProductPage
