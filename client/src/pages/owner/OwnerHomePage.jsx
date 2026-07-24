import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/client.js'
import { getSession, clearSession } from '../../lib/session.js'
import {
  enablePush,
  getPermission,
  onForegroundMessage,
  syncTokenIfGranted,
} from '../../lib/firebase.js'
import { fetchNotifications, countUnread } from '../../lib/notifications.js'
import './OwnerHomePage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

/*
 * 사장님 홈 (T-04·T-05·T-10). 가게 없으면 W1로 분기, 있으면 딜 목록·예약 현황 표시.
 * 새 예약 알림(T-17)은 푸시로 받고, 앱을 보고 있을 땐 배너로 보여준다.
 */
function OwnerHomePage() {
  const navigate = useNavigate()
  const session = getSession()
  const [store, setStore] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushState, setPushState] = useState(getPermission())
  const [flash, setFlash] = useState(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let timer
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.get('/stores/me')
        if (cancelled) return
        setStore(res.data)
        const dealsRes = await api.get('/deals', { params: { storeId: res.data.id } })
        if (cancelled) return
        setDeals(dealsRes.data)
        // 안 읽은 알림 개수 — 푸시 전달·탭 포커스와 무관하게 배지로 알린다 (T-17)
        const notis = await fetchNotifications()
        if (cancelled) return
        setUnread(countUnread(notis))
      } catch (err) {
        if (err.response?.status === 404) {
          navigate('/owner/store/new', { replace: true })
          return
        }
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // 예약 현황·알림 실시간 갱신 — MVP는 폴링(5초). SSE/WebSocket 전환은 Backlog
    timer = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [navigate])

  // 권한이 이미 있으면 토큰을 조용히 재동기화한다 (버튼만 켜져 보이고 실제론 미등록인 경우 방지)
  useEffect(() => {
    syncTokenIfGranted().then(() => setPushState(getPermission()))
  }, [])

  // 대시보드를 보고 있을 때 도착한 예약 알림은 배너로 띄우고 목록도 즉시 갱신한다 (T-17)
  useEffect(() => {
    if (!store?.id) return
    let unsubscribe
    onForegroundMessage((payload) => {
      setFlash({
        title: payload.notification?.title ?? '새 예약',
        body: payload.notification?.body ?? '',
      })
      setUnread((n) => n + 1)
      api
        .get('/deals', { params: { storeId: store.id } })
        .then((res) => setDeals(res.data))
        .catch(() => {})
    }).then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe?.()
  }, [store?.id])

  const turnOnPush = async () => {
    const res = await enablePush()
    setPushState(getPermission())
    if (!res.ok && res.reason === 'denied') {
      setFlash({
        title: '알림이 차단돼 있어요',
        body: '주소창 자물쇠 아이콘에서 알림을 허용으로 바꿔주세요.',
      })
    }
  }

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
        <div className="owner-home__actions">
          {pushState !== 'unsupported' && pushState !== 'denied' && (
            <button type="button" className="owner-home__pickup" onClick={turnOnPush}>
              {pushState === 'granted' ? '알림 재동기화' : '알림 켜기'}
            </button>
          )}
          <Link className="owner-home__pickup" to="/owner/reservations">
            예약 현황
          </Link>
          <Link className="owner-home__pickup owner-home__noti" to="/owner/notifications">
            알림
            {unread > 0 && <span className="owner-home__badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <Link className="owner-home__pickup" to="/owner/pickup">
            픽업 확인
          </Link>
          <Link className="owner-home__add" to="/owner/deals/new">
            + 상품 등록
          </Link>
        </div>
      </header>

      {flash && (
        <div className="owner-home__flash" role="status">
          <div>
            <b>{flash.title}</b>
            <span>{flash.body}</span>
          </div>
          <button type="button" onClick={() => setFlash(null)} aria-label="알림 닫기">
            닫기
          </button>
        </div>
      )}

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
                <b className={d.remainingQty === 0 ? 'owner-home__soldout' : undefined}>
                  {d.remainingQty}/{d.totalQty} 남음
                </b>
                <span>
                  예약 {d.reservedCount ?? 0} · 픽업 {d.pickedCount ?? 0}
                </span>
                <span>~{timeOf(d.pickupDeadlineAt)}</span>
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
