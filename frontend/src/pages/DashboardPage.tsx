import { useParams } from 'react-router-dom'

// 대시보드(가설 리스트) 화면. 실제 UI는 Task 8에서 구현.
function DashboardPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>가설 검증 대시보드</h1>
        <p>프로젝트 {id}</p>
      </header>
      <section className="card">
        <p className="field-label">가설 리스트는 Task 8에서 구현됩니다.</p>
      </section>
    </div>
  )
}

export default DashboardPage
