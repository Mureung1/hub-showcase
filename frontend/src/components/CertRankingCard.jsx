const EMPHASIS_META = {
  ESSENTIAL: { label: '필수', className: 'cert-card--essential' },
  PREFERRED: { label: '우대', className: 'cert-card--preferred' },
  LOW: { label: '언급 적음', className: 'cert-card--low' },
}

function relativeComparisonText(rank, mentionCount, topRelativePercent) {
  if (mentionCount === 0) {
    return null
  }
  if (rank === 1) {
    return '이 직무에서 가장 많이 언급됨'
  }
  return `1위 대비 ${topRelativePercent}%`
}

function CertRankingCard({
  certificationName,
  issuer,
  mentionCount,
  totalPostingCount,
  mentionRatePercent,
  emphasis,
  rank,
  topRelativePercent,
}) {
  const meta = EMPHASIS_META[emphasis] ?? EMPHASIS_META.LOW
  const relativeText = relativeComparisonText(rank, mentionCount, topRelativePercent)

  return (
    <div className={`cert-card ${meta.className}`}>
      <div className="cert-card__top">
        <div className="cert-card__name">{certificationName}</div>
        <div className="cert-card__rate">{rank}위</div>
      </div>
      {relativeText && <div className="cert-card__relative">{relativeText}</div>}
      <div className="cert-card__meta">
        <span className="cert-card__tag">{meta.label}</span>
        <span className="cert-card__count">
          공고 {totalPostingCount}건 중 {mentionCount}건({mentionRatePercent}%) · {issuer}
        </span>
      </div>
      <div className="cert-card__bar">
        <div className="cert-card__bar-fill" style={{ width: `${topRelativePercent}%` }} />
      </div>
    </div>
  )
}

export default CertRankingCard
