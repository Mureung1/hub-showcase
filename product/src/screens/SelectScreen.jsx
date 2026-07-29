import { useState } from 'react'
import TopBar from '../components/TopBar'
import useJobs from '../hooks/useJobs'
import { PREVIEW } from '../data/preview'

// 01 직무 선택. 직무 목록은 GET /api/jobs 에서 받아 온다(useJobs).
// 고른 직무는 App 의 job 상태로 올라가고, 나머지 네 화면이 그 값을 prop 으로 받는다.
function SelectScreen({ go, job, setJob }) {
  const { jobs, status } = useJobs()
  // 선택 표시는 화면 안에서만 쓰고, 확정(분석 시작) 때 App 으로 올린다.
  const [selected, setSelected] = useState(job)
  // 목록이 바뀌어 선택한 직무가 사라지면 첫 항목으로 맞춘다.
  const current = jobs.find((j) => j.job_role_id === selected.job_role_id) || jobs[0] || selected

  const start = () => {
    setJob(current)
    go('stats')
  }

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
                관심 직무의 채용공고를 깊이 해석해, 이 직무·기업군이 실제로 원하는
                수준과 그에 맞춰 무엇을 준비할지를 정리합니다.
              </p>
            </div>

            <div className="example-section">
              <div className="example-label">직무 선택</div>
              <div className="example-buttons">
                {jobs.map((item) => (
                  <button
                    key={item.job_role_id}
                    type="button"
                    className={`example-btn${item.job_role_id === current.job_role_id ? ' is-selected' : ''}`}
                    aria-pressed={item.job_role_id === current.job_role_id}
                    onClick={() => setSelected(item)}
                  >
                    {item.display_name}
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

            <button type="button" className="submit-btn" onClick={start} style={{ width: '100%' }}>
              {current.display_name} 분석 시작하기 →
            </button>
            <p className="footnote">
              직무 목록은 서버의 직무 카탈로그(<code>GET /api/jobs</code>)를 그대로 씁니다.
              {status === 'fallback' && ' 지금은 서버에 연결하지 못해 기본 목록을 보여 주고 있습니다.'}
              {' '}분석 결과가 아직 준비되지 않은 직무는 다음 화면에서 안내합니다.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}

export default SelectScreen
