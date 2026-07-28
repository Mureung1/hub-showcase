import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../services'
import { StatusCard } from '../components/common'
import { buildQrValue } from '../utils/stamp'

const tabs = [
  { id: 'home', label: '홈', iconClass: 'home-icon', path: '/customer' },
  { id: 'coupons', label: '쿠폰', iconClass: 'ticket-icon', path: '/customer/coupons' },
  {
    id: 'notifications',
    label: '알림',
    iconClass: 'bell-icon',
    path: '/customer/notifications',
  },
  { id: 'mypage', label: '마이페이지', iconClass: 'user-icon', path: '/customer/mypage' },
]

const badgeThemes = ['brown', 'beige', 'green']
const rewardIcons = ['icon-coffee', 'icon-cake', 'icon-cup']

function CustomerLayout({ profile }) {
  const [nickname, setNickname] = useState('테스트 손님')
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getCustomerTab(location.pathname)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell customer-shell">
      <main className="customer-main">
        {activeTab === 'home' && <CustomerHome profile={profile} onLoadCustomer={setNickname} />}
        {activeTab === 'coupons' && <CustomerCoupons profile={profile} />}
        {activeTab === 'notifications' && <NotificationsView profile={profile} />}
        {activeTab === 'mypage' && (
          <MyPage
            nickname={nickname}
            onChangeNickname={setNickname}
            onLogout={handleLogout}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="손님 화면 하단 메뉴">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'nav-item active' : 'nav-item'}
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
          >
            <span className={`nav-icon ${tab.iconClass}`} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function getCustomerTab(pathname) {
  if (pathname === '/customer/coupons') {
    return 'coupons'
  }

  if (pathname === '/customer/notifications') {
    return 'notifications'
  }

  if (pathname === '/customer/mypage') {
    return 'mypage'
  }

  return 'home'
}

function CustomerCoupons({ profile }) {
  const [couponStatus, setCouponStatus] = useState('loading')
  const [couponError, setCouponError] = useState('')
  const [customerCoupons, setCustomerCoupons] = useState([])

  useEffect(() => {
    const loadCoupons = async () => {
      if (!profile?.customer_id) {
        setCouponStatus('error')
        setCouponError('손님 정보를 찾을 수 없습니다.')
        return
      }

      setCouponStatus('loading')
      setCouponError('')

      const { data, error } = await supabase
        .from('coupons')
        .select('id, title, barcode, status, issued_at, cafes(name)')
        .eq('customer_id', profile.customer_id)
        .eq('status', 'issued')
        .order('issued_at', { ascending: false })

      if (error) {
        setCouponStatus('error')
        setCouponError('쿠폰을 불러오지 못했습니다.')
        return
      }

      setCustomerCoupons(data ?? [])
      setCouponStatus('idle')
    }

    loadCoupons()
  }, [profile?.customer_id])

  if (couponStatus === 'loading') {
    return <StatusCard title="쿠폰을 불러오고 있습니다." />
  }

  if (couponStatus === 'error') {
    return <StatusCard title={couponError} />
  }

  return <CouponsView coupons={customerCoupons} />
}

function CustomerHome({ profile, onLoadCustomer }) {
  const navigate = useNavigate()
  const [customerStatus, setCustomerStatus] = useState('loading')
  const [customerError, setCustomerError] = useState('')
  const [customerData, setCustomerData] = useState(null)
  const [stampCards, setStampCards] = useState([])
  const [customerRefreshKey, setCustomerRefreshKey] = useState(0)

  useEffect(() => {
    const loadCustomerHome = async () => {
      if (!profile?.customer_id) {
        setCustomerStatus('error')
        setCustomerError('손님 프로필을 찾을 수 없습니다.')
        return
      }

      setCustomerStatus('loading')
      setCustomerError('')

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, member_number')
        .eq('id', profile.customer_id)
        .single()

      if (customerError) {
        setCustomerStatus('error')
        setCustomerError('손님 정보를 불러오지 못했습니다.')
        return
      }

      const { data: cards, error: cardsError } = await supabase
        .from('stamp_cards')
        .select('id, stamp_count, cafes(id, name, stamp_goal, reward_title)')
        .eq('customer_id', profile.customer_id)
        .order('stamp_count', { ascending: false })

      if (cardsError) {
        setCustomerStatus('error')
        setCustomerError('스탬프 정보를 불러오지 못했습니다.')
        return
      }

      const nextCards = (cards ?? []).map((card) => ({
        id: card.id,
        currentStamps: card.stamp_count,
        cafeId: card.cafes.id,
        name: card.cafes.name,
        goalStamps: card.cafes.stamp_goal,
        reward: card.cafes.reward_title,
      }))

      setCustomerData(customer)
      setStampCards(nextCards)
      setCustomerStatus('idle')
      onLoadCustomer(customer.name)
    }

    loadCustomerHome()
  }, [profile?.customer_id, onLoadCustomer, customerRefreshKey])

  if (customerStatus === 'loading') {
    return <StatusCard title="스탬프 정보를 불러오고 있습니다." />
  }

  if (customerStatus === 'error') {
    return <StatusCard title={customerError} />
  }

  return (
    <section className="customer-home-screen">
      <header className="customer-hero">
        <h1>
          <span>안녕하세요</span>
          <span>{customerData.name} 님</span>
        </h1>
        <button
          className="profile-button"
          type="button"
          aria-label="마이페이지로 이동"
          onClick={() => navigate('/customer/mypage')}
        >
          <span aria-hidden="true" />
        </button>
      </header>

      <article className="customer-qr-card">
        <div className="qr-card-head">
          <span className="tiny-qr-icon" aria-hidden="true" />
          <h2>내 QR 코드</h2>
        </div>
        <div className="qr-layout">
          <div className="qr-code" aria-label={`${customerData.member_number} 적립용 QR`}>
            <QRCodeSVG
              value={buildQrValue(customerData.member_number)}
              size={150}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="qr-meta">
            <span>회원번호</span>
            <strong>{customerData.member_number}</strong>
            <small>{buildQrValue(customerData.member_number)}</small>
          </div>
        </div>
      </article>

      <section className="content-section cafe-section">
        <div className="customer-section-head">
          <div>
            <h2>내 카페</h2>
            <p>{stampCards.length}곳에서 스탬프를 모으는 중</p>
          </div>
          <button
            className="refresh-chip"
            type="button"
            onClick={() => setCustomerRefreshKey((current) => current + 1)}
          >
            새로고침
          </button>
        </div>

        {stampCards.length === 0 ? (
          <StatusCard title="아직 연결된 카페 스탬프가 없습니다." />
        ) : (
          <div className="cafe-list">
            {stampCards.map((cafe, index) => (
              <CafeStampCard cafe={cafe} index={index} key={cafe.id} />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

function CafeStampCard({ cafe, index }) {
  const remainingStamps = Math.max(cafe.goalStamps - cafe.currentStamps, 0)
  const badgeTheme = badgeThemes[index % badgeThemes.length]
  const rewardIcon = rewardIcons[index % rewardIcons.length]

  return (
    <article className="cafe-card">
      <div className={`brand-badge ${badgeTheme}`}>
        <span className={`brand-icon mono-icon ${rewardIcon}`} aria-hidden="true" />
      </div>
      <div className="cafe-main">
        <h3>{cafe.name}</h3>
        <div className="stamp-strip" aria-label={`${cafe.currentStamps}개 적립`}>
          {Array.from({ length: cafe.goalStamps }).map((_, stampIndex) => (
            <span
              className={stampIndex < cafe.currentStamps ? 'stamp filled' : 'stamp'}
              key={`${cafe.cafeId}-${stampIndex}`}
            />
          ))}
        </div>
        <p>
          <strong>{cafe.currentStamps}</strong> / {cafe.goalStamps} · 쿠폰까지 {remainingStamps}개
        </p>
      </div>
      <div className="reward-side">
        <span className={`mono-icon ${rewardIcon}`} aria-hidden="true" />
        <p>{cafe.reward}</p>
      </div>
    </article>
  )
}

function CouponsView({ coupons }) {
  return (
    <section className="screen-stack customer-page-screen">
      <div className="page-header">
        <div>
          <h1>내 쿠폰</h1>
          <p>사용 가능한 쿠폰 {coupons.length}장</p>
        </div>
      </div>

      {coupons.length === 0 ? (
        <StatusCard title="아직 발급된 쿠폰이 없습니다." />
      ) : (
        <div className="coupon-cards">
          {coupons.map((coupon) => (
            <article className="ticket-card" key={coupon.id}>
              <div className="ticket-art">
                <span className="mono-icon icon-coffee" aria-hidden="true" />
              </div>
              <div className="ticket-info">
                <p>{coupon.cafes?.name}</p>
                <h2>{coupon.title}</h2>
                <span>{coupon.barcode}</span>
                <span>{new Date(coupon.issued_at).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function NotificationsView({ profile }) {
  const [noticeStatus, setNoticeStatus] = useState('loading')
  const [noticeError, setNoticeError] = useState('')
  const [customerNotifications, setCustomerNotifications] = useState([])

  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.customer_id) {
        setNoticeStatus('error')
        setNoticeError('손님 정보를 찾을 수 없습니다.')
        return
      }

      setNoticeStatus('loading')
      setNoticeError('')

      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, message, created_at')
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })

      if (error) {
        setNoticeStatus('error')
        setNoticeError('알림을 불러오지 못했습니다.')
        return
      }

      setCustomerNotifications(data ?? [])
      setNoticeStatus('idle')
    }

    loadNotifications()
  }, [profile?.customer_id])

  if (noticeStatus === 'loading') {
    return <StatusCard title="알림을 불러오고 있습니다." />
  }

  if (noticeStatus === 'error') {
    return <StatusCard title={noticeError} />
  }

  return (
    <section className="screen-stack customer-page-screen">
      <div className="page-header">
        <div>
          <h1>알림</h1>
          <p>스탬프와 쿠폰 소식을 확인하세요</p>
        </div>
      </div>

      {customerNotifications.length === 0 ? (
        <StatusCard title="아직 알림이 없습니다." />
      ) : (
        <div className="notice-list">
          {customerNotifications.map((notification) => (
            <article className="notice-card" key={notification.id}>
              <div
                className={
                  notification.type === 'coupon_issued'
                    ? 'notice-art coupon-mark'
                    : 'notice-art stamp-mark'
                }
                aria-hidden="true"
              />
              <div className="notice-copy">
                <h2>{notification.type === 'coupon_issued' ? '쿠폰 발급' : '스탬프 적립'}</h2>
                <p>{notification.message}</p>
                <time dateTime={notification.created_at}>
                  {new Date(notification.created_at).toLocaleString()}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function MyPage({ nickname, onChangeNickname, onLogout }) {
  return (
    <section className="screen-stack customer-page-screen">
      <div className="page-header simple">
        <h1>마이페이지</h1>
      </div>

      <article className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          <span />
        </div>
        <div className="profile-copy">
          <span className="login-chip">테스트 로그인</span>
          <p>테스트 사용자</p>
          <h2>{nickname}</h2>
          <small>손님 계정</small>
        </div>
      </article>

      <form className="profile-form">
        <label htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(event) => onChangeNickname(event.target.value)}
        />
      </form>

      <button className="logout-button" type="button" onClick={onLogout}>
        로그아웃
      </button>
    </section>
  )
}

export { CustomerLayout }
