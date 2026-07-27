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



export { OwnerDashboard }
