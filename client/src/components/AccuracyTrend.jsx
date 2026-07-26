import { computeRecentAccuracy } from "../constants/decisionStats.js"

export default function AccuracyTrend({ decisions }) {
  if (decisions.length === 0) return null

  const { total, hitCount, ratePercent, blocks } = computeRecentAccuracy(decisions, 10)

  return (
    <div className="accuracy-trend">
      <p className="accuracy-trend-text">
        {ratePercent === null
          ? `최근 ${total}건은 아직 판정 불가예요`
          : `최근 ${total}건 중 적중 ${hitCount}건 (${ratePercent}%)`}
      </p>
      <div className="spark-row">
        {blocks.map((block) => (
          <span
            key={block.id}
            className={`spark-block ${block.result}`}
            title={new Date(block.createdAt).toLocaleDateString("ko-KR")}
          />
        ))}
      </div>
    </div>
  )
}
