import { useNavigate } from 'react-router-dom'

// TODO(#11): 완료 요약 + CTA로 완성 (다음 단계)
export default function CompleteScreen() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: 24 }}>
      <h1>준비 완료 (placeholder)</h1>
      <button type="button" onClick={() => navigate('/home')}>
        맞춤 지원금 보러가기
      </button>
    </div>
  )
}
