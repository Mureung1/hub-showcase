import { useState } from 'react'
import { createSubscription } from '../lib/subscriptions'
import './SubscriptionForm.css'

const MIN_MEMBER_COUNT = 1
const MAX_MEMBER_COUNT = 20

const SubscriptionForm = () => {
  const [serviceName, setServiceName] = useState('')
  const [subAmount, setSubAmount] = useState('')
  const [billingDay, setBillingDay] = useState('')
  const [memberCount, setMemberCount] = useState(1)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')

  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [registeredSubscription, setRegisteredSubscription] = useState(null)

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
      setRegisteredSubscription(subscription)
      setStatus('success')
    } catch (error) {
      setErrorMessage(error.message)
      setStatus('error')
    }
  }

  if (status === 'success' && registeredSubscription) {
    return (
      <div className="subscription-form-page">
        <h1 className="page-title">구독 서비스 등록 완료</h1>
        <div className="subscription-form">
          <p className="success-message">등록이 완료됐어요.</p>
          <p className="success-amount">{registeredSubscription.serviceName} 1인당 부담 금액 {registeredSubscription.myAmount.toLocaleString()}원</p>
          <p className="form-label">파티원 초대 링크</p>
          <p className="form-input">{registeredSubscription.joinUrl}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="subscription-form-page">
      <h1 className="page-title">구독 서비스 등록</h1>

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
            required
          />
        </div>

        {status === 'error' && <p className="form-error">{errorMessage}</p>}

        <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? '등록 중...' : '등록하기'}
        </button>
      </form>
    </div>
  )
}

export default SubscriptionForm
