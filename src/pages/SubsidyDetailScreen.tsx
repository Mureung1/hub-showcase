import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOnboarding } from '../context/OnboardingContext'
import { getDisplaySubsidies } from '../data/mockSubsidies'
import { getDdayClass } from '../utils/dday'
import './SubsidyDetailScreen.css'

const FALLBACK_APPLY_URL = 'https://www.bizinfo.go.kr'

function getApplyUrl(whereUrl?: string): string {
  return whereUrl ?? FALLBACK_APPLY_URL
}

/** 와이어프레임 `#screen-detail` — 지원금 상세 */
export default function SubsidyDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useOnboarding()
  const bodyRef = useRef<HTMLDivElement>(null)

  const subsidy = useMemo(() => {
    const items = getDisplaySubsidies(profile)
    return items.find((item) => item.id === id)
  }, [id, profile])

  const applyUrl = subsidy ? getApplyUrl(subsidy.whereUrl) : FALLBACK_APPLY_URL

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0)
  }, [id])

  function openApplySite() {
    window.open(applyUrl, '_blank', 'noopener,noreferrer')
  }

  if (!subsidy) {
    return (
      <div className="detail screen">
        <div className="detail-not-found">
          <p>지원금 정보를 찾을 수 없어요.</p>
          <button type="button" onClick={() => navigate('/home')}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const ddayClass = getDdayClass(subsidy.dday)

  return (
    <div className="detail screen">
      <div className="detail-top">
        <button
          type="button"
          className="detail-back"
          onClick={() => navigate('/home')}
        >
          ← 목록으로
        </button>
        <div className="detail-dday-row">
          <span className={`dday ${ddayClass}`}>D-{subsidy.dday}</span>
        </div>
        <div className="detail-title">{subsidy.name}</div>
        <div className="detail-org">{subsidy.org}</div>
      </div>

      <div className="detail-body" ref={bodyRef}>
        <div className="detail-summary">
          <div className="detail-stat">
            <div className="stat-label">지원 금액</div>
            <div className="stat-value blue">{subsidy.amount}</div>
          </div>
          <div className="detail-stat">
            <div className="stat-label">매칭도</div>
            <div className="stat-value blue">{subsidy.match}%</div>
          </div>
          <div className="detail-stat">
            <div className="stat-label">마감일</div>
            <div className="stat-value">{subsidy.deadline}</div>
          </div>
          <div className="detail-stat">
            <div className="stat-label">신청 방식</div>
            <div className="stat-value">{subsidy.method}</div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">
            <span className="sec-icon">✅</span>
            신청 자격
          </div>
          <ul className="detail-list">
            {subsidy.qualifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">
            <span className="sec-icon">📄</span>
            필요 서류
          </div>
          <ul className="detail-list">
            {subsidy.documents.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">
            <span className="sec-icon">🖥️</span>
            신청 방법
          </div>
          <div className="detail-info-box">
            <div className="detail-info-row">
              <span className="info-label">접수 방식</span>
              <span className="info-value">{subsidy.how}</span>
            </div>
            <div className="detail-info-row">
              <span className="info-label">접수처</span>
              <span className="info-value">
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {subsidy.where}
                </a>
              </span>
            </div>
            <div className="detail-info-row">
              <span className="info-label">문의</span>
              <span className="info-value">{subsidy.contact}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-bottom">
        <button type="button" className="btn-apply" onClick={openApplySite}>
          신청하러 가기
        </button>
      </div>
    </div>
  )
}
