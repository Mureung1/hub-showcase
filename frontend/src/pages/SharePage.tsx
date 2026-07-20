import { useParams } from 'react-router-dom'

// 공유(읽기 전용, PDF 인쇄 대상) 화면. 실제 UI는 Task 13에서 구현.
function SharePage() {
  const { token } = useParams<{ token: string }>()

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>분석 결과 공유</h1>
        <p>공유 토큰 {token}</p>
      </header>
      <section className="card">
        <p className="field-label">읽기 전용 공유 화면은 Task 13에서 구현됩니다.</p>
      </section>
    </div>
  )
}

export default SharePage
