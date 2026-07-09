export default function TrustBadge({ score }) {
  return (
    <span className="trust-badge">
      신뢰도 <strong>{score.toFixed(1)}</strong>
    </span>
  )
}
