// 프로토타입(demo_11.html)의 donutSvg()를 그대로 포팅 — Recharts 대신 순수 SVG (CLAUDE.md 확정 사항).
function DonutChart({ ratio, matched, total }) {
  const r = 60
  const c = 2 * Math.PI * r
  const okLen = c * ratio

  return (
    <div className="donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#3a3a3a" strokeWidth="16" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#7fd9a8"
          strokeWidth="16"
          strokeDasharray={`${okLen} ${c - okLen}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          transform="scale(1,-1) translate(0,-140)"
        />
      </svg>
      <div className="donut-center">
        <span className="rate mono">{Math.round(ratio * 100)}%</span>
        <span className="frac mono">
          {matched} / {total}건
        </span>
      </div>
    </div>
  )
}

export default DonutChart
