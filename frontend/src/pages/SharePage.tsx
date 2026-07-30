import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReportHypothesisCards, { type ReportHypothesis } from '../components/ReportHypothesisCards'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface Project {
  id: string
  title: string
  problem_definition: string
}

interface ReportData {
  project: Project
  hypotheses: ReportHypothesis[]
}

// 공유 화면은 읽기 전용이라 드로어를 쓰지 않는다(position:fixed 오버레이는 인쇄에 안 나옴).
// 항상 프로젝트 전체 가설을 보여준다 — 고정 URL이라 체크박스 같은 일시적 선택 상태를 반영할 수 없다.
// 일부 가설만 인쇄하고 싶으면 PrintPreviewPage(/projects/:id/print)를 사용한다.
function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE_URL}/api/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '공유 링크를 불러오지 못했습니다.')
        }
        return res.json()
      })
      .then((body: ReportData) => setData(body))
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'))
  }, [token])

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
        <p className="detail-empty">읽기 전용 공유 화면입니다. 인쇄(Ctrl/Cmd+P)로 PDF 저장이 가능합니다.</p>
      </header>
      <header className="page-header print-only">
        <h1>{data.project.title}</h1>
        <p>{data.project.problem_definition}</p>
      </header>

      <ReportHypothesisCards hypotheses={data.hypotheses} />
    </div>
  )
}

export default SharePage
