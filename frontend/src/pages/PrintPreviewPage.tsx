import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ReportHypothesisCards, { type ReportHypothesis } from '../components/ReportHypothesisCards'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

interface Project {
  id: string
  title: string
  problem_definition: string
}

interface ReportData {
  project: Project
  hypotheses: ReportHypothesis[]
}

// 체크박스로 선택한 가설만(또는 전체) PDF로 인쇄하기 위한 미리보기 화면.
// 공유 링크(/share/:token)는 고정 URL이라 체크박스 선택을 반영할 수 없어서 별도로 둔다.
// 소유자가 대시보드에서 바로 여는 화면이라 토큰이 아니라 실제 project id를 쓴다.
function PrintPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const hypothesisIds = searchParams.get('hypothesis_ids')

  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const url = new URL(`${API_BASE_URL}/api/projects/${id}/print`)
    if (hypothesisIds) url.searchParams.set('hypothesis_ids', hypothesisIds)

    fetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '리포트를 불러오지 못했습니다.')
        }
        return res.json()
      })
      .then((body: ReportData) => setData(body))
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'))
  }, [id, hypothesisIds])

  // 데이터가 렌더된 뒤 자동으로 인쇄 대화상자를 띄운다. 취소해도 화면은 그대로 남아 재인쇄 가능.
  useEffect(() => {
    if (!data) return
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [data])

  if (error) {
    return (
      <div className="app-shell">
        <p className="error-text">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="app-shell">
        <p className="field-label">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="app-shell share-page">
      <header className="page-header no-print">
        <h1>{data.project.title}</h1>
        <p>{data.project.problem_definition}</p>
        <p className="detail-empty">
          인쇄 미리보기입니다{hypothesisIds ? ` (선택한 가설 ${data.hypotheses.length}개만 포함)` : ''}. 인쇄 대화상자가
          자동으로 열립니다 — 취소했다면 Ctrl/Cmd+P로 다시 시도하세요.
        </p>
        <button type="button" className="btn-add" onClick={() => window.print()}>
          다시 인쇄
        </button>
      </header>
      <header className="page-header print-only">
        <h1>{data.project.title}</h1>
        <p>{data.project.problem_definition}</p>
      </header>

      <ReportHypothesisCards hypotheses={data.hypotheses} />
    </div>
  )
}

export default PrintPreviewPage
