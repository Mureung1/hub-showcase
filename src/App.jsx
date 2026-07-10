import { useMemo, useState } from 'react'
import './App.css'

const cafes = [
  {
    id: 'cafe-mellow',
    name: '멜로우 브루',
    currentStamps: 5,
    goalStamps: 10,
    reward: '아메리카노 1잔 무료',
  },
  {
    id: 'cafe-forest',
    name: '포레스트 커피',
    currentStamps: 2,
    goalStamps: 6,
    reward: '음료 2,000원 할인',
  },
  {
    id: 'cafe-daylight',
    name: '데이라이트 로스터스',
    currentStamps: 8,
    goalStamps: 8,
    reward: '시그니처 라떼 1잔',
  },
]

const coupons = [
  {
    id: 'coupon-1',
    cafeName: '데이라이트 로스터스',
    title: '시그니처 라떼 1잔',
    issuedAt: '2026-07-08',
    expiresAt: '2026-07-15',
  },
  {
    id: 'coupon-2',
    cafeName: '멜로우 브루',
    title: '아메리카노 1잔 무료',
    issuedAt: '2026-07-06',
    expiresAt: '2026-07-20',
  },
]

const notifications = [
  {
    id: 'notice-1',
    title: '쿠폰이 발급되었습니다',
    detail: '데이라이트 로스터스 쿠폰을 사용할 수 있어요.',
    isRead: false,
  },
  {
    id: 'notice-2',
    title: '쿠폰 만료일이 가까워졌습니다',
    detail: '7월 15일까지 사용 가능한 쿠폰이 있어요.',
    isRead: true,
  },
]

const tabs = [
  { id: 'home', label: '홈', symbol: 'H' },
  { id: 'coupons', label: '내 쿠폰', symbol: 'C' },
  { id: 'notifications', label: '알림', symbol: 'N' },
  { id: 'mypage', label: '마이페이지', symbol: 'M' },
]

function App() {
  const [role, setRole] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [couponSort, setCouponSort] = useState('newest')
  const [nickname, setNickname] = useState('테스트 손님')

  const sortedCoupons = useMemo(() => {
    return [...coupons].sort((first, second) => {
      const firstDate = new Date(
        couponSort === 'newest' ? first.issuedAt : first.expiresAt,
      )
      const secondDate = new Date(
        couponSort === 'newest' ? second.issuedAt : second.expiresAt,
      )

      return couponSort === 'newest'
        ? secondDate - firstDate
        : firstDate - secondDate
    })
  }, [couponSort])

  if (!role) {
    return <RoleLogin onSelectRole={setRole} />
  }

  if (role === 'owner') {
    return <OwnerDashboard onLogout={() => setRole(null)} />
  }

  return (
    <div className="app-shell customer-shell">
      <header className="customer-header">
        <div>
          <p className="eyebrow">손님 모드</p>
          <h1>{nickname}님</h1>
        </div>
        <button className="ghost-button" type="button" onClick={() => setRole(null)}>
          로그아웃
        </button>
      </header>

      <main className="customer-main">
        {activeTab === 'home' && <CustomerHome />}
        {activeTab === 'coupons' && (
          <CouponsView
            coupons={sortedCoupons}
            couponSort={couponSort}
            onChangeSort={setCouponSort}
          />
        )}
        {activeTab === 'notifications' && <NotificationsView />}
        {activeTab === 'mypage' && (
          <MyPage
            nickname={nickname}
            onChangeNickname={setNickname}
            onLogout={() => setRole(null)}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="손님 화면 하단 메뉴">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'nav-item active' : 'nav-item'}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-symbol" aria-hidden="true">
              {tab.symbol}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function RoleLogin({ onSelectRole }) {
  return (
    <main className="app-shell role-screen">
      <section className="role-intro">
        <p className="eyebrow">Cafe Stamp MVP</p>
        <h1>카페 스탬프를 웹에서 가볍게 관리해요</h1>
        <p>
          손님은 QR을 보여주고, 사장님은 가게 화면에서 스탬프를 적립합니다.
        </p>
      </section>

      <section className="role-actions" aria-label="로그인 역할 선택">
        <button
          className="role-card customer"
          type="button"
          onClick={() => onSelectRole('customer')}
        >
          <span>손님으로 로그인</span>
          <small>QR과 내 카페 목록을 바로 확인합니다</small>
        </button>
        <button
          className="role-card owner"
          type="button"
          onClick={() => onSelectRole('owner')}
        >
          <span>사장님으로 로그인</span>
          <small>가게 관리 화면으로 이동합니다</small>
        </button>
      </section>
    </main>
  )
}

function CustomerHome() {
  return (
    <section className="screen-stack">
      <div className="qr-panel">
        <div>
          <p className="eyebrow">적립용 QR</p>
          <h2>결제할 때 이 QR을 보여주세요</h2>
        </div>
        <div className="qr-code" aria-label="테스트 손님 적립용 QR 예시">
          <span />
          <span />
          <span />
          <span />
          <strong>QR</strong>
        </div>
      </div>

      <section>
        <div className="section-title">
          <h2>내 카페 목록</h2>
          <p>{cafes.length}곳에서 스탬프를 모으는 중</p>
        </div>
        <div className="card-list">
          {cafes.map((cafe) => (
            <article className="cafe-card" key={cafe.id}>
              <div>
                <h3>{cafe.name}</h3>
                <p>{cafe.reward}</p>
              </div>
              <div className="stamp-row" aria-label={`${cafe.currentStamps}개 적립`}>
                {Array.from({ length: cafe.goalStamps }).map((_, index) => (
                  <span
                    className={index < cafe.currentStamps ? 'stamp filled' : 'stamp'}
                    key={`${cafe.id}-${index}`}
                  />
                ))}
              </div>
              <p className="progress-text">
                {cafe.currentStamps} / {cafe.goalStamps}개
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function CouponsView({ coupons, couponSort, onChangeSort }) {
  return (
    <section className="screen-stack">
      <div className="section-title">
        <h2>내 쿠폰</h2>
        <p>지금 사용할 수 있는 쿠폰만 모아봤어요</p>
      </div>

      <div className="segmented-control" aria-label="쿠폰 정렬">
        <button
          className={couponSort === 'newest' ? 'active' : ''}
          type="button"
          onClick={() => onChangeSort('newest')}
        >
          최신순
        </button>
        <button
          className={couponSort === 'expires' ? 'active' : ''}
          type="button"
          onClick={() => onChangeSort('expires')}
        >
          만료 임박순
        </button>
      </div>

      <div className="card-list">
        {coupons.map((coupon) => (
          <article className="coupon-card" key={coupon.id}>
            <p>{coupon.cafeName}</p>
            <h3>{coupon.title}</h3>
            <span>{coupon.expiresAt}까지</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function NotificationsView() {
  return (
    <section className="screen-stack">
      <div className="section-title">
        <h2>알림</h2>
        <p>쿠폰 발급과 만료 소식을 확인하세요</p>
      </div>

      <div className="card-list">
        {notifications.map((notification) => (
          <article
            className={notification.isRead ? 'notice-card read' : 'notice-card'}
            key={notification.id}
          >
            <h3>{notification.title}</h3>
            <p>{notification.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function MyPage({ nickname, onChangeNickname, onLogout }) {
  return (
    <section className="screen-stack">
      <div className="section-title">
        <h2>마이페이지</h2>
        <p>테스트 손님 정보를 관리합니다</p>
      </div>

      <form className="profile-form">
        <label htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(event) => onChangeNickname(event.target.value)}
        />
      </form>

      <button className="primary-button" type="button" onClick={onLogout}>
        로그아웃
      </button>
    </section>
  )
}

function OwnerDashboard({ onLogout }) {
  return (
    <main className="app-shell owner-screen">
      <header className="customer-header">
        <div>
          <p className="eyebrow">사장님 모드</p>
          <h1>가게 관리</h1>
        </div>
        <button className="ghost-button" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </header>

      <section className="owner-panel">
        <div className="section-title">
          <h2>멜로우 브루</h2>
          <p>스탬프 조건과 보상 내용을 확인하고 손님 QR을 스캔합니다</p>
        </div>

        <dl className="rule-list">
          <div>
            <dt>스탬프 목표</dt>
            <dd>10개</dd>
          </div>
          <div>
            <dt>보상 내용</dt>
            <dd>아메리카노 1잔 무료</dd>
          </div>
        </dl>

        <button className="primary-button" type="button">
          손님 QR 스캔하기
        </button>
      </section>
    </main>
  )
}

export default App
