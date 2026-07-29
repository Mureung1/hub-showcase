import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createSubscription, joinSubscription } from '../lib/subscriptions'
import { getToken } from '../lib/auth'
import Tabs from '../components/Tabs'
import LoginRequired from '../components/LoginRequired'
import './SubscriptionForm.css'

const MIN_MEMBER_COUNT = 1
const MAX_MEMBER_COUNT = 20

function extractSubscriptionId(input) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || trimmed
  } catch {
    return trimmed
  }
}

const SubscriptionForm = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('create')

  const [serviceName, setServiceName] = useState('')
  const [subAmount, setSubAmount] = useState('')
  const [billingDay, setBillingDay] = useState('')
  const [memberCount, setMemberCount] = useState(1)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')

  const [status, setStatus] = useState(getToken() ? 'idle' : 'unauthorized')
  const [errorMessage, setErrorMessage] = useState('')

  const [joinInput, setJoinInput] = useState('')
  const [joinStatus, setJoinStatus] = useState('idle')
  const [joinErrorMessage, setJoinErrorMessage] = useState('')

  const decreaseMemberCount = () => {
    setMemberCount((count) => Math.max(MIN_MEMBER_COUNT, count - 1))
  }

  const increaseMemberCount = () => {
    setMemberCount((count) => Math.min(MAX_MEMBER_COUNT, count + 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const subscription = await createSubscription({
        serviceName,
        subAmount: Number(subAmount),
        billingDay: Number(billingDay),
        memberCount,
        bankName,
        accountNumber,
        accountHolderName,
      })
      navigate(`/subscriptions/${subscription.id}`)
    } catch (error) {
      setErrorMessage(error.message)
      setStatus('error')
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    const subscriptionId = extractSubscriptionId(joinInput)
    if (!subscriptionId) return

    setJoinStatus('submitting')
    setJoinErrorMessage('')

    try {
      await joinSubscription(subscriptionId)
      navigate(`/subscriptions/${subscriptionId}`)
    } catch (error) {
      if (error.status === 409) {
        navigate(`/subscriptions/${subscriptionId}`)
        return
      }
      setJoinErrorMessage(error.message)
      setJoinStatus('error')
    }
  }

  if (status === 'unauthorized') {
    return (
      <div className="subscription-form-page">
        <Link to="/" className="back-link">← 메인으로</Link>
        <LoginRequired message="로그인 후 구독 서비스를 등록하거나 초대받은 파티에 참여할 수 있어요." />
      </div>
    )
  }

  return (
    <div className="subscription-form-page">
      <Link to="/" className="back-link">← 메인으로</Link>
      <Tabs
        tabs={[
          { key: 'create', label: '파티 새로 만들기' },
          { key: 'join', label: '링크로 파티 참여' },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'create' ? (
        <form className="subscription-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceName">
              서비스명
            </label>
            <input
              id="serviceName"
              className="form-input"
              type="text"
              placeholder="예: 넷플릭스"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="subAmount">
              구독료 (원)
            </label>
            <input
              id="subAmount"
              className="form-input"
              type="number"
              min="1"
              placeholder="예: 17000"
              value={subAmount}
              onChange={(e) => setSubAmount(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="billingDay">
              결제일
            </label>
            <input
              id="billingDay"
              className="form-input"
              type="number"
              min="1"
              max="31"
              placeholder="예: 20"
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <span className="form-label">파티원 수 (본인 포함)</span>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={decreaseMemberCount}
                disabled={memberCount <= MIN_MEMBER_COUNT}
                aria-label="파티원 수 줄이기"
              >
                −
              </button>
              <span className="stepper-count">{memberCount}명</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={increaseMemberCount}
                disabled={memberCount >= MAX_MEMBER_COUNT}
                aria-label="파티원 수 늘리기"
              >
                ＋
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bankName">
              은행명
            </label>
            <input
              id="bankName"
              className="form-input"
              type="text"
              placeholder="예: 국민은행"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="accountNumber">
              계좌번호
            </label>
            <input
              id="accountNumber"
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="- 없이 숫자만 입력"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="accountHolderName">
              예금주
            </label>
            <input
              id="accountHolderName"
              className="form-input"
              type="text"
              placeholder="예: 홍길동"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {status === 'error' && <p className="form-error">{errorMessage}</p>}

          <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
            {status === 'submitting' ? '등록 중...' : '등록하기'}
          </button>
        </form>
      ) : (
        <form className="subscription-form" onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label" htmlFor="joinInput">
              초대 링크
            </label>
            <input
              id="joinInput"
              className="form-input"
              type="text"
              placeholder="공유받은 초대 링크를 붙여넣어 주세요"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {joinStatus === 'error' && <p className="form-error">{joinErrorMessage}</p>}

          <button type="submit" className="btn-primary" disabled={joinStatus === 'submitting'}>
            {joinStatus === 'submitting' ? '가입 중...' : '가입하기'}
          </button>
        </form>
      )}
    </div>
  )
}

export default SubscriptionForm
