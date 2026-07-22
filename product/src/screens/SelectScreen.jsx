import { useState } from 'react'
import TopBar from '../components/TopBar'
import { JOBS, SUPPORTED_JOB, PREVIEW } from '../data/mock'

// 01 직무 선택. 예시 직무 버튼 중 하나를 선택하고 분석을 시작한다.
// selectedJob 상태로 어떤 버튼이 선택됐는지 화면에 반영한다.
function SelectScreen({ go }) {
  const [selectedJob, setSelectedJob] = useState(SUPPORTED_JOB)

  return (
    <>
      <TopBar step={1} label="직무 선택" go={go} />
      <main className="app-shell">
        <div className="page">
          <section className="job-select-card">
            <div className="card-header">
              <span className="badge">STEP 1 · 직무 선택</span>
              <h1>어떤 직무의 채용공고를 살펴볼까요?</h1>
              <p>
                관심 직무의 채용공고를 깊이 해설해, 이 직무·기업군이 실제로 원하는
                수준과 그에 맞춰 무엇을 준비할지를 정리합니다.
              </p>
            </div>

            <div className="example-section">
              <div className="example-label">직무 선택</div>
              <div className="example-buttons">
                {JOBS.map((job) => (
                  <button
                    key={job}
                    type="button"
                    className={`example-btn${job === selectedJob ? ' is-selected' : ''}`}
                    aria-pressed={job === selectedJob}
                    onClick={() => setSelectedJob(job)}
                  >
                    {job}
                  </button>
                ))}
              </div>
            </div>

            <div className="analysis-preview" aria-label="분석 항목 미리보기">
              {PREVIEW.map((p) => (
                <div className="preview-item" key={p.title}>
                  <strong>{p.title}</strong>
                  <span>{p.desc}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="submit-btn"
              onClick={() => go('stats')}
              disabled={selectedJob !== SUPPORTED_JOB}
              style={{ width: '100%', opacity: selectedJob === SUPPORTED_JOB ? 1 : 0.5 }}
            >
              {selectedJob} 분석 시작하기 →
            </button>
            <p className="footnote">
              최근 1년 백엔드 신입·주니어 공고 30건을 가정한 mock 리서치입니다. 현재 데이터는 백엔드 직무만 제공합니다.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}

export default SelectScreen
