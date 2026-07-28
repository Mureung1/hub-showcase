interface RiskAlertBannerProps {
  noShowCount: number
  incidentCounts: {
    abuse: number
    dispute: number
    late: number
    unreasonable: number
  }
  className?: string
}

const RiskAlertBanner = ({
  noShowCount,
  incidentCounts,
  className = '',
}: RiskAlertBannerProps) => {
  const shouldShow = noShowCount >= 3 || incidentCounts.abuse >= 1

  if (!shouldShow) {
    return null
  }

  const abuseCount = incidentCounts.abuse
  const messageParts = [
    noShowCount > 0 ? `노쇼 ${noShowCount}회` : null,
    abuseCount > 0 ? `응대 사건 ${abuseCount}회` : null,
  ].filter(Boolean)
  const message = messageParts.join(' · ')

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-900">
            {message} — 예약금 요청 또는 사전 확인을 권장합니다
          </p>
          <p className="text-xs text-red-700 mt-1">
            이 정보는 참고용 지표이며, 최종 판단은 사장님의 재량에 따릅니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RiskAlertBanner
