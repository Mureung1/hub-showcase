export type CrossSectionMode = 's' | 'px' | 'py' | 'pz'

const S_PLANES = [
  { id: 'xy', label: 'xy 단면' },
  { id: 'xz', label: 'xz 단면' },
  { id: 'yz', label: 'yz 단면' },
] as const

const AXIS_LABEL: Record<'px' | 'py' | 'pz', string> = { px: 'x', py: 'y', pz: 'z' }

const S_GRADIENT_ID = 'orbital-s-gradient'

/** s 오비탈: 세 단면이 픽셀 단위로 완전히 동일한 원 — "방향에 무관한 구형 대칭"을
 * 회전으로 확인하는 대신, 세 단면이 똑같다는 사실 자체로 증명한다. */
function SOrbitalPanel() {
  return (
    <div className="flex items-center justify-center gap-4">
      {S_PLANES.map((plane) => (
        <div key={plane.id} className="flex flex-col items-center gap-1.5">
          <svg viewBox="0 0 100 100" width={100} height={100} role="img" aria-label={`s 오비탈 ${plane.label}`}>
            <circle cx={50} cy={50} r={44} fill={`url(#${S_GRADIENT_ID})`} />
            <circle cx={50} cy={50} r={3} fill="#f5f6f8" />
          </svg>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {plane.label}
          </span>
        </div>
      ))}
      <svg width={0} height={0}>
        <defs>
          <radialGradient id={S_GRADIENT_ID}>
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

/** p 오비탈: 두 로브 사이 마디(node)를 반투명 3D 곡면 대신 뚜렷한 흰 틈으로 보여주는
 * 2D 단면. 중앙의 점선은 이 단면에서 "선"으로 보이는 마디면(nodal plane) 그 자체다 —
 * 마디가 점이 아니라 이 축에 수직인 평면 전체라는 것은 화면 설명 텍스트에서 명시한다. */
function POrbitalPanel({ axis }: { axis: 'x' | 'y' | 'z' }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 260 180" width={260} height={180} role="img" aria-label={`p${axis} 오비탈 단면, 마디면 표시`}>
        {/* 음(−) 위상 로브 */}
        <path
          d="M 130 90 C 105 60, 55 55, 25 90 C 55 125, 105 120, 130 90 Z"
          fill="#f7931a"
          opacity={0.6}
        />
        {/* 양(+) 위상 로브 */}
        <path
          d="M 130 90 C 155 60, 205 55, 235 90 C 205 125, 155 120, 130 90 Z"
          fill="#22d3ee"
          opacity={0.6}
        />
        {/* 마디면 — 이 단면에서는 선으로 보임 */}
        <line x1={130} y1={25} x2={130} y2={155} stroke="#f5f6f8" strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={130} cy={90} r={3} fill="#f5f6f8" />
        <text x={130} y={18} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">
          마디면 (확률 0)
        </text>
        <text x={20} y={90} fontSize={11} textAnchor="end" fill="var(--color-text-muted)">
          −{axis}
        </text>
        <text x={240} y={90} fontSize={11} fill="var(--color-text-muted)">
          +{axis}
        </text>
      </svg>
    </div>
  )
}

export default function OrbitalCrossSection({ mode }: { mode: CrossSectionMode }) {
  if (mode === 's') return <SOrbitalPanel />
  return <POrbitalPanel axis={AXIS_LABEL[mode] as 'x' | 'y' | 'z'} />
}
