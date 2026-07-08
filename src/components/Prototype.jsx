import { useMemo, useState } from 'react'
import './Prototype.css'

/*
 * 핵심 루프 프로토타입 (인메모리 상태)
 *   사장님 상품 등록 → 소비자 목록 노출 → 예약(재고 차감·선착순) → 픽업코드
 *   → 사장님 픽업 확인(코드 검증·완료). 결제는 앱 밖(현장결제).
 */

const CATEGORIES = ['베이커리', '디저트', '신선식품', '반찬', '음료']
const CATEGORY_EMOJI = {
  베이커리: '🥐',
  디저트: '🍰',
  신선식품: '🥬',
  반찬: '🍱',
  음료: '🥤',
}

const STORE_NAME = '규현 베이커리'

let _id = 100
const nextId = () => ++_id

const genCode = (taken) => {
  let code
  do {
    code = String(Math.floor(1000 + Math.random() * 9000))
  } while (taken.includes(code))
  return code
}

const seedDeals = () => [
  {
    id: nextId(),
    store: STORE_NAME,
    name: '크루아상',
    category: '베이커리',
    original: 4000,
    sale: 2000,
    total: 5,
    remaining: 2,
    pickupBy: '21:00',
    distanceKm: 0.4,
  },
  {
    id: nextId(),
    store: '학교앞 델리',
    name: '샌드위치',
    category: '신선식품',
    original: 6000,
    sale: 3500,
    total: 4,
    remaining: 4,
    pickupBy: '20:30',
    distanceKm: 1.1,
  },
  {
    id: nextId(),
    store: '모퉁이 디저트',
    name: '조각 케이크',
    category: '디저트',
    original: 7000,
    sale: 3000,
    total: 3,
    remaining: 0,
    pickupBy: '22:00',
    distanceKm: 0.8,
  },
]

const won = (n) => n.toLocaleString('ko-KR')

/* ---------- 공통 작은 컴포넌트 ---------- */

function Stepper({ value, setValue, max }) {
  return (
    <div className="pt-stepper">
      <button type="button" onClick={() => setValue(Math.max(1, value - 1))} aria-label="수량 감소">
        −
      </button>
      <span>{value}</span>
      <button
        type="button"
        onClick={() => setValue(Math.min(max, value + 1))}
        aria-label="수량 증가"
      >
        +
      </button>
    </div>
  )
}

function Price({ sale, original }) {
  return (
    <span className="pt-price">
      <b>{won(sale)}원</b> <s>{won(original)}</s>
    </span>
  )
}

/* ---------- 소비자 (모바일) ---------- */

function ConsumerApp({ deals, reservations, onReserve }) {
  const [view, setView] = useState('home') // home | detail | code | mine
  const [selectedId, setSelectedId] = useState(null)
  const [qty, setQty] = useState(1)
  const [lastCode, setLastCode] = useState(null)

  const radiusKm = 2
  const nearby = deals
    .filter((d) => d.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  const selected = deals.find((d) => d.id === selectedId)

  const openDetail = (id) => {
    setSelectedId(id)
    setQty(1)
    setView('detail')
  }

  const doReserve = () => {
    const res = onReserve(selected.id, qty)
    if (!res.ok) {
      alert(res.message)
      return
    }
    setLastCode(res.code)
    setView('code')
  }

  const lastReservation = reservations.find((r) => r.code === lastCode)

  return (
    <div className="phone">
      <div className="phone__notch">
        <span>9:41</span>
        <span>마감할인</span>
        <span>▮▮ ▲</span>
      </div>

      <div className="phone__body">
        {view === 'home' && (
          <>
            <div className="phone__head">
              <div>
                <div className="phone__title">내 주변 마감 할인</div>
                <div className="phone__sub">현재 위치 · 반경 {radiusKm}km 이내</div>
              </div>
            </div>
            <div className="deal-list">
              {nearby.map((d) => {
                const sold = d.remaining === 0
                return (
                  <button
                    type="button"
                    key={d.id}
                    className={'deal-card' + (sold ? ' deal-card--sold' : '')}
                    onClick={() => !sold && openDetail(d.id)}
                    disabled={sold}
                  >
                    <span className="deal-thumb">{CATEGORY_EMOJI[d.category]}</span>
                    <span className="deal-meta">
                      <span className="deal-name">{d.name}</span>
                      <span className="deal-store">{d.store}</span>
                      <Price sale={d.sale} original={d.original} />
                    </span>
                    <span className="deal-side">
                      {sold ? (
                        <span className="pill pill--sold">품절</span>
                      ) : (
                        <span className="pill pill--stock">{d.remaining}개 남음</span>
                      )}
                      <span className="deal-dim">
                        {d.distanceKm}km · ~{d.pickupBy}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {view === 'detail' && selected && (
          <>
            <button type="button" className="linkback" onClick={() => setView('home')}>
              ← 목록
            </button>
            <div className="detail-hero">{CATEGORY_EMOJI[selected.category]}</div>
            <div className="phone__title">{selected.name}</div>
            <div className="phone__sub">
              {selected.store} · {selected.distanceKm}km
            </div>
            <div className="kv-list">
              <div className="kv">
                <span>가격</span>
                <span>
                  <Price sale={selected.sale} original={selected.original} />
                </span>
              </div>
              <div className="kv">
                <span>남은 수량</span>
                <span>{selected.remaining}개</span>
              </div>
              <div className="kv">
                <span>픽업 시간</span>
                <span>~ {selected.pickupBy}</span>
              </div>
            </div>
            <div className="detail-foot">
              <div className="detail-qty">
                <span>수량</span>
                <Stepper value={qty} setValue={setQty} max={selected.remaining} />
              </div>
              <button type="button" className="btn btn--primary" onClick={doReserve}>
                예약하기 · 현장결제
              </button>
            </div>
          </>
        )}

        {view === 'code' && lastReservation && (
          <>
            <div className="phone__title">픽업코드</div>
            <div className="phone__sub">매장에서 이 코드를 보여주세요.</div>
            <div className="code-box">{lastReservation.code}</div>
            <span className="pill pill--ok">예약 완료</span>
            <div className="kv-list" style={{ marginTop: 14 }}>
              <div className="kv">
                <span>상품</span>
                <span>
                  {lastReservation.name} × {lastReservation.qty}
                </span>
              </div>
              <div className="kv">
                <span>가게</span>
                <span>{lastReservation.store}</span>
              </div>
              <div className="kv">
                <span>픽업 마감</span>
                <span>오늘 {lastReservation.pickupBy}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginTop: 16 }}
              onClick={() => setView('home')}
            >
              목록으로
            </button>
          </>
        )}

        {view === 'mine' && (
          <>
            <div className="phone__title">내 예약</div>
            <div className="phone__sub" style={{ marginBottom: 12 }}>
              픽업 시 코드를 제시하세요.
            </div>
            {reservations.length === 0 && <div className="empty">예약 내역이 없어요.</div>}
            <div className="deal-list">
              {reservations.map((r) => (
                <div key={r.id} className="mine-row">
                  <span className="mine-code">{r.code}</span>
                  <span className="deal-meta">
                    <span className="deal-name">
                      {r.name} × {r.qty}
                    </span>
                    <span className="deal-store">{r.store}</span>
                  </span>
                  <span
                    className={'pill ' + (r.status === 'picked' ? 'pill--ok' : 'pill--stock')}
                  >
                    {r.status === 'picked' ? '픽업완료' : '예약됨'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="phone__nav">
        <button
          type="button"
          className={view === 'home' || view === 'detail' ? 'on' : ''}
          onClick={() => setView('home')}
        >
          홈
        </button>
        <button
          type="button"
          className={view === 'mine' ? 'on' : ''}
          onClick={() => setView('mine')}
        >
          내 예약
        </button>
      </div>
    </div>
  )
}

/* ---------- 사장님 (웹앱) ---------- */

function OwnerApp({ deals, reservations, onAddDeal, onConfirmPickup }) {
  const [tab, setTab] = useState('dashboard') // dashboard | new | pickup
  const myDeals = deals.filter((d) => d.store === STORE_NAME)

  const reservedCount = (dealId) =>
    reservations.filter((r) => r.dealId === dealId).length

  return (
    <div className="web">
      <div className="web__bar">
        <div className="web__dots">
          <i />
          <i />
          <i />
        </div>
        <div className="web__url">app.service.kr/owner</div>
      </div>

      <div className="web__tabs">
        <button
          type="button"
          className={tab === 'dashboard' ? 'on' : ''}
          onClick={() => setTab('dashboard')}
        >
          판매 현황
        </button>
        <button type="button" className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>
          상품 등록
        </button>
        <button
          type="button"
          className={tab === 'pickup' ? 'on' : ''}
          onClick={() => setTab('pickup')}
        >
          픽업 확인
        </button>
      </div>

      <div className="web__body">
        {tab === 'dashboard' && (
          <>
            <div className="web__head">
              <div>
                <div className="web__title">판매 현황 · {STORE_NAME}</div>
                <div className="web__sub">남은 수량과 예약이 실시간으로 반영됩니다.</div>
              </div>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setTab('new')}>
                + 상품 등록
              </button>
            </div>
            <table className="owner-table">
              <thead>
                <tr>
                  <th>상품</th>
                  <th>할인가</th>
                  <th>남은/총</th>
                  <th>예약</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {myDeals.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="ot-thumb">{CATEGORY_EMOJI[d.category]}</span>
                      {d.name}
                    </td>
                    <td>{won(d.sale)}원</td>
                    <td className="num">
                      {d.remaining}/{d.total}
                    </td>
                    <td className="num">{reservedCount(d.id)}</td>
                    <td>
                      {d.remaining === 0 ? (
                        <span className="pill pill--sold">품절</span>
                      ) : (
                        <span className="pill pill--ok">판매중</span>
                      )}
                    </td>
                  </tr>
                ))}
                {myDeals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      등록된 상품이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === 'new' && <NewDealForm onAdd={(d) => { onAddDeal(d); setTab('dashboard') }} />}

        {tab === 'pickup' && (
          <PickupPanel reservations={reservations} onConfirm={onConfirmPickup} />
        )}
      </div>
    </div>
  )
}

function NewDealForm({ onAdd }) {
  const [form, setForm] = useState({
    name: '',
    category: '베이커리',
    total: 5,
    original: 4000,
    sale: 2000,
    pickupBy: '21:00',
  })

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('상품명을 입력하세요.')
      return
    }
    const total = Number(form.total)
    onAdd({
      id: nextId(),
      store: STORE_NAME,
      name: form.name.trim(),
      category: form.category,
      original: Number(form.original),
      sale: Number(form.sale),
      total,
      remaining: total,
      pickupBy: form.pickupBy,
      distanceKm: 0.3,
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="web__title" style={{ marginBottom: 4 }}>
        마감 상품 등록
      </div>
      <div className="web__sub" style={{ marginBottom: 16 }}>
        등록 즉시 반경 내 소비자 목록에 노출됩니다.
      </div>

      <label className="field">
        <span>상품명</span>
        <input value={form.name} onChange={set('name')} placeholder="예) 소금빵" />
      </label>

      <div className="field-row">
        <label className="field">
          <span>카테고리</span>
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>수량</span>
          <input type="number" min="1" value={form.total} onChange={set('total')} />
        </label>
        <label className="field">
          <span>픽업 마감</span>
          <input value={form.pickupBy} onChange={set('pickupBy')} placeholder="21:00" />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>원가</span>
          <input type="number" min="0" value={form.original} onChange={set('original')} />
        </label>
        <label className="field">
          <span>할인가</span>
          <input type="number" min="0" value={form.sale} onChange={set('sale')} />
        </label>
      </div>

      <button type="submit" className="btn btn--primary">
        등록 · 근처 소비자에 노출
      </button>
    </form>
  )
}

function PickupPanel({ reservations, onConfirm }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)

  const check = () => {
    const res = onConfirm(code.trim())
    setResult(res)
    if (res.ok) setCode('')
  }

  return (
    <div className="form">
      <div className="web__title" style={{ marginBottom: 4 }}>
        픽업 확인
      </div>
      <div className="web__sub" style={{ marginBottom: 16 }}>
        손님이 제시한 픽업코드를 입력하세요.
      </div>

      <div className="pickup-input">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="4자리 코드"
          maxLength={4}
          inputMode="numeric"
        />
        <button type="button" className="btn btn--primary btn--sm" onClick={check}>
          확인
        </button>
      </div>

      {result && (
        <div className={'pickup-result ' + (result.ok ? 'ok' : 'bad')}>
          {result.ok ? (
            <>
              <div className="kv">
                <span>상품</span>
                <span>
                  {result.reservation.name} × {result.reservation.qty}
                </span>
              </div>
              <div className="kv">
                <span>상태</span>
                <span className="pill pill--ok">픽업 완료 처리됨</span>
              </div>
            </>
          ) : (
            result.message
          )}
        </div>
      )}

      <div className="web__sub" style={{ marginTop: 18 }}>
        대기 중인 예약: {reservations.filter((r) => r.status === 'reserved').length}건
      </div>
    </div>
  )
}

/* ---------- 루트: 공유 상태 ---------- */

export default function Prototype() {
  const [role, setRole] = useState('consumer') // consumer | owner
  const [deals, setDeals] = useState(seedDeals)
  const [reservations, setReservations] = useState([])

  const addDeal = (deal) => setDeals((prev) => [deal, ...prev])

  // 예약: 재고를 원자적으로 차감(선착순). 재고 부족 시 실패.
  const reserve = (dealId, qty) => {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.remaining < qty) {
      return { ok: false, message: '죄송해요, 방금 품절됐어요.' }
    }
    const code = genCode(reservations.map((r) => r.code))
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, remaining: d.remaining - qty } : d)),
    )
    const reservation = {
      id: nextId(),
      dealId,
      code,
      qty,
      name: deal.name,
      store: deal.store,
      pickupBy: deal.pickupBy,
      status: 'reserved',
    }
    setReservations((prev) => [reservation, ...prev])
    return { ok: true, code }
  }

  // 픽업 확인: 코드로 예약 검증 후 완료 처리.
  const confirmPickup = (code) => {
    const reservation = reservations.find((r) => r.code === code && r.status === 'reserved')
    if (!reservation) {
      return { ok: false, message: '유효하지 않거나 이미 처리된 코드입니다.' }
    }
    setReservations((prev) =>
      prev.map((r) => (r.id === reservation.id ? { ...r, status: 'picked' } : r)),
    )
    return { ok: true, reservation }
  }

  const stats = useMemo(() => {
    const active = deals.filter((d) => d.remaining > 0).length
    const reserved = reservations.filter((r) => r.status === 'reserved').length
    const picked = reservations.filter((r) => r.status === 'picked').length
    return { active, reserved, picked }
  }, [deals, reservations])

  return (
    <main className="pt">
      <header className="pt__top">
        <div className="pt__brand">
          <span className="pt__logo">🥐</span>
          <div>
            <div className="pt__brandname">마감할인 · 프로토타입</div>
            <div className="pt__tagline">등록 → 예약 → 픽업 핵심 루프 데모</div>
          </div>
        </div>
        <div className="pt__roles">
          <button
            type="button"
            className={role === 'consumer' ? 'on' : ''}
            onClick={() => setRole('consumer')}
          >
            소비자 · 모바일
          </button>
          <button
            type="button"
            className={role === 'owner' ? 'on' : ''}
            onClick={() => setRole('owner')}
          >
            사장님 · 웹앱
          </button>
        </div>
      </header>

      <div className="pt__stats">
        <span>
          판매중 <b>{stats.active}</b>
        </span>
        <span>
          예약 <b>{stats.reserved}</b>
        </span>
        <span>
          픽업완료 <b>{stats.picked}</b>
        </span>
      </div>

      <div className="pt__stage">
        {role === 'consumer' ? (
          <ConsumerApp deals={deals} reservations={reservations} onReserve={reserve} />
        ) : (
          <OwnerApp
            deals={deals}
            reservations={reservations}
            onAddDeal={addDeal}
            onConfirmPickup={confirmPickup}
          />
        )}
      </div>

      <p className="pt__hint">
        💡 사장님으로 상품을 등록하면 소비자 목록에 바로 노출돼요. 소비자로 예약하면 재고가
        줄고 픽업코드가 발급되며, 그 코드를 사장님 <b>픽업 확인</b>에 입력하면 완료됩니다.
      </p>
    </main>
  )
}
