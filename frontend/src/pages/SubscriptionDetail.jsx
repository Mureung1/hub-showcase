import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubscription } from '../lib/subscriptions'
import { getServiceColor } from '../lib/serviceColor'
import RoleBadge from '../components/RoleBadge'
import LoginRequired from '../components/LoginRequired'
import './SubscriptionDetail.css'

const SubscriptionDetail = () => {
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [subscription, setSubscription] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async (joinUrl) => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 접근이 막힌 환경 — 화면에 보이는 링크 텍스트로 수동 복사 가능
    }
  }

  const handleKakaoShare = (joinUrl, serviceName) => {
    if (!window.Kakao?.isInitialized()) return

    // 템플릿 링크가 `http://localhost:5173/${path}` 형태(도메인 뒤 슬래시가 이미 고정)라
    // path 변수에는 선행 슬래시 없이 넘겨야 함 (join/12)
    const path = new URL(joinUrl).pathname.replace(/^\//, '')

    window.Kakao.Share.sendCustom({
      templateId: Number(import.meta.env.VITE_KAKAO_SHARE_TEMPLATE_ID),
      // 카카오 디벨로퍼스 콘솔 메시지 템플릿에 정의한 변수명과 일치해야 함
      templateArgs: {
        serviceName,
        path,
      },
    })
  }

  useEffect(() => {
    getSubscription(id)
      .then((data) => {
        setSubscription(data)
        setStatus('success')
      })
      .catch((error) => {
        setErrorMessage(error.message)
        if (error.status === 401) {
          setStatus('unauthorized')
        } else if (error.status === 404) {
          setStatus('notfound')
        } else if (error.status === 403) {
          setStatus('forbidden')
        } else {
          setStatus('error')
        }
      })
  }, [id])

  let content

  if (status === 'loading') {
    content = <p className="subscription-detail-message">불러오는 중...</p>
  } else if (status === 'unauthorized') {
    content = <LoginRequired message="로그인 후 파티 상세 정보를 확인할 수 있어요." />
  } else if (status === 'notfound') {
    content = <p className="subscription-detail-message">존재하지 않는 파티예요.</p>
  } else if (status === 'forbidden') {
    content = <p className="subscription-detail-message">해당 파티의 파티장 또는 파티원만 볼 수 있어요.</p>
  } else if (status === 'error') {
    content = <p className="subscription-detail-message">{errorMessage}</p>
  } else {
    const { serviceName, subAmount, billingDay, memberCount, myAmount, role, bankAccount, joinUrl } = subscription

    content = (
      <>
        <div className="subscription-detail-header">
          <span className="subscription-dot" style={{ backgroundColor: getServiceColor(serviceName) }} />
          <h1 className="subscription-detail-title">{serviceName}</h1>
          <RoleBadge role={role} />
        </div>

        <div className="subscription-detail-card">
          <div className="detail-row">
            <span className="detail-label">총 구독료</span>
            <span className="detail-value">{subAmount.toLocaleString()}원</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">결제일</span>
            <span className="detail-value">매달 {billingDay}일</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">정산 인원</span>
            <span className="detail-value">{memberCount === 1 ? '개인' : `${memberCount}인 공유`}</span>
          </div>
          <div className="detail-row detail-row-highlight">
            <span className="detail-label">내 몫</span>
            <span className="detail-value">{myAmount.toLocaleString()}원</span>
          </div>
        </div>

        {role === 'owner' && (
          <div className="subscription-detail-card">
            <p className="detail-section-title">정산금 받을 계좌</p>
            <div className="detail-row">
              <span className="detail-label">은행</span>
              <span className="detail-value">{bankAccount.bankName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">계좌번호</span>
              <span className="detail-value">{bankAccount.accountNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">예금주</span>
              <span className="detail-value">{bankAccount.accountHolderName}</span>
            </div>

            <p className="detail-section-title">파티원 초대 링크</p>
            <p className="detail-join-url">{joinUrl}</p>
            <div className="link-action-row">
              <button type="button" className="copy-link-btn" onClick={() => handleCopyLink(joinUrl)}>
                {copied ? '복사됨' : '링크 복사'}
              </button>
              <button
                type="button"
                className="kakao-share-btn"
                onClick={() => handleKakaoShare(joinUrl, serviceName)}
              >
                카카오톡 공유
              </button>
            </div>

          </div>
        )}
      </>
    )
  }

  return (
    <div className="subscription-detail-page">
      <Link to="/" className="back-link">← 메인으로</Link>
      {content}
    </div>
  )
}

export default SubscriptionDetail
