import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 가설 상세(검증결과 + 참조 + 드로어 + 리파인) 화면. 실제 UI는 Task 10에서 구현.
// 지금은 GET 호출만 트리거해 백엔드의 "방문 표시"(viewed_at) side effect가 동작하게 한다
// — 대시보드의 "검토 전" 태그가 실제 방문 여부로 사라지려면 이 호출이 필요하다.
function HypothesisDetailPage() {
  const { id, hid } = useParams<{ id: string; hid: string }>()

  useEffect(() => {
    if (!id || !hid) return
    fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hid}`).catch(() => {
      // Task 10에서 실제 UI가 붙기 전까지는 실패해도 화면에 영향 없음.
    })
  }, [id, hid])

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>가설 상세</h1>
        <p>
          프로젝트 {id} / 가설 {hid}
        </p>
      </header>
      <section className="card">
        <p className="field-label">검증결과·참조 시스템·드로어는 Task 10에서 구현됩니다.</p>
      </section>
    </div>
  )
}

export default HypothesisDetailPage
