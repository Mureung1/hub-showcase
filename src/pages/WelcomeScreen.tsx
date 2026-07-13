import { useNavigate } from 'react-router-dom'

// TODO(#11): 와이어프레임 welcome 화면으로 완성 (다음 단계)
export default function WelcomeScreen() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: 24 }}>
      <h1>Welcome (placeholder)</h1>
      <button type="button" onClick={() => navigate('/onboarding/1')}>
        시작하기
      </button>
    </div>
  )
}
