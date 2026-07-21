// 프로토타입(demo_13.html)의 donutSvg()를 그대로 포팅 — Recharts 대신 순수 SVG (CLAUDE.md 확정 사항).
// stroke는 --donut-no/--donut-ok 토큰을 참조해서 다크모드 전환 시에도 자동으로 값이 바뀐다 (#22).
function DonutChart({ ratio, matched, total }) {
  const r = 60
  const c = 2 * Math.PI * r
  const okLen = c * ratio

  return (
    <div className="donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--donut-no)" strokeWidth="16" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--donut-ok)"
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
