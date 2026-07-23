import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './services'
import './App.css'

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

function buildQrValue(memberNumber) {
  return `cafe-stamp:${memberNumber}`
}

function parseMemberLookupInput(input) {
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return {
      memberNumber: '',
      error: '회원번호 또는 QR 값을 입력해 주세요.',
    }
  }

  if (trimmedInput.startsWith('cafe-stamp:')) {
    const memberNumber = trimmedInput.replace('cafe-stamp:', '').trim()

    if (!memberNumber) {
      return {
        memberNumber: '',
        error: 'QR 안에 회원번호가 없습니다.',
      }
    }

    return {
      memberNumber,
      error: '',
    }
  }

  if (trimmedInput.includes(':')) {
    return {
      memberNumber: '',
      error: '지원하지 않는 QR 형식입니다.',
    }
  }

  return {
    memberNumber: trimmedInput,
    error: '',
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading')
  const [profile, setProfile] = useState(null)

  const loadProfile = async (nextSession) => {
    if (!nextSession) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role, customer_id, cafe_id')
      .eq('id', nextSession.user.id)
      .single()

    if (error) {
      setProfile(null)
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()

      setSession(data.session)
      await loadProfile(data.session)
      setAuthStatus('idle')
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await loadProfile(nextSession)
      setAuthStatus('idle')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  if (authStatus === 'loading') {
    return (
      <main className="app-shell role-screen">
        <section className="role-intro">
          <p className="eyebrow">Cafe Stamp MVP</p>
          <h1>로그인 상태를 확인하고 있어요</h1>
        </section>
      </main>
    )
  }

  const isLoggedIn = Boolean(session)
  const userRole = profile?.role
  const homePath = userRole === 'owner' ? '/owner' : '/customer'

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to={homePath} replace /> : <RoleLogin />}
      />
      <Route
        path="/customer"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/coupons"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/notifications"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/mypage"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="owner">
            <OwnerDashboard profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function ProtectedRoute({ children, isLoggedIn, userRole, allowedRole }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (userRole && userRole !== allowedRole) {
    return (
      <Navigate
        to={userRole === 'owner' ? '/owner' : '/customer'}
        replace
      />
    )
  }

  return children
}

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

function RoleLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginStatus, setLoginStatus] = useState('idle')
  const [loginError, setLoginError] = useState('')
  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginStatus('loading')
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginStatus('idle')
      setLoginError('이메일 또는 비밀번호를 확인해 주세요.')
      return
    }

    setLoginStatus('idle')
    navigate('/customer')
  }
  return (
    <main className="app-shell role-screen">
      <section className="role-intro">
        <p className="eyebrow">Cafe Stamp MVP</p>
        <h1>카페 스탬프를 웹에서 가볍게 관리해요</h1>
        <p>
          손님은 QR을 보여주고, 사장님은 가게 화면에서 스탬프를 적립합니다.
        </p>
      </section>

      <section className="role-actions" aria-label="로그인">
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />

          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {loginError && <p className="form-error">{loginError}</p>}

          <button className="primary-button" type="submit">
            {loginStatus === 'loading' ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </section>
    </main>
  )
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

function OwnerDashboard({ profile }) {
  const navigate = useNavigate()
  const [ownerStatus, setOwnerStatus] = useState('loading')
  const [ownerError, setOwnerError] = useState('')
  const [ownerCafe, setOwnerCafe] = useState(null)
  const [lookupInput, setLookupInput] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [parsedMemberNumber, setParsedMemberNumber] = useState('')
  const [lookupStatus, setLookupStatus] = useState('idle')
  const [lookupResult, setLookupResult] = useState(null)
  const [awardStatus, setAwardStatus] = useState('idle')
  const [awardResult, setAwardResult] = useState(null)
  const [awardError, setAwardError] = useState('')
  const lookupInputRef = useRef(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleLookupSubmit = async (event) => {
    event.preventDefault()

    const result = parseMemberLookupInput(lookupInput)

    setLookupError(result.error)
    setParsedMemberNumber(result.memberNumber)
    setLookupResult(null)
    setAwardStatus('idle')
    setAwardResult(null)
    setAwardError('')

    if (result.error) {
      setLookupStatus('idle')
      lookupInputRef.current?.focus()
      return
    }

    setLookupInput(result.memberNumber)
    setLookupStatus('loading')

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, member_number')
      .eq('member_number', result.memberNumber)
      .maybeSingle()

    if (customerError) {
      setLookupStatus('error')
      setLookupError('손님 정보를 조회하지 못했습니다.')
      lookupInputRef.current?.focus()
      return
    }

    if (!customer) {
      setLookupStatus('error')
      setLookupError('해당 회원번호의 손님을 찾을 수 없습니다.')
      lookupInputRef.current?.focus()
      return
    }

    const { data: stampCard, error: stampCardError } = await supabase
      .from('stamp_cards')
      .select('id, stamp_count')
      .eq('customer_id', customer.id)
      .eq('cafe_id', profile.cafe_id)
      .maybeSingle()

    if (stampCardError) {
      setLookupStatus('error')
      setLookupError('스탬프 정보를 조회하지 못했습니다.')
      lookupInputRef.current?.focus()
      return
    }

    if (!stampCard) {
      setLookupStatus('error')
      setLookupError('이 카페의 스탬프 카드가 아직 없습니다.')
      lookupInputRef.current?.focus()
      return
    }

    setLookupResult({
      customerName: customer.name,
      memberNumber: customer.member_number,
      cafeName: ownerCafe.name,
      currentStamps: stampCard.stamp_count,
      goalStamps: ownerCafe.stamp_goal,
      reward: ownerCafe.reward_title,
    })
    setLookupStatus('success')
    setLookupError('')
    lookupInputRef.current?.focus()
  }

  const handleAwardStamp = async () => {
    if (!lookupResult?.memberNumber) {
      return
    }

    setAwardStatus('loading')
    setAwardError('')
    setAwardResult(null)

    const { data, error } = await supabase.rpc('award_stamp', {
      member_number: lookupResult.memberNumber,
    })

    if (error) {
      setAwardStatus('error')
      setAwardError('스탬프를 적립하지 못했습니다. 다시 시도해 주세요.')
      lookupInputRef.current?.focus()
      return
    }

    setAwardResult(data)
    setLookupResult((current) => ({
      ...current,
      currentStamps: data.currentStamps,
      goalStamps: data.goalStamps,
      reward: data.reward,
    }))
    setAwardStatus('success')
    lookupInputRef.current?.focus()
  }

  useEffect(() => {
    const loadOwnerCafe = async () => {
      if (!profile?.cafe_id) {
        setOwnerStatus('error')
        setOwnerError('담당 카페를 찾을 수 없습니다.')
        return
      }

      setOwnerStatus('loading')
      setOwnerError('')

      const { data: cafe, error } = await supabase
        .from('cafes')
        .select('id, name, stamp_goal, reward_title')
        .eq('id', profile.cafe_id)
        .single()

      if (error) {
        setOwnerStatus('error')
        setOwnerError('담당 카페 정보를 불러오지 못했습니다.')
        return
      }

      setOwnerCafe(cafe)
      setOwnerStatus('idle')
    }

    loadOwnerCafe()
  }, [profile?.cafe_id])

  useEffect(() => {
    if (ownerStatus === 'idle') {
      lookupInputRef.current?.focus()
    }
  }, [ownerStatus])

  return (
    <main className="app-shell owner-screen">
      <header className="customer-header">
        <div>
          <p className="eyebrow">사장님 모드</p>
          <h1>가게 관리</h1>
        </div>
        <button className="ghost-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </header>

      <section className="owner-panel">
        {ownerStatus === 'loading' && <StatusCard title="담당 카페를 불러오고 있어요" />}
        {ownerStatus === 'error' && <StatusCard title={ownerError} />}
        {ownerStatus === 'idle' && (
          <>
            <div className="section-title">
              <h2>{ownerCafe.name}</h2>
              <p>스탬프 조건과 보상 내용을 확인하고 손님 QR을 입력합니다.</p>
            </div>

            <dl className="rule-list">
              <div>
                <dt>스탬프 목표</dt>
                <dd>{ownerCafe.stamp_goal}개</dd>
              </div>
              <div>
                <dt>보상 내용</dt>
                <dd>{ownerCafe.reward_title}</dd>
              </div>
            </dl>

            <form className="lookup-form" onSubmit={handleLookupSubmit}>
              <label htmlFor="member-lookup">회원번호 또는 QR 값</label>
              <div className="lookup-row">
                <input
                  id="member-lookup"
                  ref={lookupInputRef}
                  type="text"
                  value={lookupInput}
                  onChange={(event) => setLookupInput(event.target.value)}
                  placeholder="cafe-stamp:C-1001 또는 C-1001"
                  autoComplete="off"
                />
                <button
                  className="primary-button"
                  type="submit"
                  disabled={lookupStatus === 'loading'}
                >
                  {lookupStatus === 'loading' ? '조회 중...' : '조회'}
                </button>
              </div>

              {lookupError && <p className="form-error">{lookupError}</p>}

              {parsedMemberNumber && !lookupError && (
                <div className="lookup-result">
                  <span>조회한 회원번호</span>
                  <strong>{parsedMemberNumber}</strong>
                </div>
              )}
            </form>

            {lookupResult && (
              <article className="lookup-card">
                <div>
                  <p className="eyebrow">조회 결과</p>
                  <h3>{lookupResult.customerName}</h3>
                  <p>회원번호 {lookupResult.memberNumber}</p>
                </div>
                <dl className="rule-list">
                  <div>
                    <dt>담당 카페</dt>
                    <dd>{lookupResult.cafeName}</dd>
                  </div>
                  <div>
                    <dt>현재 스탬프</dt>
                    <dd>
                      {lookupResult.currentStamps} / {lookupResult.goalStamps}개
                    </dd>
                  </div>
                  <div>
                    <dt>보상 내용</dt>
                    <dd>{lookupResult.reward}</dd>
                  </div>
                </dl>
                <button
                  className="primary-button"
                  type="button"
                  disabled={awardStatus === 'loading'}
                  onClick={handleAwardStamp}
                >
                  {awardStatus === 'loading' ? '적립 처리 중...' : '스탬프 1개 적립'}
                </button>
                {awardError && <p className="form-error">{awardError}</p>}
                {awardResult && (
                  <div className="award-result">
                    <strong>
                      {awardResult.couponIssued
                        ? '쿠폰이 발급되었습니다.'
                        : '스탬프가 적립되었습니다.'}
                    </strong>
                    <p>
                      현재 {awardResult.currentStamps} / {awardResult.goalStamps}개
                    </p>
                    {awardResult.couponIssued && (
                      <p>
                        쿠폰: {awardResult.couponTitle} / {awardResult.couponBarcode}
                      </p>
                    )}
                  </div>
                )}
              </article>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function StatusCard({ title }) {
  return (
    <div className="status-card">
      <p>{title}</p>
    </div>
  )
}

export default App





