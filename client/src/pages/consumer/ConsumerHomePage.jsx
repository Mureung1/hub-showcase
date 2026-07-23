import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { getSession, clearSession } from '../../lib/session.js'
import { onForegroundMessage } from '../../lib/firebase.js'
import './ConsumerHomePage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

/*
 * M2 소비자 딜 목록 (T-06). 기준 위치 반경 내 활성 딜을 거리순으로.
 * 지도 전환은 Backlog, 리스트 우선. 상세·예약(M3)은 T-07/T-08.
 */
function ConsumerHomePage() {
  const navigate = useNavigate()
  const session = getSession()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    api
      .get('/deals/nearby')
      .then((res) => setDeals(res.data))
      .catch((err) => setError(err.response?.data?.message ?? '목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  // 앱이 열려 있을 때 도착한 푸시는 브라우저가 알림을 띄우지 않으므로 인앱 배너로 보여준다
  useEffect(() => {
    let unsubscribe
    onForegroundMessage((payload) => {
      setFlash({
        title: payload.notification?.title ?? '새 마감 할인',
        body: payload.notification?.body ?? '',
      })
      // 새 딜이 등록된 것이므로 목록도 갱신한다
      api
        .get('/deals/nearby')
        .then((res) => setDeals(res.data))
        .catch(() => {})
    }).then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe?.()
  }, [])

  const switchRole = () => {
    clearSession()
    navigate('/')
  }

  return (
    <main className="consumer-home">
      <header className="consumer-home__head">
        <div>
          <h1 className="consumer-home__title">내 주변 마감 할인</h1>
          <p className="consumer-home__sub">{session?.nickname}님 · 기준 위치 반경 이내</p>
        </div>
        <nav className="consumer-home__nav">
          <button type="button" onClick={() => navigate('/app/notifications')}>
            알림
          </button>
          <button type="button" onClick={() => navigate('/app/favorites')}>
            관심 가게
          </button>
          <button type="button" onClick={() => navigate('/app/settings')}>
            설정
          </button>
          <button type="button" onClick={() => navigate('/app/reservations')}>
            내 예약
          </button>
        </nav>
      </header>

      {flash && (
        <div className="consumer-home__flash" role="status">
          <div>
            <b>{flash.title}</b>
            <span>{flash.body}</span>
          </div>
          <button type="button" onClick={() => setFlash(null)} aria-label="알림 닫기">
            닫기
          </button>
        </div>
      )}

      {loading && <p className="consumer-home__msg">불러오는 중...</p>}
      {error && <p className="consumer-home__msg consumer-home__msg--error">{error}</p>}

      {!loading && !error && deals.length === 0 && (
        <p className="consumer-home__msg">
          반경 안에 진행 중인 마감 할인이 없어요. 조금 뒤에 다시 확인해보세요.
        </p>
      )}

      <ul className="consumer-home__deals">
        {deals.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="deal-card"
              onClick={() => navigate(`/app/deals/${d.id}`)}
            >
              <div className="deal-card__body">
                <b className="deal-card__name">{d.name}</b>
                <span className="deal-card__store">{d.storeName}</span>
                <span className="deal-card__price">
                  {d.salePrice.toLocaleString()}원 <s>{d.originalPrice.toLocaleString()}</s>
                </span>
              </div>
              <div className="deal-card__meta">
                <span className="deal-card__stock">{d.remainingQty}개 남음</span>
                <span className="deal-card__dim">
                  {d.distanceKm}km · ~{timeOf(d.pickupDeadlineAt)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="consumer-home__switch" onClick={switchRole}>
        역할 다시 선택
      </button>
    </main>
  )
}

export default ConsumerHomePage
