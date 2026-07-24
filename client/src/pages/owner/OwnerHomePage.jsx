import { useCallback, useEffect, useState } from 'react'
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
import { todaySummary, qtyByDeal, remainingTime } from '../../lib/ownerStats.js'
import PickupForm from '../../components/PickupForm.jsx'
import './OwnerHomePage.css'

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

const won = (n) => n.toLocaleString('ko-KR')

/*
 * W3 판매 현황 대시보드 (T-04·T-05·T-10·T-17).
 *
 * 카운터 PC에 상시 띄워두는 화면이라 가로형으로 구성한다(visual-기획서 §03).
 * 왼쪽은 상품 소진 현황, 오른쪽은 지금 처리할 일(픽업 확인 + 대기 목록).
 * 데이터는 서버 요약 API 없이 딜·예약 두 응답을 조합해 계산한다(lib/ownerStats).
 */
function OwnerHomePage() {
  const navigate = useNavigate()
  const session = getSession()
  const [store, setStore] = useState(null)
  const [deals, setDeals] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushState, setPushState] = useState(getPermission())
  const [flash, setFlash] = useState(null)
  const [unread, setUnread] = useState(0)

  // 픽업 처리·푸시 수신 직후에도 같은 경로로 갱신할 수 있게 분리해둔다
  const load = useCallback(async () => {
    const res = await api.get('/stores/me')
    setStore(res.data)

    const [dealsRes, rsvRes, notis] = await Promise.all([
      api.get('/deals', { params: { storeId: res.data.id } }),
      api.get('/reservations/store'),
      fetchNotifications(),
    ])
    setDeals(dealsRes.data)
    setReservations(rsvRes.data)
    setUnread(countUnread(notis))
  }, [])

  useEffect(() => {
    let cancelled = false

    const tick = () =>
      load().catch((err) => {
        if (cancelled) return
        if (err.response?.status === 404) {
          navigate('/owner/store/new', { replace: true })
          return
        }
        console.error(err)
      })

    tick().finally(() => {
      if (!cancelled) setLoading(false)
    })
    // 예약·알림 실시간 갱신 — MVP는 폴링(5초). SSE/WebSocket 전환은 Backlog
    const timer = setInterval(tick, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [load, navigate])

  // 권한이 이미 있으면 토큰을 조용히 재동기화한다 (버튼만 켜져 보이고 실제론 미등록인 경우 방지)
  useEffect(() => {
    syncTokenIfGranted().then(() => setPushState(getPermission()))
  }, [])

  // 대시보드를 보고 있을 때 도착한 예약 알림은 배너로 띄우고 현황도 즉시 갱신한다 (T-17)
  useEffect(() => {
    let unsubscribe
    onForegroundMessage((payload) => {
      setFlash({
        title: payload.notification?.title ?? '새 예약',
        body: payload.notification?.body ?? '',
      })
      setUnread((n) => n + 1)
      load().catch(() => {})
    }).then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe?.()
  }, [load])

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

  const summary = todaySummary(reservations, deals)
  const byDeal = qtyByDeal(reservations)
  const waiting = reservations.filter((r) => r.status === 'reserved')

  return (
    <main className="owner">
      <header className="owner__head">
        <div className="owner__identity">
          <h1 className="owner__title">{store?.name}</h1>
          <p className="owner__sub">
            {session?.nickname}님 · {store?.category} · {store?.address}
          </p>
        </div>
        <div className="owner__actions">
          {pushState !== 'unsupported' && pushState !== 'denied' && (
            <button type="button" className="owner__btn" onClick={turnOnPush}>
              {pushState === 'granted' ? '알림 재동기화' : '알림 켜기'}
            </button>
          )}
          <Link className="owner__btn owner__btn--noti" to="/owner/notifications">
            알림
            {unread > 0 && <span className="owner__badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <Link className="owner__btn" to="/owner/reservations">
            예약 현황
          </Link>
          <Link className="owner__btn owner__btn--primary" to="/owner/deals/new">
            + 상품 등록
          </Link>
        </div>
      </header>

      {flash && (
        <div className="owner__flash" role="status">
          <div>
            <b>{flash.title}</b>
            <span>{flash.body}</span>
          </div>
          <button type="button" onClick={() => setFlash(null)} aria-label="알림 닫기">
            닫기
          </button>
        </div>
      )}

      <section className="owner__stats" aria-label="오늘 현황">
        <div className="stat">
          <span className="stat__label">오늘 픽업 완료</span>
          <b className="stat__value">
            {summary.pickedQty}
            <small>개</small>
          </b>
        </div>
        <div className="stat">
          <span className="stat__label">오늘 매출</span>
          <b className="stat__value">
            {won(summary.revenue)}
            <small>원</small>
          </b>
        </div>
        <div className={`stat${summary.waitingCount > 0 ? ' stat--attention' : ''}`}>
          <span className="stat__label">픽업 대기</span>
          <b className="stat__value">
            {summary.waitingCount}
            <small>건</small>
          </b>
        </div>
        <div className="stat">
          <span className="stat__label">남은 재고</span>
          <b className="stat__value">
            {summary.remainingQty}
            <small>개</small>
          </b>
        </div>
      </section>

      <div className="owner__body">
        <section className="panel" aria-label="등록 상품 현황">
          <h2 className="panel__title">등록 상품 현황</h2>

          {deals.length === 0 ? (
            <p className="panel__empty">
              아직 등록한 마감 상품이 없어요. 첫 상품을 등록하면 근처 소비자에게 알림이 나갑니다.
            </p>
          ) : (
            <ul className="deals">
              {deals.map((d) => {
                const q = byDeal[d.id] ?? { reserved: 0, picked: 0 }
                const left = remainingTime(d.pickupDeadlineAt)
                const pct = (n) => (d.totalQty > 0 ? (n / d.totalQty) * 100 : 0)

                return (
                  <li key={d.id} className="deal">
                    <div className="deal__top">
                      <div className="deal__id">
                        <b className="deal__name">{d.name}</b>
                        <span className="deal__price">
                          {won(d.salePrice)}원 <s>{won(d.originalPrice)}</s>
                        </span>
                      </div>
                      <div className="deal__meta">
                        <b
                          className={
                            d.remainingQty === 0 ? 'deal__left deal__left--out' : 'deal__left'
                          }
                        >
                          {d.remainingQty}
                          <span>/{d.totalQty} 남음</span>
                        </b>
                        <span
                          className={`deal__time${left.urgent ? ' deal__time--urgent' : ''}${
                            left.expired ? ' deal__time--expired' : ''
                          }`}
                        >
                          {left.expired ? '마감' : left.text} · ~{timeOf(d.pickupDeadlineAt)}
                        </span>
                      </div>
                    </div>

                    <div
                      className="bar"
                      role="img"
                      aria-label={`총 ${d.totalQty}개 중 픽업 완료 ${q.picked}개, 예약 중 ${q.reserved}개`}
                    >
                      <span
                        className="bar__seg bar__seg--picked"
                        style={{ width: `${pct(q.picked)}%` }}
                      />
                      <span
                        className="bar__seg bar__seg--reserved"
                        style={{ width: `${pct(q.reserved)}%` }}
                      />
                    </div>

                    <div className="deal__legend">
                      <span className="dot dot--picked" />
                      픽업 완료 {q.picked}개
                      <span className="dot dot--reserved" />
                      예약 중 {q.reserved}개
                      <span className="dot dot--left" />
                      남음 {d.remainingQty}개
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="side">
          <section className="panel" aria-label="픽업 확인">
            <h2 className="panel__title">픽업 확인</h2>
            <p className="panel__sub">손님이 부른 4자리 코드를 입력하세요.</p>
            <PickupForm onSuccess={() => load().catch(() => {})} />
          </section>

          <section className="panel" aria-label="픽업 대기 목록">
            <h2 className="panel__title">
              픽업 대기 <b className="panel__count">{waiting.length}</b>
            </h2>

            {waiting.length === 0 ? (
              <p className="panel__empty">대기 중인 예약이 없습니다.</p>
            ) : (
              <ul className="waiting">
                {waiting.map((r) => (
                  <li key={r.id} className="waiting__row">
                    <span className="waiting__code">{r.pickupCode}</span>
                    <span className="waiting__info">
                      <b>
                        {r.dealName} × {r.qty}
                      </b>
                      <span>
                        {r.nickname} · {timeOf(r.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <button type="button" className="owner__switch" onClick={switchRole}>
        역할 다시 선택
      </button>
    </main>
  )
}

export default OwnerHomePage
