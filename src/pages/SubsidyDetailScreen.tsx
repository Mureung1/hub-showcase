import { useNavigate, useParams } from 'react-router-dom'

/**
 * 상세화면 스텁 — 실제 구현은 수요일 이슈 #5 범위.
 * 오늘은 홈 카드 클릭 시 흐름이 깨지지 않도록 최소 화면만 제공.
 */
export default function SubsidyDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <div style={{ padding: 24 }}>
      <button type="button" onClick={() => navigate('/home')}>
        ← 목록으로
      </button>
      <h1>지원금 상세 (준비 중)</h1>
      <p>id: {id}</p>
      <p>상세 화면은 수요일(#5)에 구현됩니다.</p>
    </div>
  )
}
