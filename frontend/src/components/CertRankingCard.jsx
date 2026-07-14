const EMPHASIS_META = {
  ESSENTIAL: { label: '필수', className: 'cert-card--essential' },
  PREFERRED: { label: '우대', className: 'cert-card--preferred' },
  LOW: { label: '언급 적음', className: 'cert-card--low' },
}

function CertRankingCard({
  certificationName,
  issuer,
  mentionCount,
  totalPostingCount,
  mentionRatePercent,
  emphasis,
}) {
  const meta = EMPHASIS_META[emphasis] ?? EMPHASIS_META.LOW

  return (
    <div className={`cert-card ${meta.className}`}>
      <div className="cert-card__top">
        <div className="cert-card__name">{certificationName}</div>
        <div className="cert-card__rate">{mentionRatePercent}%</div>
      </div>
      <div className="cert-card__meta">
        <span className="cert-card__tag">{meta.label}</span>
        <span className="cert-card__count">
          공고 {totalPostingCount}건 중 {mentionCount}건 · {issuer}
        </span>
      </div>
      <div className="cert-card__bar">
        <div className="cert-card__bar-fill" style={{ width: `${mentionRatePercent}%` }} />
      </div>
    </div>
  )
}

export default CertRankingCard
