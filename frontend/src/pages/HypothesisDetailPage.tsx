import { useParams } from 'react-router-dom'

// 가설 상세(검증결과 + 참조 + 드로어 + 리파인) 화면. 실제 UI는 Task 10에서 구현.
function HypothesisDetailPage() {
  const { id, hid } = useParams<{ id: string; hid: string }>()

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
