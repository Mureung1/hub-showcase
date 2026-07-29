import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services'
import { StatusCard } from '../components/common'
import { parseMemberLookupInput } from '../utils/stamp'

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
  const [couponInput, setCouponInput] = useState('')
  const [couponLookupStatus, setCouponLookupStatus] = useState('idle')
  const [couponLookupError, setCouponLookupError] = useState('')
  const [couponLookupResult, setCouponLookupResult] = useState(null)
  const [couponRedeemStatus, setCouponRedeemStatus] = useState('idle')
  const [couponRedeemError, setCouponRedeemError] = useState('')
  const lookupInputRef = useRef(null)
  const couponInputRef = useRef(null)

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

  const handleCouponLookupSubmit = async (event) => {
    event.preventDefault()

    const normalizedBarcode = couponInput.trim().toUpperCase()

    setCouponLookupError('')
    setCouponLookupResult(null)
    setCouponRedeemStatus('idle')
    setCouponRedeemError('')

    if (!normalizedBarcode) {
      setCouponLookupStatus('idle')
      setCouponLookupError('Enter a coupon barcode.')
      couponInputRef.current?.focus()
      return
    }

    setCouponInput(normalizedBarcode)
    setCouponLookupStatus('loading')

    const { data, error } = await supabase.rpc('lookup_coupon', {
      coupon_barcode: normalizedBarcode,
    })

    if (error) {
      setCouponLookupStatus('error')
      setCouponLookupError('Could not find this coupon. Check the barcode and try again.')
      couponInputRef.current?.focus()
      return
    }

    setCouponLookupResult(data)
    setCouponLookupStatus('success')
    setCouponLookupError('')
    setCouponRedeemStatus('idle')
    setCouponRedeemError('')
    couponInputRef.current?.focus()
  }

  const handleCouponRedeem = async () => {
    if (!couponLookupResult?.barcode) {
      return
    }

    setCouponRedeemStatus('loading')
    setCouponRedeemError('')

    const { data, error } = await supabase.rpc('redeem_coupon', {
      coupon_barcode: couponLookupResult.barcode,
    })

    if (error) {
      setCouponRedeemStatus('error')
      setCouponRedeemError('Could not redeem this coupon. Look it up again and try once more.')
      couponInputRef.current?.focus()
      return
    }

    setCouponLookupResult(data)
    setCouponRedeemStatus('success')
    setCouponRedeemError('')
    couponInputRef.current?.focus()
  }

  useEffect(() => {
    const loadOwnerCafe = async () => {
      if (!profile?.cafe_id) {
        setOwnerStatus('error')
        setOwnerError('해당 카페를 찾을 수 없습니다.')
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
        setOwnerError('해당 카페 정보를 불러오지 못했습니다.')
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

  const currentStampLabel = lookupResult
    ? `${lookupResult.currentStamps} / ${lookupResult.goalStamps}개`
    : '-'
  const couponIssuedLabel = awardResult?.couponIssued ? '1' : '0'
  const recentActivityLabel = awardResult
    ? awardResult.couponIssued
      ? `${lookupResult?.customerName ?? '손님'} 쿠폰 발급 완료`
      : `${lookupResult?.customerName ?? '손님'} 스탬프 1개 적립`
    : '아직 처리 내역이 없습니다'

  return (
    <main className="owner-app" aria-label="사장님 화면">
      <aside className="owner-sidebar" aria-label="사장님 메뉴">
        <div className="owner-brand">
          <span aria-hidden="true">CS</span>
          <div>
            <strong>{ownerCafe?.name ?? 'Cafe Stamp'}</strong>
            <small>사장님 테스트 로그인</small>
          </div>
        </div>
        <nav>
          <a className="active" href="#owner-dashboard">홈</a>
          <a href="#owner-scan">QR 적립</a>
          <a href="#owner-rules">카페 규칙</a>
          <a href="#owner-coupons">Coupon</a>
          <a href="#owner-activity">처리 결과</a>
        </nav>
      </aside>

      <section className="owner-workspace">
        <header className="owner-topbar">
          <div>
            <p>사장님 모드</p>
            <h1>오늘의 스탬프 운영</h1>
          </div>
          <button type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        <section className="owner-panel" id="owner-dashboard" aria-label="운영 현황">
          {ownerStatus === 'loading' && <StatusCard title="카페 정보를 불러오고 있습니다." />}
          {ownerStatus === 'error' && <StatusCard title={ownerError} />}
          {ownerStatus === 'idle' && (
            <>
              <div className="owner-metric-grid">
                <article className="owner-metric-card">
                  <span>조회한 손님</span>
                  <strong>{lookupResult ? '1' : '0'}</strong>
                  <small>{parsedMemberNumber || '회원번호를 입력해 주세요'}</small>
                </article>
                <article className="owner-metric-card">
                  <span>현재 스탬프</span>
                  <strong>{currentStampLabel}</strong>
                  <small>{ownerCafe.name} 기준</small>
                </article>
                <article className="owner-metric-card">
                  <span>쿠폰 발급</span>
                  <strong>{couponIssuedLabel}</strong>
                  <small>{awardResult?.couponIssued ? '자동 발급 완료' : '이번 처리 기준'}</small>
                </article>
              </div>

              <div className="owner-dashboard-grid">
                <article className="owner-card owner-scan-card" id="owner-scan">
                  <div>
                    <p>직원용 적립</p>
                    <h2>손님 QR 값이나 회원번호를 입력한 뒤 먼저 조회합니다.</h2>
                  </div>
                  <form className="owner-lookup-form" onSubmit={handleLookupSubmit}>
                    <label htmlFor="member-lookup">QR/회원번호 입력</label>
                    <div className="owner-scan-input">
                      <input
                        id="member-lookup"
                        ref={lookupInputRef}
                        type="text"
                        value={lookupInput}
                        onChange={(event) => setLookupInput(event.target.value)}
                        placeholder="cafe-stamp:C-1001 또는 C-1001"
                        autoComplete="off"
                      />
                      <button type="submit" disabled={lookupStatus === 'loading'}>
                        {lookupStatus === 'loading' ? '조회 중' : '조회'}
                      </button>
                    </div>
                  </form>
                  {lookupError && <p className="form-error">{lookupError}</p>}
                  {parsedMemberNumber && !lookupError && (
                    <div className="owner-info-box">
                      <span>조회할 회원번호</span>
                      <strong>{parsedMemberNumber}</strong>
                    </div>
                  )}
                </article>

                <article className="owner-card owner-result-card">
                  <div className="owner-section-head">
                    <div>
                      <p>조회 결과</p>
                      <h2>{lookupResult ? lookupResult.customerName : '손님을 조회해 주세요'}</h2>
                    </div>
                  </div>
                  {lookupResult ? (
                    <>
                      <dl className="owner-rule-list">
                        <div>
                          <dt>회원번호</dt>
                          <dd>{lookupResult.memberNumber}</dd>
                        </div>
                        <div>
                          <dt>현재 스탬프</dt>
                          <dd>
                            {lookupResult.currentStamps} / {lookupResult.goalStamps}개
                          </dd>
                        </div>
                        <div>
                          <dt>보상</dt>
                          <dd>{lookupResult.reward}</dd>
                        </div>
                      </dl>
                      <button
                        className="owner-award-button"
                        type="button"
                        disabled={awardStatus === 'loading'}
                        onClick={handleAwardStamp}
                      >
                        {awardStatus === 'loading' ? '적립 처리 중' : '스탬프 1개 적립'}
                      </button>
                    </>
                  ) : (
                    <p className="owner-empty-text">
                      QR 스캐너가 입력한 값이나 손님 회원번호를 왼쪽 입력창에 넣어 주세요.
                    </p>
                  )}
                  {awardError && <p className="form-error">{awardError}</p>}
                </article>
              </div>

              <div className="owner-dashboard-grid">
                <article className="owner-card owner-rule-card" id="owner-rules">
                  <div className="owner-section-head">
                    <div>
                      <p>내 카페 관리</p>
                      <h2>스탬프 규칙</h2>
                    </div>
                  </div>
                  <dl className="owner-rule-list">
                    <div>
                      <dt>카페명</dt>
                      <dd>{ownerCafe.name}</dd>
                    </div>
                    <div>
                      <dt>목표 스탬프</dt>
                      <dd>{ownerCafe.stamp_goal}개</dd>
                    </div>
                    <div>
                      <dt>보상 이름</dt>
                      <dd>{ownerCafe.reward_title}</dd>
                    </div>
                  </dl>
                </article>

                <article className="owner-card owner-coupon-card" id="owner-coupons">
                  <div className="owner-section-head">
                    <div>
                      <p>Coupon redeem</p>
                      <h2>Look up a coupon barcode before redeeming.</h2>
                    </div>
                  </div>
                  <form className="owner-lookup-form" onSubmit={handleCouponLookupSubmit}>
                    <label htmlFor="coupon-lookup">Coupon barcode</label>
                    <div className="owner-scan-input">
                      <input
                        id="coupon-lookup"
                        ref={couponInputRef}
                        type="text"
                        value={couponInput}
                        onChange={(event) => setCouponInput(event.target.value)}
                        placeholder="CP-000001"
                        autoComplete="off"
                      />
                      <button type="submit" disabled={couponLookupStatus === 'loading'}>
                        {couponLookupStatus === 'loading' ? 'Looking up...' : 'Lookup coupon'}
                      </button>
                    </div>
                  </form>
                  {couponLookupError && <p className="form-error">{couponLookupError}</p>}
                  {couponLookupResult && (
                    <div className={couponLookupResult.isRedeemable ? 'owner-info-box' : 'owner-success-box'}>
                      <span>Coupon lookup</span>
                      <strong>{couponLookupResult.title}</strong>
                      <dl className="owner-rule-list">
                        <div>
                          <dt>Barcode</dt>
                          <dd>{couponLookupResult.barcode}</dd>
                        </div>
                        <div>
                          <dt>Customer</dt>
                          <dd>
                            {couponLookupResult.customerName} / {couponLookupResult.memberNumber}
                          </dd>
                        </div>
                        <div>
                          <dt>Cafe</dt>
                          <dd>{couponLookupResult.cafeName}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{couponLookupResult.status === 'issued' ? 'Ready' : 'Used'}</dd>
                        </div>
                      </dl>
                      {couponLookupResult.isRedeemable ? (
                        <button
                          className="owner-award-button"
                          type="button"
                          disabled={couponRedeemStatus === 'loading'}
                          onClick={handleCouponRedeem}
                        >
                          {couponRedeemStatus === 'loading' ? 'Redeeming...' : 'Redeem coupon'}
                        </button>
                      ) : (
                        <span>
                          Used at:{' '}
                          {couponLookupResult.usedAt
                            ? new Date(couponLookupResult.usedAt).toLocaleString()
                            : 'No used time'}
                        </span>
                      )}
                    </div>
                  )}
                  {couponRedeemError && <p className="form-error">{couponRedeemError}</p>}
                  {couponRedeemStatus === 'success' && (
                    <p className="form-success">Coupon redeemed.</p>
                  )}
                </article>

                <article className="owner-card owner-activity-card" id="owner-activity">
                  <div className="owner-section-head">
                    <div>
                      <p>처리 결과</p>
                      <h2>최근 적립과 쿠폰 발급</h2>
                    </div>
                    <span>실시간 처리</span>
                  </div>
                  <div className={awardResult ? 'owner-success-box' : 'owner-info-box'}>
                    <strong>{recentActivityLabel}</strong>
                    {awardResult && (
                      <>
                        <span>
                          현재 {awardResult.currentStamps} / {awardResult.goalStamps}개
                        </span>
                        {awardResult.couponIssued && (
                          <span>
                            쿠폰: {awardResult.couponTitle} / {awardResult.couponBarcode}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </article>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  )
}

export { OwnerDashboard }
