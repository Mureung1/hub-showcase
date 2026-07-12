const LABELS = { buy: "📈 매수", hold: "➖ 관망", sell: "📉 매도" }

export default function Badge({ decision }) {
  return <span className={`badge ${decision}`}>{LABELS[decision] ?? decision}</span>
}
