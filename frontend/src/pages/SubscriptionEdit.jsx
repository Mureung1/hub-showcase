import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSubscription, updateSubscription } from '../lib/subscriptions'
import LoginRequired from '../components/LoginRequired'
import './SubscriptionEdit.css'

const MIN_MEMBER_COUNT = 1
const MAX_MEMBER_COUNT = 20

const SubscriptionEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loadStatus, setLoadStatus] = useState('loading')
  const [loadErrorMessage, setLoadErrorMessage] = useState('')

  const [serviceName, setServiceName] = useState('')
  const [subAmount, setSubAmount] = useState('')
  const [billingDay, setBillingDay] = useState('')
  const [memberCount, setMemberCount] = useState(1)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')

  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitErrorMessage, setSubmitErrorMessage] = useState('')

  const decreaseMemberCount = () => {
    setMemberCount((count) => Math.max(MIN_MEMBER_COUNT, count - 1))
  }

  const increaseMemberCount = () => {
    setMemberCount((count) => Math.min(MAX_MEMBER_COUNT, count + 1))
  }

  useEffect(() => {
    getSubscription(id)
      .then((data) => {
        if (data.role !== 'owner') {
          setLoadStatus('forbidden')
          return
        }
        setServiceName(data.serviceName)
        setSubAmount(String(data.subAmount))
        setBillingDay(String(data.billingDay))
        setMemberCount(data.memberCount)
        setBankName(data.bankAccount.bankName)
        setAccountNumber(data.bankAccount.accountNumber)
        setAccountHolderName(data.bankAccount.accountHolderName)
        setLoadStatus('ready')
      })
      .catch((error) => {
        setLoadErrorMessage(error.message)
        if (error.status === 401) {
          setLoadStatus('unauthorized')
        } else if (error.status === 404) {
          setLoadStatus('notfound')
        } else if (error.status === 403) {
          setLoadStatus('forbidden')
        } else {
          setLoadStatus('error')
        }
      })
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitStatus('submitting')
    setSubmitErrorMessage('')

    try {
      await updateSubscription(id, {
        serviceName,
        subAmount: Number(subAmount),
        billingDay: Number(billingDay),
        memberCount,
        bankName,
        accountNumber,
        accountHolderName,
      })
      navigate(`/subscriptions/${id}`)
    } catch (error) {
      setSubmitErrorMessage(error.message)
      setSubmitStatus('error')
    }
  }

  let content

  if (loadStatus === 'loading') {
    content = <p className="subscription-edit-message">불러오는 중...</p>
  } else if (loadStatus === 'unauthorized') {
    content = <LoginRequired message="로그인 후 구독 서비스를 수정할 수 있어요." />
  } else if (loadStatus === 'notfound') {
    content = <p className="subscription-edit-message">존재하지 않는 파티예요.</p>
  } else if (loadStatus === 'forbidden') {
    content = <p className="subscription-edit-message">파티장만 수정할 수 있어요.</p>
  } else if (loadStatus === 'error') {
    content = <p className="subscription-edit-message">{loadErrorMessage}</p>
  } else {
    content = (
      <form className="subscription-edit-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="serviceName">
            서비스명
          </label>
          <input
            id="serviceName"
            className="form-input"
            type="text"
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
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            required
          />
        </div>

        {submitStatus === 'error' && <p className="form-error">{submitErrorMessage}</p>}

        <button type="submit" className="btn-primary" disabled={submitStatus === 'submitting'}>
          {submitStatus === 'submitting' ? '저장 중...' : '저장하기'}
        </button>
      </form>
    )
  }

  return (
    <div className="subscription-edit-page">
      <Link to={`/subscriptions/${id}`} className="back-link">← 상세로</Link>
      {content}
    </div>
  )
}

export default SubscriptionEdit
