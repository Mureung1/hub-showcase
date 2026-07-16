import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { getSession, clearSession } from '../../lib/session.js'

/*
 * 사장님 홈 (T-04). 가게 등록 여부로 분기:
 *   없으면 → 가게 등록(W1)으로. 있으면 → 가게 정보 표시 (대시보드 W3는 T-10).
 */
function OwnerHomePage() {
  const navigate = useNavigate()
  const session = getSession()
  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/stores/me')
      .then((res) => setStore(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          navigate('/owner/store/new', { replace: true })
        } else {
          console.error(err)
        }
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const switchRole = () => {
    clearSession()
    navigate('/')
  }

  if (loading) return null

  return (
    <main style={{ padding: 24 }}>
      <h1>{store?.name}</h1>
      <p>
        {session?.nickname}님 · {store?.category} · {store?.address}
      </p>
      <p style={{ color: '#8b95a1' }}>
        상품 등록(W2) · 판매 현황 대시보드(W3)가 이 자리에 들어옵니다.
      </p>
      <button type="button" onClick={switchRole}>역할 다시 선택</button>
    </main>
  )
}

export default OwnerHomePage
