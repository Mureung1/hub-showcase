import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  billingMonthLabel,
  billingMonthShortLabel,
  getSettlementDetail,
  reportSettlementMember,
  settlementOwnerStatusLabel,
  settlementStatusLabel,
  updateSettlementMemberStatus,
} from '../lib/settlements'
import { getSubscription } from '../lib/subscriptions'
import LoginRequired from '../components/LoginRequired'
import './SubscriptionDetail.css'
import './SettlementDetail.css'

const SettlementDetail = () => {
  const { id, settlementId } = useParams()
  const [status, setStatus] = useState('loading')
  const [settlement, setSettlement] = useState(null)
  const [serviceName, setServiceName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [actionMemberId, setActionMemberId] = useState(null)
  const [actionErrorMessage, setActionErrorMessage] = useState('')

  const [reportStatus, setReportStatus] = useState('idle')
  const [reportErrorMessage, setReportErrorMessage] = useState('')

  const [showTransferFallback, setShowTransferFallback] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const myMember = settlement && settlement.role !== 'owner' ? settlement.members[0] : null

  useEffect(() => {
    getSettlementDetail(id, settlementId)
      .then((data) => {
        setSettlement(data)
        setStatus('success')
      })
      .catch((error) => {
        setErrorMessage(error.message)
        if (error.status === 401) setStatus('unauthorized')
        else if (error.status === 404) setStatus('notfound')
        else if (error.status === 403) setStatus('forbidden')
        else setStatus('error')
      })
  }, [id, settlementId])

  useEffect(() => {
    getSubscription(id)
      .then((data) => setServiceName(data.serviceName))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!myMember || myMember.status !== 'pending') return

    let fallbackTimer
    const handleVisibilityChange = () => {
      if (document.hidden) clearTimeout(fallbackTimer)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    window.location.href = myMember.transferLink
    fallbackTimer = setTimeout(() => {
      if (!document.hidden) setShowTransferFallback(true)
    }, 1500)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(fallbackTimer)
    }
  }, [myMember?.id, myMember?.status, myMember?.transferLink])

  useEffect(() => {
    if (!showTransferFallback || !myMember) return
    QRCode.toDataURL(myMember.transferLink)
      .then(setQrDataUrl)
      .catch(() => {})
  }, [showTransferFallback, myMember?.transferLink])

  const handleKakaoShare = () => {
    if (!window.Kakao?.isInitialized()) return

    const path = `subscriptions/${id}/settlements/${settlementId}`

    window.Kakao.Share.sendCustom({
      templateId: Number(import.meta.env.VITE_KAKAO_SETTLEMENT_SHARE_TEMPLATE_ID),
      templateArgs: { serviceName, path, billingMonth: billingMonthShortLabel(settlement.billingMonth) },
    })
  }

  const handleStatusChange = async (memberId, nextStatus) => {
    setActionMemberId(memberId)
    setActionErrorMessage('')
    try {
      await updateSettlementMemberStatus(id, settlementId, memberId, nextStatus)
      const data = await getSettlementDetail(id, settlementId)
      setSettlement(data)
    } catch (error) {
      setActionErrorMessage(error.message)
    } finally {
      setActionMemberId(null)
    }
  }

  const handleReport = async (memberId) => {
    setReportStatus('submitting')
    setReportErrorMessage('')
    try {
      await reportSettlementMember(id, settlementId, memberId)
      const data = await getSettlementDetail(id, settlementId)
      setSettlement(data)
      setReportStatus('idle')
    } catch (error) {
      setReportErrorMessage(error.message)
      setReportStatus('error')
    }
  }

  let content

  if (status === 'loading') {
    content = <p className="subscription-detail-message">불러오는 중...</p>
  } else if (status === 'unauthorized') {
    content = <LoginRequired message="로그인 후 정산 내역을 확인할 수 있어요." />
  } else if (status === 'notfound') {
    content = <p className="subscription-detail-message">존재하지 않는 정산이에요.</p>
  } else if (status === 'forbidden') {
    content = <p className="subscription-detail-message">해당 파티의 파티장 또는 파티원만 볼 수 있어요.</p>
  } else if (status === 'error') {
    content = <p className="subscription-detail-message">{errorMessage}</p>
  } else {
    const { billingMonth, role, members } = settlement
    const myStatusLabel = myMember ? settlementStatusLabel(myMember.status, myMember.reportedAt) : ''

    content = (
      <>
        <div className="subscription-detail-header">
          <h1 className="subscription-detail-title">{billingMonthLabel(billingMonth)} 정산 내역</h1>
        </div>

        {role === 'owner' ? (
          <div className="subscription-detail-card">
            <div className="settlement-section-header">
              <p className="detail-section-title">파티원별 정산 현황</p>
              <button type="button" className="kakao-share-btn" onClick={handleKakaoShare}>
                카카오톡으로 정산 요청
              </button>
            </div>
            {actionErrorMessage && <p className="form-error">{actionErrorMessage}</p>}
            {members.length === 0 && <p className="member-list-message">아직 가입한 파티원이 없어요.</p>}
            <ul className="member-list">
              {members.map((member) => (
                <li key={member.id} className="member-list-item">
                  <div className="member-info">
                    <p className="member-name">{member.name}</p>
                    <p className="settlement-member-note">{member.amount.toLocaleString()}원</p>
                  </div>
                  <div className="settlement-member-actions">
                    <span className={`member-status ${member.status}`}>
                      {settlementOwnerStatusLabel(member.status, member.reportedAt)}
                    </span>
                    {member.status === 'pending' ? (
                      <button
                        type="button"
                        className="settlement-start-btn"
                        disabled={actionMemberId === member.id}
                        onClick={() => handleStatusChange(member.id, 'done')}
                      >
                        수락
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="member-remove-btn"
                        disabled={actionMemberId === member.id}
                        onClick={() => handleStatusChange(member.id, 'pending')}
                      >
                        거절
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="subscription-detail-card">
              <div className="detail-row detail-row-highlight">
                <span className="detail-label">내 정산 금액</span>
                <span className="detail-value">{myMember.amount.toLocaleString()}원</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">상태</span>
                <span className={`member-status ${myMember.status}`}>{myStatusLabel}</span>
              </div>

              {reportErrorMessage && <p className="form-error">{reportErrorMessage}</p>}

              {myMember.status === 'pending' && (
                <div className="settlement-current-actions">
                  {showTransferFallback ? (
                    <a className="toss-transfer-btn" href={myMember.transferLink}>
                      토스로 이체하기
                    </a>
                  ) : (
                    <p className="settlement-transfer-pending-message">토스로 이동하고 있어요...</p>
                  )}
                  <button
                    type="button"
                    className="confirm-request-btn"
                    disabled={reportStatus === 'submitting' || Boolean(myMember.reportedAt)}
                    onClick={() => handleReport(myMember.id)}
                  >
                    {myMember.reportedAt ? '확인 요청 완료' : '이체 확인 요청'}
                  </button>
                </div>
              )}
            </div>

            {myMember.status === 'pending' && showTransferFallback && qrDataUrl && (
              <div className="settlement-transfer-qr-card">
                <img src={qrDataUrl} alt="토스 송금 QR코드" className="toss-transfer-qr" />
                <p className="settlement-transfer-fallback-message">
                  앱이 자동으로 열리지 않았어요. QR코드를 스캔하거나 토스로 이체하기 버튼을 눌러주세요.
                </p>
              </div>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <div className="subscription-detail-page">
      <div className="subscription-detail-topbar">
        <Link to={`/subscriptions/${id}`} className="back-link">
          ← 이전으로
        </Link>
      </div>
      {content}
    </div>
  )
}

export default SettlementDetail
