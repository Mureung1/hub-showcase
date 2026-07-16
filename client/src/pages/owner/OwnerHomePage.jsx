import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/client.js'
import { getSession, clearSession } from '../../lib/session.js'
import './OwnerHomePage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

/*
 * 사장님 홈 (T-04·T-05). 가게 없으면 W1로 분기, 있으면 딜 목록 표시.
 * 실시간 갱신(폴링)·예약 수 표시는 W3(T-10)에서 확장.
 */
function OwnerHomePage() {
  const navigate = useNavigate()
  const session = getSession()
  const [store, setStore] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/stores/me')
      .then(async (res) => {
        setStore(res.data)
        const dealsRes = await api.get('/deals', { params: { storeId: res.data.id } })
        setDeals(dealsRes.data)
      })
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
    <main className="owner-home">
      <header className="owner-home__head">
        <div>
          <h1 className="owner-home__title">{store?.name}</h1>
          <p className="owner-home__sub">
            {session?.nickname}님 · {store?.category} · {store?.address}
          </p>
        </div>
        <Link className="owner-home__add" to="/owner/deals/new">
          + 상품 등록
        </Link>
      </header>

      {deals.length === 0 ? (
        <p className="owner-home__empty">
          아직 등록한 마감 상품이 없어요. 첫 상품을 등록하면 근처 소비자에게 알림이 나갑니다.
        </p>
      ) : (
        <ul className="owner-home__deals">
          {deals.map((d) => (
            <li key={d.id} className="owner-home__deal">
              <div className="owner-home__deal-main">
                <b>{d.name}</b>
                <span className="owner-home__deal-price">
                  {d.salePrice.toLocaleString()}원 <s>{d.originalPrice.toLocaleString()}</s>
                </span>
              </div>
              <div className="owner-home__deal-side">
                <b>
                  {d.remainingQty}/{d.totalQty} 남음
                </b>
                <span>
                  ~{timeOf(d.pickupDeadlineAt)} · {d.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="owner-home__switch" onClick={switchRole}>
        역할 다시 선택
      </button>
    </main>
  )
}

export default OwnerHomePage
