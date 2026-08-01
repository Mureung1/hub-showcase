import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { evaluateBookmarks, removeBookmark } from '../api/bookmarks'
import { useAuth } from '../context/AuthContext'
import { apiSpecFromForm, useAppState } from '../context/AppStateContext'
import { buildJobDisplay, CATEGORY_LABELS } from '../lib/gapAnalysis'
import { collectJobReferenceLinks, getTopTipLink } from '../constants/referenceLinks'
import JobCard from '../components/result/JobCard'
import JobDetailModal from '../components/result/JobDetailModal'
import ReferenceLinksModal from '../components/result/ReferenceLinksModal'
import BookmarkInsightBanner from '../components/result/BookmarkInsightBanner'
import EmptyState from '../components/result/EmptyState'

// 북마크한 공고는 "북마크했을 때의 스펙"이 아니라 Context에 지금 저장된 최신 스펙 기준으로 매번 재평가한다.
// 백엔드가 결과 화면(POST /api/gap-analysis)과 동일한 jobList 모양( { job, checks, overallMatch } )을 돌려주므로
// buildJobDisplay를 그대로 재사용해서 JobCard/JobDetailModal이 결과 화면과 완전히 같은 화면을 그린다.
function BookmarksPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { spec } = useAppState()

  const [jobList, setJobList] = useState([])
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [referenceLinksJobId, setReferenceLinksJobId] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setStatus('loading')
    evaluateBookmarks(apiSpecFromForm(spec))
      .then((res) => {
        if (cancelled) return
        setJobList(res.jobList)
        setStats(res.stats)
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

  // 백엔드는 improvementRanking에 category 키만 내려주고 한글 라벨은 안 붙여준다 — ResultPage와 동일한 이유로 여기서 붙인다.
  const displayStats = useMemo(() => {
    if (!stats) return null
    return {
      ...stats,
      improvementRanking: stats.improvementRanking.map((r) => ({ ...r, label: CATEGORY_LABELS[r.category] })),
    }
  }, [stats])

  const topTipLink = useMemo(() => {
    const topTip = stats?.improvementRanking[0]
    if (!topTip || topTip.count === 0) return undefined
    return getTopTipLink(jobList, topTip.category)
  }, [stats, jobList])

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
          <p className="loading-text">북마크한 공고를 다시 불러오는 중이에요…</p>
          <p className="loading-hint">
            한동안 사용하지 않았던 서버라면 깨어나는 데 30초~1분 정도 걸릴 수 있어요. 평소보다 오래 걸려도
            정상이니 조금만 기다려주세요!
          </p>
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
          description="갭 분석 결과에서 체크 아이콘을 눌러 공고를 저장해보세요."
          actionLabel="갭 분석 시작하기"
          onAction={() => navigate('/filter')}
        />
      )}

      {status === 'done' && displayJobs.length > 0 && (
        <BookmarkInsightBanner stats={displayStats} topTipLink={topTipLink} />
      )}

      {status === 'done' &&
        displayJobs.map((job) => (
          <div className="bookmark-job-row" key={job.job_id}>
            <JobCard
              job={job}
              onClick={() => setSelectedJobId(job.job_id)}
              bookmarked
              onToggleBookmark={() => handleRemove(job.job_id)}
            />
            {collectJobReferenceLinks(job.checklist).length > 0 && (
              <button
                type="button"
                className="reflinks-btn-large"
                onClick={() => setReferenceLinksJobId(job.job_id)}
                title="해당 공고에 필요한 사이트만 모아둡니다 🙂"
                aria-label="필요한 사이트 모아보기"
              >
                <span>🔗</span>
              </button>
            )}
          </div>
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

      {referenceLinksJobId && (
        <ReferenceLinksModal
          job={displayJobs.find((job) => job.job_id === referenceLinksJobId)}
          onClose={() => setReferenceLinksJobId(null)}
        />
      )}
    </div>
  )
}

export default BookmarksPage
