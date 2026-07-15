import { useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../../lib/session.js'

/*
 * 사장님 홈 (자리표시, T-03). 실제 대시보드(W3)는 T-10에서 구현.
 * 현재는 라우트 골격과 세션 유지 확인용.
 */
function OwnerHomePage() {
  const navigate = useNavigate()
  const session = getSession()

  const switchRole = () => {
    clearSession()
    navigate('/')
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>사장님 홈</h1>
      <p>{session?.nickname}님 (userId: {session?.userId})</p>
      <p style={{ color: '#8b95a1' }}>가게 등록(W1) · 상품 등록(W2) · 대시보드(W3)가 이 자리에 들어옵니다.</p>
      <button type="button" onClick={switchRole}>역할 다시 선택</button>
    </main>
  )
}

export default OwnerHomePage
