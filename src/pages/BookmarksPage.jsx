import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { evaluateBookmarks, removeBookmark } from '../api/bookmarks'
import { useAuth } from '../context/AuthContext'
import { apiSpecFromForm, useAppState } from '../context/AppStateContext'
import { buildJobDisplay } from '../lib/gapAnalysis'
import JobCard from '../components/result/JobCard'
import JobDetailModal from '../components/result/JobDetailModal'
import EmptyState from '../components/result/EmptyState'

// 북마크한 공고는 "북마크했을 때의 스펙"이 아니라 Context에 지금 저장된 최신 스펙 기준으로 매번 재평가한다.
// 백엔드가 결과 화면(POST /api/gap-analysis)과 동일한 jobList 모양( { job, checks, overallMatch } )을 돌려주므로
// buildJobDisplay를 그대로 재사용해서 JobCard/JobDetailModal이 결과 화면과 완전히 같은 화면을 그린다.
function BookmarksPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { spec } = useAppState()

  const [jobList, setJobList] = useState([])
  const [status, setStatus] = useState('loading')
  const [selectedJobId, setSelectedJobId] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setStatus('loading')
    evaluateBookmarks(apiSpecFromForm(spec))
      .then((res) => {
        if (cancelled) return
        setJobList(res.jobList)
        setStatus('done')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [user, spec])

  const displayJobs = useMemo(() => jobList.map((entry) => buildJobDisplay(entry, spec)), [jobList, spec])

  if (authLoading) return null
  if (!user) return <Navigate to="/login?redirect=/bookmarks" replace />

  async function handleRemove(jobId) {
    await removeBookmark(jobId)
    setJobList((prev) => prev.filter((entry) => entry.job.job_id !== jobId))
  }

  return (
    <div className="screen">
      <h1>북마크한 공고</h1>
      <p className="sub">저장해둔 공고를 지금 입력된 스펙 기준으로 다시 비교해서 보여드려요.</p>

      {status === 'loading' && (
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          title="북마크 목록을 불러오지 못했어요"
          description="잠시 후 다시 시도해주세요."
          actionLabel="새로고침"
          onAction={() => window.location.reload()}
        />
      )}

      {status === 'done' && displayJobs.length === 0 && (
        <EmptyState
          title="아직 북마크한 공고가 없어요"
          description="갭 분석 결과에서 별 아이콘을 눌러 공고를 저장해보세요."
          actionLabel="갭 분석 시작하기"
          onAction={() => navigate('/filter')}
        />
      )}

      {status === 'done' &&
        displayJobs.map((job) => (
          <JobCard
            key={job.job_id}
            job={job}
            onClick={() => setSelectedJobId(job.job_id)}
            bookmarked
            onToggleBookmark={() => handleRemove(job.job_id)}
          />
        ))}

      {selectedJobId && (
        <JobDetailModal
          job={displayJobs.find((job) => job.job_id === selectedJobId)}
          onClose={() => setSelectedJobId(null)}
          bookmarked
          onToggleBookmark={() => {
            handleRemove(selectedJobId)
            setSelectedJobId(null)
          }}
        />
      )}
    </div>
  )
}

export default BookmarksPage
