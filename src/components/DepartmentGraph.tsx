import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NAVIGATION } from '../data/navigation'

interface GraphLeaf {
  id: string
  label: string
  to?: string
}

interface GraphDept {
  id: string
  label: string
  angle: number
  color: string
  implemented: boolean
  leaves: GraphLeaf[]
}

const REAL_DEPT_META: Record<string, { angle: number; color: string }> = {
  cs: { angle: 0, color: 'var(--dept-cs)' },
  chem: { angle: 240, color: 'var(--dept-chem)' },
}

const FUTURE_DEPARTMENTS: GraphDept[] = [
  {
    id: 'math',
    label: '수학과',
    angle: 60,
    color: 'var(--dept-math)',
    implemented: false,
    leaves: [
      { id: 'linalg', label: '선형대수학' },
      { id: 'calculus', label: '미적분학' },
      { id: 'probstat', label: '확률과통계' },
      { id: 'discretemath', label: '이산수학' },
    ],
  },
  {
    id: 'ee',
    label: '전자공학과',
    angle: 120,
    color: 'var(--dept-ee)',
    implemented: false,
    leaves: [
      { id: 'circuit', label: '회로이론' },
      { id: 'digitallogic', label: '디지털논리' },
      { id: 'signals', label: '신호및시스템' },
      { id: 'semicon', label: '반도체공학' },
    ],
  },
  {
    id: 'physics',
    label: '물리학과',
    angle: 180,
    color: 'var(--dept-physics)',
    implemented: false,
    leaves: [
      { id: 'quantum', label: '양자역학' },
      { id: 'classmech', label: '고전역학' },
      { id: 'emag', label: '전자기학' },
      { id: 'thermo', label: '열역학' },
    ],
  },
  {
    id: 'bio',
    label: '생명과학과',
    angle: 300,
    color: 'var(--dept-bio)',
    implemented: false,
    leaves: [
      { id: 'genetics', label: '유전학' },
      { id: 'cellbio', label: '세포생물학' },
      { id: 'molbio', label: '분자생물학' },
      { id: 'biochem', label: '생화학' },
    ],
  },
]

const CROSS_LINKS: [string, string][] = [
  ['sort', 'discretemath'],
  ['physchem', 'quantum'],
  ['orgchem', 'biochem'],
]

const CENTER = { x: 500, y: 390 }
const TRUNK_RADIUS = 190
const TRUNK_LABEL_OFFSET = 30
const LEAF_RADIUS = 330
const LEAF_LABEL_OFFSET = 20
const LEAF_SPREAD = 22

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER.x + radius * Math.sin(rad), y: CENTER.y - radius * Math.cos(rad) }
}

function labelAnchor(angleDeg: number): 'start' | 'middle' | 'end' {
  const rad = (angleDeg * Math.PI) / 180
  const sin = Math.sin(rad)
  if (sin > 0.25) return 'start'
  if (sin < -0.25) return 'end'
  return 'middle'
}

function curvedPath(from: { x: number; y: number }, to: { x: number; y: number }, bow: number) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const cx = mx + nx * bow
  const cy = my + ny * bow
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

export default function DepartmentGraph() {
  const navigate = useNavigate()
  const [hoveredLeaf, setHoveredLeaf] = useState<string | null>(null)
  const [hoveredDept, setHoveredDept] = useState<string | null>(null)
  const [lockedDept, setLockedDept] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const departments: GraphDept[] = useMemo(() => {
    const real: GraphDept[] = NAVIGATION.map((dept) => ({
      id: dept.id,
      label: dept.label,
      angle: REAL_DEPT_META[dept.id]?.angle ?? 0,
      color: REAL_DEPT_META[dept.id]?.color ?? 'var(--dept-cs)',
      implemented: true,
      leaves: dept.groups.flatMap((group) => group.leaves).map((leaf) => ({
        id: leaf.id,
        label: leaf.shortLabel ?? leaf.label,
        to: leaf.to,
      })),
    }))
    return [...real, ...FUTURE_DEPARTMENTS]
  }, [])

  const layout = useMemo(() => {
    const trunks = new Map<string, { x: number; y: number; labelX: number; labelY: number; anchor: string }>()
    const leaves = new Map<
      string,
      { x: number; y: number; labelX: number; labelY: number; anchor: string; deptId: string; angle: number }
    >()

    for (const dept of departments) {
      const trunkPos = polar(dept.angle, TRUNK_RADIUS)
      const trunkLabelPos = polar(dept.angle, TRUNK_RADIUS + TRUNK_LABEL_OFFSET)
      trunks.set(dept.id, {
        ...trunkPos,
        labelX: trunkLabelPos.x,
        labelY: trunkLabelPos.y,
        anchor: labelAnchor(dept.angle),
      })

      const n = dept.leaves.length
      dept.leaves.forEach((leaf, i) => {
        const leafAngle = n === 1 ? dept.angle : dept.angle - LEAF_SPREAD + (2 * LEAF_SPREAD * i) / (n - 1)
        const leafPos = polar(leafAngle, LEAF_RADIUS)
        const labelPos = polar(leafAngle, LEAF_RADIUS + LEAF_LABEL_OFFSET)
        leaves.set(leaf.id, {
          ...leafPos,
          labelX: labelPos.x,
          labelY: labelPos.y,
          anchor: labelAnchor(leafAngle),
          deptId: dept.id,
          angle: leafAngle,
        })
      })
    }

    return { trunks, leaves }
  }, [departments])

  const allLeaves = useMemo(() => departments.flatMap((d) => d.leaves.map((l) => ({ ...l, deptId: d.id }))), [
    departments,
  ])

  const q = query.trim().toLowerCase()
  const search = useMemo(() => {
    if (!q) return null
    const deptNameMatch = new Set(departments.filter((d) => d.label.toLowerCase().includes(q)).map((d) => d.id))
    const leafNameMatch = new Set(allLeaves.filter((l) => l.label.toLowerCase().includes(q)).map((l) => l.id))
    const leafDeptMatch = new Set(allLeaves.filter((l) => leafNameMatch.has(l.id)).map((l) => l.deptId))
    const matchedDepts = new Set([...deptNameMatch, ...leafDeptMatch])
    const matchedLeaves = new Set(
      allLeaves.filter((l) => leafNameMatch.has(l.id) || deptNameMatch.has(l.deptId)).map((l) => l.id),
    )
    return { matchedDepts, matchedLeaves, deptNameMatch }
  }, [q, departments, allLeaves])

  const matchedIds = search?.matchedLeaves ?? null
  const matchedDeptIds = search?.matchedDepts ?? null

  const activeDept = query ? null : lockedDept ?? hoveredDept

  function deptOpacity(deptId: string) {
    if (matchedDeptIds) return matchedDeptIds.has(deptId) ? 1 : 0.18
    if (activeDept) return deptId === activeDept ? 1 : 0.18
    return 1
  }
  function leafOpacity(leaf: { id: string }, deptId: string) {
    if (matchedIds) return matchedIds.has(leaf.id) ? 1 : 0.12
    if (activeDept) return deptId === activeDept ? 1 : 0.18
    return 1
  }
  function crossLinkOpacity(a: string, b: string) {
    if (matchedIds) return matchedIds.has(a) || matchedIds.has(b) ? 0.5 : 0.08
    if (activeDept) {
      const depts = [layout.leaves.get(a)?.deptId, layout.leaves.get(b)?.deptId]
      return depts.includes(activeDept) ? 0.5 : 0.08
    }
    return 0.5
  }
  function isHit(id: string) {
    return hoveredLeaf === id || (matchedIds !== null && matchedIds.has(id))
  }
  function isDeptHit(id: string) {
    return hoveredDept === id || (search !== null && search.deptNameMatch.has(id))
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !matchedIds) return
    const matches = allLeaves.filter((l) => matchedIds.has(l.id))
    if (matches.length === 1 && matches[0].to) navigate(matches[0].to)
  }

  return (
    <>
      <div
        className="hidden overflow-hidden rounded-[14px] border lg:block"
        style={{
          borderColor: 'var(--color-border-card)',
          backgroundColor: 'var(--color-bg-page)',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.07), transparent 55%), radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: 'auto, 22px 22px',
        }}
      >
        <svg viewBox="0 0 1000 780" width="100%" style={{ display: 'block', maxHeight: 660 }}>
          {departments.map((dept) => {
            const trunk = layout.trunks.get(dept.id)!
            return (
              <path
                key={`center-${dept.id}`}
                d={curvedPath(CENTER, trunk, dept.angle % 60 === 0 ? 10 : -10)}
                fill="none"
                stroke={dept.color}
                strokeWidth={dept.implemented ? 2 : 1.5}
                strokeDasharray={dept.implemented ? undefined : '3 3'}
                opacity={dept.implemented ? deptOpacity(dept.id) : deptOpacity(dept.id) * 0.7}
                style={dept.implemented ? { filter: `drop-shadow(0 0 5px ${dept.color})` } : undefined}
              />
            )
          })}

          {departments.flatMap((dept) => {
            const trunk = layout.trunks.get(dept.id)!
            return dept.leaves.map((leaf, i) => {
              const pos = layout.leaves.get(leaf.id)!
              const hit = isHit(leaf.id)
              return (
                <path
                  key={`branch-${leaf.id}`}
                  d={curvedPath(trunk, pos, i % 2 === 0 ? 12 : -12)}
                  fill="none"
                  stroke={dept.color}
                  strokeWidth={leaf.to ? 1.5 : 1.3}
                  strokeDasharray={leaf.to ? undefined : '4 4'}
                  opacity={hit ? 1 : leafOpacity(leaf, dept.id) * (leaf.to ? 0.6 : 0.35)}
                  style={hit ? { filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' } : undefined}
                />
              )
            })
          })}

          {CROSS_LINKS.map(([a, b]) => {
            const pa = layout.leaves.get(a)
            const pb = layout.leaves.get(b)
            if (!pa || !pb) return null
            return (
              <path
                key={`cross-${a}-${b}`}
                d={curvedPath(pa, pb, 16)}
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth={1.2}
                strokeDasharray="3 5"
                opacity={crossLinkOpacity(a, b)}
              />
            )
          })}

          {departments.map((dept) => {
            const trunk = layout.trunks.get(dept.id)!
            return (
              <g key={`trunk-${dept.id}`}>
                <g
                  onMouseEnter={() => setHoveredDept(dept.id)}
                  onMouseLeave={() => setHoveredDept(null)}
                  onClick={() => setLockedDept((cur) => (cur === dept.id ? null : dept.id))}
                  style={{
                    cursor: dept.implemented ? 'pointer' : 'default',
                    opacity: deptOpacity(dept.id),
                    filter: isDeptHit(dept.id)
                      ? 'brightness(1.3) drop-shadow(0 0 16px rgba(255,255,255,0.6))'
                      : dept.implemented
                        ? `drop-shadow(0 0 10px ${dept.color})`
                        : undefined,
                  }}
                >
                  <circle
                    cx={trunk.x}
                    cy={trunk.y}
                    r={dept.implemented ? 18 : 14}
                    fill={dept.implemented ? `color-mix(in srgb, ${dept.color} 14%, transparent)` : `color-mix(in srgb, ${dept.color} 12%, transparent)`}
                    stroke={dept.color}
                    strokeWidth={dept.implemented ? 2 : 1.5}
                    strokeDasharray={dept.implemented ? undefined : '3 3'}
                    opacity={dept.implemented ? 1 : 0.7}
                  />
                </g>
                <text
                  x={trunk.labelX}
                  y={trunk.labelY}
                  textAnchor={trunk.anchor as 'start' | 'middle' | 'end'}
                  fontSize={dept.implemented ? 13 : 12}
                  fontWeight={dept.implemented ? 500 : 400}
                  fill={isDeptHit(dept.id) ? 'var(--color-text-primary)' : dept.implemented ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
                  opacity={deptOpacity(dept.id)}
                  style={{ pointerEvents: 'none' }}
                >
                  {dept.label}
                </text>
              </g>
            )
          })}

          {departments.flatMap((dept) =>
            dept.leaves.map((leaf) => {
              const pos = layout.leaves.get(leaf.id)!
              const hit = isHit(leaf.id)
              const enabled = Boolean(leaf.to)
              return (
                <g key={`leaf-${leaf.id}`}>
                  <g
                    onMouseEnter={() => setHoveredLeaf(leaf.id)}
                    onMouseLeave={() => setHoveredLeaf((cur) => (cur === leaf.id ? null : cur))}
                    onClick={() => leaf.to && navigate(leaf.to)}
                    style={{
                      cursor: enabled ? 'pointer' : 'default',
                      opacity: hit ? 1 : leafOpacity(leaf, dept.id),
                      filter: hit ? 'brightness(1.3) drop-shadow(0 0 14px rgba(255,255,255,0.6))' : undefined,
                    }}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={enabled ? 12 : 9}
                      fill={enabled ? `color-mix(in srgb, ${dept.color} 10%, transparent)` : '#0b0d12'}
                      stroke={dept.color}
                      strokeWidth={enabled ? 1.5 : 1.3}
                      strokeDasharray={enabled ? undefined : '3 3'}
                    />
                  </g>
                  <text
                    x={pos.labelX}
                    y={pos.labelY}
                    textAnchor={pos.anchor as 'start' | 'middle' | 'end'}
                    fontSize={enabled ? 10.5 : 9.5}
                    fill={hit ? 'var(--color-text-primary)' : enabled ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'}
                    opacity={hit ? 1 : leafOpacity(leaf, dept.id)}
                    style={{ pointerEvents: 'none' }}
                  >
                    {leaf.label}
                  </text>
                </g>
              )
            }),
          )}

          <foreignObject x={CENTER.x - 95} y={CENTER.y - 23} width={190} height={46}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="검색"
              autoComplete="off"
              className="h-full w-full rounded-[999px] border text-center text-[13px] outline-none"
              style={{
                borderColor: 'rgba(34,211,238,0.4)',
                background: 'rgba(11,13,18,0.94)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 0 0 1px rgba(34,211,238,0.14), 0 0 26px rgba(34,211,238,0.3)',
              }}
            />
          </foreignObject>
        </svg>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {departments
          .filter((d) => d.implemented)
          .map((dept) => (
            <div
              key={dept.id}
              className="rounded-[16px] border p-4"
              style={{ borderColor: 'var(--color-border-card-strong)', background: 'var(--color-bg-card)' }}
            >
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {dept.label}
              </h2>
              <ul className="mt-2 space-y-1">
                {dept.leaves.map((leaf) => (
                  <li key={leaf.id}>
                    {leaf.to ? (
                      <button
                        onClick={() => navigate(leaf.to!)}
                        className="text-sm underline-offset-2 hover:underline"
                        style={{ color: 'var(--color-accent-text)' }}
                      >
                        {leaf.label}
                      </button>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {leaf.label} · 준비 중
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </>
  )
}
