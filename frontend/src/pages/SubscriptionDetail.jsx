import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteSubscription, getSubscription } from '../lib/subscriptions'
import { getMembers, deleteMember } from '../lib/partyMembers'
import {
  billingMonthLabel,
  createSettlement,
  getSettlements,
  reportSettlementMember,
  settlementStatusLabel,
} from '../lib/settlements'
import { getServiceColor } from '../lib/serviceColor'
import RoleBadge from '../components/RoleBadge'
import LoginRequired from '../components/LoginRequired'
import ConfirmDialog from '../components/ConfirmDialog'
import './SubscriptionDetail.css'

const SubscriptionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [subscription, setSubscription] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')
  const [members, setMembers] = useState([])
  const [membersStatus, setMembersStatus] = useState('idle')
  const [memberToRemove, setMemberToRemove] = useState(null)
  const [removeErrorMessage, setRemoveErrorMessage] = useState('')
  const [settlements, setSettlements] = useState([])
  const [settlementsStatus, setSettlementsStatus] = useState('idle')
  const [createStatus, setCreateStatus] = useState('idle')
  const [createErrorMessage, setCreateErrorMessage] = useState('')
  const [reportStatus, setReportStatus] = useState('idle')
  const [reportErrorMessage, setReportErrorMessage] = useState('')

  const handleDelete = async () => {
    setDeleteErrorMessage('')
    try {
      await deleteSubscription(id)
      navigate('/')
    } catch (error) {
      setDeleteErrorMessage(error.message)
    }
  }

  const handleCopyLink = async (joinUrl) => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 접근이 막힌 환경 — 화면에 보이는 링크 텍스트로 수동 복사 가능
    }
  }

  const handleRemoveMember = async () => {
    setRemoveErrorMessage('')
    try {
      await deleteMember(id, memberToRemove.id)
      setMembers((prev) => prev.filter((member) => member.id !== memberToRemove.id))
      setMemberToRemove(null)
    } catch (error) {
      setRemoveErrorMessage(error.message)
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

  useEffect(() => {
    if (status !== 'success' || subscription.role !== 'owner') return

    getMembers(id)
      .then((items) => {
        setMembers(items)
        setMembersStatus('success')
      })
      .catch(() => {
        setMembersStatus('error')
      })
  }, [id, status, subscription?.role])

  useEffect(() => {
    if (status !== 'success') return

    getSettlements(id)
      .then((items) => {
        setSettlements(items)
        setSettlementsStatus('success')
      })
      .catch(() => {
        setSettlementsStatus('error')
      })
  }, [id, status])

  const handleCreateSettlement = async () => {
    setCreateStatus('submitting')
    setCreateErrorMessage('')
    try {
      const settlement = await createSettlement(id)
      navigate(`/subscriptions/${id}/settlements/${settlement.id}`)
    } catch (error) {
      setCreateErrorMessage(error.message)
      setCreateStatus('error')
    }
  }

  const handleReport = async (settlementId, settlementMemberId) => {
    setReportStatus('submitting')
    setReportErrorMessage('')
    try {
      await reportSettlementMember(id, settlementId, settlementMemberId)
      const items = await getSettlements(id)
      setSettlements(items)
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
    content = <LoginRequired message="로그인 후 파티 상세 정보를 확인할 수 있어요." />
  } else if (status === 'notfound') {
    content = <p className="subscription-detail-message">존재하지 않는 파티예요.</p>
  } else if (status === 'forbidden') {
    content = <p className="subscription-detail-message">해당 파티의 파티장 또는 파티원만 볼 수 있어요.</p>
  } else if (status === 'error') {
    content = <p className="subscription-detail-message">{errorMessage}</p>
  } else {
    const { serviceName, subAmount, billingDay, memberCount, myAmount, role, bankAccount, joinUrl } = subscription
    const latestSettlement = role !== 'owner' && settlements.length > 0 ? settlements[0] : null

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
            <p className="detail-section-title">파티원 ({members.length}명)</p>
            {membersStatus === 'idle' && <p className="member-list-message">불러오는 중...</p>}
            {membersStatus === 'error' && <p className="member-list-message">파티원 목록을 불러오지 못했어요.</p>}
            {membersStatus === 'success' && members.length === 0 && (
              <p className="member-list-message">아직 가입한 파티원이 없어요.</p>
            )}
            {membersStatus === 'success' && members.length > 0 && (
              <ul className="member-list">
                {members.map((member) => (
                  <li key={member.id} className="member-list-item">
                    <div className="member-info">
                      <p className="member-name">{member.name}</p>
                      <p className="member-joined-at">
                        {new Date(member.joinedAt).toLocaleDateString()} 가입
                      </p>
                    </div>
                    <button
                      type="button"
                      className="member-remove-btn"
                      onClick={() => setMemberToRemove(member)}
                    >
                      내보내기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="subscription-detail-card">
          {latestSettlement && (
            <div className="settlement-current">
              <div className="settlement-section-header">
                <span className="detail-section-title">{billingMonthLabel(latestSettlement.billingMonth)} 정산</span>
                <span className={`member-status ${latestSettlement.myStatus}`}>
                  {settlementStatusLabel(latestSettlement.myStatus, latestSettlement.myReportedAt)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">정산 금액</span>
                <span className="detail-value">{latestSettlement.myAmount.toLocaleString()}원</span>
              </div>
              {reportErrorMessage && <p className="form-error">{reportErrorMessage}</p>}
              {latestSettlement.myStatus === 'pending' && (
                <div className="settlement-current-actions">
                  <a className="toss-transfer-btn" href={latestSettlement.myTransferLink}>
                    토스로 이체하기
                  </a>
                  <button
                    type="button"
                    className="confirm-request-btn"
                    disabled={reportStatus === 'submitting' || Boolean(latestSettlement.myReportedAt)}
                    onClick={() => handleReport(latestSettlement.id, latestSettlement.mySettlementMemberId)}
                  >
                    {latestSettlement.myReportedAt ? '확인 요청 완료' : '이체 확인 요청'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="settlement-section-header">
            <p className="detail-section-title">정산 이력</p>
            {role === 'owner' && (
              <button
                type="button"
                className="settlement-start-btn"
                onClick={handleCreateSettlement}
                disabled={createStatus === 'submitting'}
              >
                {createStatus === 'submitting' ? '생성 중...' : '이번 달 정산 시작'}
              </button>
            )}
          </div>
          {createStatus === 'error' && <p className="form-error">{createErrorMessage}</p>}
          {settlementsStatus === 'idle' && <p className="member-list-message">불러오는 중...</p>}
          {settlementsStatus === 'error' && <p className="member-list-message">정산 이력을 불러오지 못했어요.</p>}
          {settlementsStatus === 'success' && settlements.length === 0 && (
            <p className="member-list-message">아직 정산 이력이 없어요.</p>
          )}
          {settlementsStatus === 'success' && settlements.length > 0 && (
            <ul className="settlement-list">
              {settlements.map((settlement) =>
                role === 'owner' ? (
                  <li key={settlement.id}>
                    <Link to={`/subscriptions/${id}/settlements/${settlement.id}`} className="settlement-list-item">
                      <span className="settlement-month">{billingMonthLabel(settlement.billingMonth)}</span>
                      <span className="detail-value">
                        {settlement.doneCount}/{settlement.memberCount}명 완료
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={settlement.id} className="settlement-list-item">
                    <span className="settlement-month">{billingMonthLabel(settlement.billingMonth)}</span>
                    <span className="settlement-my-summary">
                      <span className="detail-value">{settlement.myAmount.toLocaleString()}원</span>
                      <span className={`member-status ${settlement.myStatus}`}>
                        {settlementStatusLabel(settlement.myStatus, settlement.myReportedAt)}
                      </span>
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
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
      <div className="subscription-detail-topbar">
        <Link to="/" className="back-link">← 메인으로</Link>
        {status === 'success' && subscription.role === 'owner' && (
          <div className="detail-header-actions">
            <Link to={`/subscriptions/${id}/edit`} className="detail-action-btn">
              수정
            </Link>
            <button
              type="button"
              className="detail-action-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              삭제
            </button>
          </div>
        )}
      </div>
      {content}
      {showDeleteConfirm && (
        <ConfirmDialog
          message={'정말 삭제할까요?\n가입한 파티원 정보도 함께 삭제됩니다.'}
          confirmLabel="삭제"
          errorMessage={deleteErrorMessage}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {memberToRemove && (
        <ConfirmDialog
          message={`${memberToRemove.name}님을 파티에서 내보낼까요?`}
          confirmLabel="내보내기"
          errorMessage={removeErrorMessage}
          onConfirm={handleRemoveMember}
          onCancel={() => {
            setMemberToRemove(null)
            setRemoveErrorMessage('')
          }}
        />
      )}
    </div>
  )
}

export default SubscriptionDetail
