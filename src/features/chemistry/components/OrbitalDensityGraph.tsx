// H₂ 결합: 두 1s 파동함수(ψ ∝ e^-r, 정성적 형태)를 실제로 계산해 핵간축 위의
// 확률밀도를 그린다. 기준선(겹치지 않는다고 가정한 단순 합 φ_A²+φ_B²)과 실제
// 결합성 조합의 밀도((φ_A+φ_B)²)를 비교해, "겹쳐서 진해 보이는 것"이 아니라
// "파동함수 보강간섭으로 실제 값이 기준선보다 커지는 것"을 보여준다.
// chemistry-reviewer 사전 검증 통과 — 그래프는 손으로 그린 개형이 아니라 아래
// 수식으로 실제 계산한 값을 그린다.

const BOND_LENGTH = 1.4 // 핵간 거리 R (Bohr 단위 근사, 실제 H2 평형거리)
const DOMAIN_MIN = -3.2
const DOMAIN_MAX = 3.2
const SAMPLE_COUNT = 97

const WIDTH = 320
const HEIGHT = 190
const MARGIN_LEFT = 24
const MARGIN_RIGHT = 24
const MARGIN_TOP = 16
const MARGIN_BOTTOM = 34
const PLOT_WIDTH = WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const PLOT_HEIGHT = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

function phi(x: number, nucleusX: number) {
  return Math.exp(-Math.abs(x - nucleusX))
}

function samplePoints() {
  const xs: number[] = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    xs.push(DOMAIN_MIN + (i / (SAMPLE_COUNT - 1)) * (DOMAIN_MAX - DOMAIN_MIN))
  }
  const nucleusA = -BOND_LENGTH / 2
  const nucleusB = BOND_LENGTH / 2
  const baseline = xs.map((x) => phi(x, nucleusA) ** 2 + phi(x, nucleusB) ** 2)
  const bonding = xs.map((x) => (phi(x, nucleusA) + phi(x, nucleusB)) ** 2)
  return { xs, baseline, bonding, nucleusA, nucleusB }
}

function toPx(x: number) {
  return MARGIN_LEFT + ((x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * PLOT_WIDTH
}

export default function OrbitalDensityGraph() {
  const { xs, baseline, bonding, nucleusA, nucleusB } = samplePoints()
  const maxY = Math.max(...bonding)
  const toPy = (y: number) => MARGIN_TOP + (1 - y / maxY) * PLOT_HEIGHT
  const baseY = MARGIN_TOP + PLOT_HEIGHT

  const bondingPath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${toPx(x)} ${toPy(bonding[i])}`).join(' ')
  const baselinePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${toPx(x)} ${toPy(baseline[i])}`).join(' ')
  const fillPath =
    bondingPath +
    ' ' +
    xs
      .slice()
      .reverse()
      .map((x, i) => `L ${toPx(x)} ${toPy(baseline[xs.length - 1 - i])}`)
      .join(' ') +
    ' Z'

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label="H2 결합 형성 — 핵간축 위 전자 확률밀도, 기준선 대비 실제 증가분"
    >
      {/* 축 */}
      <line x1={MARGIN_LEFT} y1={baseY} x2={WIDTH - MARGIN_RIGHT} y2={baseY} stroke="var(--color-text-muted)" strokeWidth={1} />

      {/* 기준선(겹치지 않는다고 가정한 단순 합) vs 실제 결합 밀도 사이 — 증가분 */}
      <path d={fillPath} fill="#22d3ee" opacity={0.28} />
      <path d={baselinePath} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.3} strokeDasharray="4 3" />
      <path d={bondingPath} fill="none" stroke="#22d3ee" strokeWidth={2} />

      {/* 핵 위치 표시 */}
      {[nucleusA, nucleusB].map((nx) => (
        <g key={nx}>
          <circle cx={toPx(nx)} cy={baseY} r={3.5} fill="#f5f6f8" />
          <text x={toPx(nx)} y={baseY + 16} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">
            H
          </text>
        </g>
      ))}

      <text x={MARGIN_LEFT} y={MARGIN_TOP - 4} fontSize={9.5} fill="var(--color-text-secondary)">
        실제 밀도 (φ_A+φ_B)²
      </text>
      <text x={WIDTH - MARGIN_RIGHT} y={MARGIN_TOP - 4} fontSize={9.5} textAnchor="end" fill="var(--color-text-muted)">
        기준선 φ_A²+φ_B²
      </text>
    </svg>
  )
}
