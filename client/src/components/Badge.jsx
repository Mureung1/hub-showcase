const LABELS = { buy: "🐂 Bullish", hold: "➖ Neutral", sell: "🐻 Bearish" }

export default function Badge({ decision }) {
  return <span className={`badge ${decision}`}>{LABELS[decision] ?? decision}</span>
}
