import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getGapAnalysis, postGapAnalysis } from '../api/gapAnalysis'
import { buildJobDisplay, CATEGORY_LABELS } from '../lib/gapAnalysis'
import DonutChart from '../components/charts/DonutChart'
import PriorityBarChart from '../components/charts/PriorityBarChart'
import JobCard from '../components/result/JobCard'
import JobDetailModal from '../components/result/JobDetailModal'
import InsightModal from '../components/result/InsightModal'
import EmptyState from '../components/result/EmptyState'
import { ANALYSIS_ID_STORAGE_KEY } from '../constants/storageKeys'
import { useAuth } from '../context/AuthContext'
import { useBookmarks } from '../hooks/useBookmarks'
import {
  apiFiltersFromForm,
  apiSpecFromForm,
  formFiltersFromApi,
  formSpecFromApi,
  useAppState,
} from '../context/AppStateContext'

// 새로고침해도 결과가 유지되도록 마지막으로 본 분석 결과의 id를 별도로 저장해둔다(#9). AppStateContext(#15)의
// specfit_app_state와는 완전히 분리된 키 — 이 id→GET 복원 경로는 그대로 두고, Context는 필터/스펙 폼 값이
// 새로고침에도 살아있게 하는 데 더해 이 페이지가 렌더링할 spec/filters/result의 저장소로 함께 쓴다.

function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // SpecPage가 방금 제출 직후에만 이 플래그를 실어 보낸다 — Context의 spec/filters 자체는 새로고침 후에도
  // 남아있으므로, "방금 제출해서 새로 분석해야 하는지" vs "새로고침이라 기존 결과를 복원해야 하는지"는
  // 이 일회성 라우터 state로만 구분할 수 있다.
  const isFresh = location.state?.fresh === true
  const { filters, spec, result, setSpec, setFilters, setResult } = useAppState()
  const { user } = useAuth()
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks()

  const [status, setStatus] = useState('loading')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [showInsight, setShowInsight] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState(null)

  const [retryCount, setRetryCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    async function run() {
      // /spec에서 방금 제출된 경우: Context에 있는 필터/스펙으로 새 분석을 실행한다.
      if (isFresh) {
        const fetched = await postGapAnalysis({
          spec: apiSpecFromForm(spec),
          filters: apiFiltersFromForm(filters),
        })
        if (cancelled) return
        localStorage.setItem(ANALYSIS_ID_STORAGE_KEY, String(fetched.id))
        setResult(fetched)
        setStatus('done')
        setShowInsight(true)
        return
      }
      // 새로고침 등으로 fresh 플래그가 없는 경우: 저장된 id로 이전 결과를 복원한다.
      const savedId = localStorage.getItem(ANALYSIS_ID_STORAGE_KEY)
      if (!savedId) {
        setStatus('no-spec')
        return
      }
      try {
        const fetched = await getGapAnalysis(savedId)
        if (cancelled) return
        setResult(fetched)
        // 이 세션에서 Context가 비어있던 경우(새 탭/직접 URL 진입)를 대비해 복원된 값으로 채워둔다 —
        // "스펙 수정"/"필터 다시 선택" 버튼이 항상 지금 보고 있는 결과 기준으로 동작하게 하기 위해서다.
        setSpec(formSpecFromApi(fetched.spec))
        setFilters(formFiltersFromApi(fetched.filters))
        setStatus('done')
        setShowInsight(false)
      } catch {
        // id가 더 이상 유효하지 않거나(오래된 분석 결과 등) 복원에 실패하면 처음부터 다시 시작한다.
        localStorage.removeItem(ANALYSIS_ID_STORAGE_KEY)
        if (!cancelled) setStatus('no-spec')
      }
    }

    run().catch((err) => {
      if (cancelled) return
      setErrorMessage(err?.message ?? null)
      setStatus('error')
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount])

  const displayJobs = useMemo(() => {
    if (!result) return []
    return result.jobList.map((entry) => buildJobDisplay(entry, spec))
  }, [result, spec])

  const displayedJobs = useMemo(() => {
    let list = displayJobs
    if (statusFilter === 'match') list = list.filter((j) => j.overallMatch)
    else if (statusFilter === 'missing') list = list.filter((j) => !j.overallMatch)

    list = [...list]
    if (sort === 'matchFirst') list.sort((a, b) => Number(b.overallMatch) - Number(a.overallMatch))
    else if (sort === 'missingFirst') list.sort((a, b) => Number(a.overallMatch) - Number(b.overallMatch))
    else if (sort === 'company') list.sort((a, b) => a.company.localeCompare(b.company, 'ko'))
    return list
  }, [displayJobs, statusFilter, sort])

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-text">스펙과 공고 요건을 항목별로 대조하는 중이에요… 💦</p>
      </div>
    )
  }

  // 방금 제출한 것도 아니고 복원할 저장된 분석 결과도 없는 경우에만 1단계로 돌려보낸다.
  // status==='loading'일 때 곧바로 판단하면 복원 시도도 해보기 전에 리다이렉트되므로 반드시 이 뒤에 둔다.
  if (status === 'no-spec') return <Navigate to="/filter" replace />

  if (status === 'error') {
    return (
      <div className="screen">
        <h1>3단계 · 갭 분석 결과</h1>
        <EmptyState
          title="분석 요청에 실패했어요"
          description={errorMessage ?? '백엔드 서버가 켜져 있는지 확인하고 다시 시도해주세요.'}
          actionLabel="다시 시도"
          onAction={() => setRetryCount((n) => n + 1)}
        />
      </div>
    )
  }

  // 백엔드는 improvementRanking 항목에 category 키(예: "career")만 내려주고 한글 라벨은 안 붙여준다 —
  // 라벨은 순수 FE 표시 관심사라 여기서 CATEGORY_LABELS로 붙인다.
  const stats = {
    ...result.stats,
    improvementRanking: result.stats.improvementRanking.map((r) => ({
      ...r,
      label: CATEGORY_LABELS[r.category],
    })),
  }
  const matchCount = displayJobs.filter((j) => j.overallMatch).length
  const missingCount = displayJobs.length - matchCount

  // 비로그인 상태에서 북마크 아이콘을 클릭하면 토글하지 않고 로그인 화면으로 보낸다(redirect로 현재 경로 유지).
  function handleToggleBookmark(jobId) {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
      return
    }
    toggleBookmark(jobId)
  }

  const specChips = [
    { label: '직종', value: result.filters?.job_category ?? '전체' },
    {
      label: '인턴 여부',
      value:
        result.filters?.is_intern === true
          ? '인턴만'
          : result.filters?.is_intern === false
            ? '정규만'
            : '전체',
    },
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
        <button className="btn-link" style={{ marginLeft: 'auto' }} onClick={() => navigate('/spec')}>
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
            <DonutChart ratio={stats.ratio} matched={stats.matched} total={stats.total} animate={!showInsight} />
          </div>

          <div className="chart-card">
            <div className="title">보완 시 늘어나는 공고 수</div>
            <PriorityBarChart ranking={stats.improvementRanking} animate={!showInsight} />
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
              <option value="missingFirst">지원 불가능 우선</option>
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
              actionLabel="필터 다시 선택하기"
              onAction={() => navigate('/filter')}
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
              <JobCard
                key={job.job_id}
                job={job}
                onClick={() => setSelectedJobId(job.job_id)}
                bookmarked={isBookmarked(job.job_id)}
                onToggleBookmark={() => handleToggleBookmark(job.job_id)}
              />
            ))
          )}
        </div>
      </div>

      {showInsight && <InsightModal stats={stats} onClose={() => setShowInsight(false)} />}
      {selectedJobId && (
        <JobDetailModal
          job={displayJobs.find((j) => j.job_id === selectedJobId)}
          onClose={() => setSelectedJobId(null)}
          bookmarked={isBookmarked(selectedJobId)}
          onToggleBookmark={() => handleToggleBookmark(selectedJobId)}
        />
      )}
    </div>
  )
}

export default ResultPage
