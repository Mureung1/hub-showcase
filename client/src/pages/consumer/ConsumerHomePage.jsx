import { useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../../lib/session.js'

/*
 * 소비자 홈 (자리표시, T-03). 실제 딜 목록(M2)은 T-06에서 구현.
 * 현재는 라우트 골격과 세션 유지 확인용.
 */
function ConsumerHomePage() {
  const navigate = useNavigate()
  const session = getSession()

  const switchRole = () => {
    clearSession()
    navigate('/')
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>소비자 홈</h1>
      <p>{session?.nickname}님 (userId: {session?.userId})</p>
      <p style={{ color: '#8b95a1' }}>딜 목록(M2) · 상세·예약(M3) · 픽업코드(M4)가 이 자리에 들어옵니다.</p>
      <button type="button" onClick={switchRole}>역할 다시 선택</button>
    </main>
  )
}

export default ConsumerHomePage
