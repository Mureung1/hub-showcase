import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { postGapAnalysis } from '../api/gapAnalysis'
import { buildJobDisplay, CATEGORY_LABELS } from '../lib/gapAnalysis'
import DonutChart from '../components/charts/DonutChart'
import PriorityBarChart from '../components/charts/PriorityBarChart'
import JobCard from '../components/result/JobCard'
import JobDetailModal from '../components/result/JobDetailModal'
import InsightModal from '../components/result/InsightModal'
import EmptyState from '../components/result/EmptyState'

function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const spec = location.state?.spec

  const [status, setStatus] = useState('loading')
  const [analysis, setAnalysis] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [showInsight, setShowInsight] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState(null)

  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!spec) return
    let cancelled = false
    setStatus('loading')
    postGapAnalysis({ spec })
      .then((result) => {
        if (cancelled) return
        setAnalysis(result)
        setStatus('done')
        setShowInsight(true)
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount])

  const displayJobs = useMemo(() => {
    if (!analysis) return []
    return analysis.jobList.map((entry) => buildJobDisplay(entry, spec))
  }, [analysis, spec])

  const displayedJobs = useMemo(() => {
    let list = displayJobs
    if (statusFilter === 'match') list = list.filter((j) => j.overallMatch)
    else if (statusFilter === 'missing') list = list.filter((j) => !j.overallMatch)

    list = [...list]
    if (sort === 'matchFirst') list.sort((a, b) => Number(b.overallMatch) - Number(a.overallMatch))
    else if (sort === 'company') list.sort((a, b) => a.company.localeCompare(b.company, 'ko'))
    return list
  }, [displayJobs, statusFilter, sort])

  if (!spec) return <Navigate to="/spec" replace />

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <p className="loading-text">스펙과 공고 요건을 항목별로 대조하는 중이에요…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="screen">
        <h1>3단계 · 갭 분석 결과</h1>
        <EmptyState
          title="분석 요청에 실패했어요"
          description="백엔드 서버가 켜져 있는지 확인하고 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => setRetryCount((n) => n + 1)}
        />
      </div>
    )
  }

  // 백엔드는 improvementRanking 항목에 category 키(예: "career")만 내려주고 한글 라벨은 안 붙여준다 —
  // 라벨은 순수 FE 표시 관심사라 여기서 CATEGORY_LABELS로 붙인다.
  const stats = {
    ...analysis.stats,
    improvementRanking: analysis.stats.improvementRanking.map((r) => ({
      ...r,
      label: CATEGORY_LABELS[r.category],
    })),
  }
  const matchCount = displayJobs.filter((j) => j.overallMatch).length
  const missingCount = displayJobs.length - matchCount

  const specChips = [
    { label: '학력', value: spec.education },
    { label: '경력', value: spec.career_months > 0 ? `경력 ${spec.career_months}개월` : '신입' },
    { label: '자격증', value: `${spec.certificates?.length ?? 0}개` },
    { label: '전공', value: spec.major },
  ]

  return (
    <div className="screen-wide">
      <h1>3단계 · 갭 분석 결과</h1>
      <div className="spec-chips">
        {specChips.map((c) => (
          <span className="spec-chip" key={c.label}>
            {c.label}: {c.value}
          </span>
        ))}
        <button className="btn-link" style={{ marginLeft: 'auto' }} onClick={() => navigate('/spec', { state: { spec } })}>
          스펙 수정
        </button>
      </div>

      <div className="result-layout">
        <aside className="result-sidebar">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">전체 공고</div>
              <div className="value mono">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="label">지원 가능 공고</div>
              <div className="value mono">{stats.matched}</div>
            </div>
            <div className="stat-card">
              <div className="label">지원 가능 비율</div>
              <div className="value mono">{Math.round(stats.ratio * 100)}%</div>
            </div>
          </div>

          <div className="chart-card">
            <div className="title">지원 가능 비율</div>
            <DonutChart ratio={stats.ratio} matched={stats.matched} total={stats.total} />
          </div>

          <div className="chart-card">
            <div className="title">보완 시 늘어나는 공고 수</div>
            <PriorityBarChart ranking={stats.improvementRanking} />
          </div>
        </aside>

        <div className="result-main">
          <div className="result-toolbar">
            <div className="result-tabs">
              <button
                className={`result-tab${statusFilter === 'all' ? ' active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                전체 <span className="tab-count">{displayJobs.length}</span>
              </button>
              <button
                className={`result-tab${statusFilter === 'match' ? ' active' : ''}`}
                onClick={() => setStatusFilter('match')}
              >
                지원 가능 <span className="tab-count">{matchCount}</span>
              </button>
              <button
                className={`result-tab${statusFilter === 'missing' ? ' active' : ''}`}
                onClick={() => setStatusFilter('missing')}
              >
                미충족 <span className="tab-count">{missingCount}</span>
              </button>
            </div>
            <select className="result-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">기본순</option>
              <option value="matchFirst">지원 가능 우선</option>
              <option value="company">회사명순</option>
            </select>
          </div>

          <p className="job-list-title">
            공고 목록 ({displayedJobs.length}건{displayedJobs.length !== displayJobs.length ? ` · 전체 ${displayJobs.length}건 중` : ''})
          </p>

          {displayJobs.length === 0 ? (
            <EmptyState
              title="조건에 맞는 공고가 없어요"
              description="필터 조건을 조금 넓혀서 다시 시도해보세요."
              actionLabel="스펙 다시 입력하기"
              onAction={() => navigate('/spec', { state: { spec } })}
            />
          ) : displayedJobs.length === 0 ? (
            <EmptyState
              title="해당하는 공고가 없어요"
              description="다른 탭을 선택해서 확인해보세요."
              actionLabel="전체 보기"
              onAction={() => setStatusFilter('all')}
            />
          ) : (
            displayedJobs.map((job) => (
              <JobCard key={job.job_id} job={job} onClick={() => setSelectedJobId(job.job_id)} />
            ))
          )}
        </div>
      </div>

      {showInsight && <InsightModal stats={stats} onClose={() => setShowInsight(false)} />}
      {selectedJobId && (
        <JobDetailModal
          job={displayJobs.find((j) => j.job_id === selectedJobId)}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  )
}

export default ResultPage
