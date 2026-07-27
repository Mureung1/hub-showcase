import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../services'
import { StatusCard } from '../components/common'
import { buildQrValue } from '../utils/stamp'

const tabs = [
  { id: 'home', label: '홈', symbol: 'H', path: '/customer' },
  { id: 'coupons', label: '쿠폰', symbol: 'C', path: '/customer/coupons' },
  {
    id: 'notifications',
    label: '알림',
    symbol: 'N',
    path: '/customer/notifications',
  },
  { id: 'mypage', label: '마이페이지', symbol: 'M', path: '/customer/mypage' },
]



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
      <header className="customer-header">
        <div>
          <p className="eyebrow">손님 모드</p>
          <h1>{nickname}님</h1>
        </div>
        <button className="ghost-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </header>

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
    return <StatusCard title="스탬프 정보를 불러오고 있어요" />
  }

  if (customerStatus === 'error') {
    return <StatusCard title={customerError} />
  }

  return (
    <section className="screen-stack">
      <div className="qr-panel">
        <div>
          <p className="eyebrow">적립용 QR</p>
          <h2>{customerData.member_number}</h2>
          <p>결제할 때 이 회원번호를 보여주세요.</p>
        </div>
        <div
          className="qr-code"
          aria-label={`${customerData.member_number} 적립용 QR `}
        >
          <QRCodeSVG
           value={buildQrValue(customerData.member_number)}
           size={164}
           level="M"
           includeMargin={false}/>
        </div>
      </div>

      <section>
        <div className="section-title">
          <h2>내 카페 목록</h2>
          <p>{stampCards.length}곳에서 스탬프를 모으는 중</p>
        </div>
        <button
          className="ghost-button refresh-button"
          type="button"
          onClick={() => setCustomerRefreshKey((current) => current + 1)}
        >
          새로고침
        </button>
        {stampCards.length === 0 ? (
          <StatusCard title="아직 연결된 카페 스탬프가 없습니다." />
        ) : (
          <div className="card-list">
            {stampCards.map((cafe) => (
              <article className="cafe-card" key={cafe.id}>
                <div>
                  <h3>{cafe.name}</h3>
                  <p>{cafe.reward}</p>
                </div>
                <div className="stamp-row" aria-label={`${cafe.currentStamps}개 적립`}>
                  {Array.from({ length: cafe.goalStamps }).map((_, index) => (
                    <span
                      className={index < cafe.currentStamps ? 'stamp filled' : 'stamp'}
                      key={`${cafe.cafeId}-${index}`}
                    />
                  ))}
                </div>
                <p className="progress-text">
                  {cafe.currentStamps} / {cafe.goalStamps}개
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}



function CouponsView({ coupons }) {
  return (
    <section className="screen-stack">
      <div className="section-title">
        <h2>쿠폰</h2>
        <p>발급된 쿠폰을 확인하세요.</p>
      </div>

      {coupons.length === 0 ? (
        <StatusCard title="아직 발급된 쿠폰이 없습니다." />
      ) : (
        <div className="card-list">
          {coupons.map((coupon) => (
            <article className="coupon-card" key={coupon.id}>
              <p>{coupon.cafes?.name}</p>
              <h3>{coupon.title}</h3>
              <span>{coupon.barcode}</span>
              <span>{new Date(coupon.issued_at).toLocaleDateString()}</span>
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
    <section className="screen-stack">
      <div className="section-title">
        <h2>알림</h2>
        <p>스탬프와 쿠폰 소식을 확인하세요.</p>
      </div>

      {customerNotifications.length === 0 ? (
        <StatusCard title="아직 알림이 없습니다." />
      ) : (
        <div className="card-list">
          {customerNotifications.map((notification) => (
            <article className="notice-card" key={notification.id}>
              <h3>{notification.type === 'coupon_issued' ? '쿠폰 발급' : '스탬프 적립'}</h3>
              <p>{notification.message}</p>
              <p>{new Date(notification.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}



function MyPage({ nickname, onChangeNickname, onLogout }) {
  return (
    <section className="screen-stack">
      <div className="section-title">
        <h2>마이페이지</h2>
        <p>테스트 손님 정보를 관리합니다.</p>
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



export { CustomerLayout }
