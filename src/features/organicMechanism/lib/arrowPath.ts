import type { AtomIndex, CurlyArrow } from '../data/types'

type Point = { x: number; y: number }

const BEND_MAGNITUDE = 24
// 화살표 머리가 원자 라벨을 가리지 않도록 뒤로 당기는 거리. 고정값이면 결합
// 길이가 짧은 분자(SN2 등)에서 화살표 길이 대부분을 머리가 차지해버리므로,
// 화살표 자체 길이에 비례해 당기되 너무 길게 당기지 않도록 상한을 둔다.
const HEAD_PULLBACK_RATIO = 0.28
const HEAD_PULLBACK_MAX = 12

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function sourcePoint(arrow: CurlyArrow, coords: Map<AtomIndex, Point>): Point | null {
  const { source } = arrow
  if (source.kind === 'lone-pair') {
    return coords.get(source.atom) ?? null
  }
  const [a, b] = source.atoms
  const pa = coords.get(a)
  const pb = coords.get(b)
  if (!pa || !pb) return null
  return midpoint(pa, pb)
}

/** Builds an SVG path `d` string for a curved (quadratic bezier) curly arrow. */
export function buildArrowPath(arrow: CurlyArrow, coords: Map<AtomIndex, Point>): string | null {
  const tail = sourcePoint(arrow, coords)
  const rawHead = coords.get(arrow.target)
  if (!tail || !rawHead) return null

  const dx = rawHead.x - tail.x
  const dy = rawHead.y - tail.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length

  // pull the head back off the atom so the marker arrowhead doesn't overlap the atom label
  const pullback = Math.min(HEAD_PULLBACK_MAX, length * HEAD_PULLBACK_RATIO)
  const head = { x: rawHead.x - ux * pullback, y: rawHead.y - uy * pullback }

  const sign = arrow.bend === 'left' ? -1 : 1
  const perp = { x: -uy, y: ux }
  const mid = midpoint(tail, head)
  const control = {
    x: mid.x + perp.x * BEND_MAGNITUDE * sign,
    y: mid.y + perp.y * BEND_MAGNITUDE * sign,
  }

  return `M ${tail.x} ${tail.y} Q ${control.x} ${control.y} ${head.x} ${head.y}`
}

const LONE_PAIR_PULLBACK = 13
const LONE_PAIR_SEPARATION = 3

/**
 * For a lone-pair-sourced arrow, returns two points approximating the electron
 * pair as a pair of dots near the source atom — pulled back on the side facing
 * away from the target, since a real lone pair points away from where it's
 * about to attack. Not a real bond-geometry calculation (we don't track bond
 * directions), just a reasonable approximation for a first-pass visual aid.
 */
export function getLonePairDots(
  arrow: CurlyArrow,
  coords: Map<AtomIndex, Point>,
): [Point, Point] | null {
  if (arrow.source.kind !== 'lone-pair') return null
  const atomPos = coords.get(arrow.source.atom)
  const targetPos = coords.get(arrow.target)
  if (!atomPos || !targetPos) return null

  const dx = targetPos.x - atomPos.x
  const dy = targetPos.y - atomPos.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const perpX = -uy
  const perpY = ux

  const backX = atomPos.x - ux * LONE_PAIR_PULLBACK
  const backY = atomPos.y - uy * LONE_PAIR_PULLBACK

  return [
    { x: backX + perpX * LONE_PAIR_SEPARATION, y: backY + perpY * LONE_PAIR_SEPARATION },
    { x: backX - perpX * LONE_PAIR_SEPARATION, y: backY - perpY * LONE_PAIR_SEPARATION },
  ]
}

/** Every atom index touched by this step's arrows (source and target) — the "reacting" atoms. */
export function getHighlightedAtoms(arrows: CurlyArrow[]): AtomIndex[] {
  const indices = new Set<AtomIndex>()
  for (const arrow of arrows) {
    if (arrow.source.kind === 'lone-pair') {
      indices.add(arrow.source.atom)
    } else {
      indices.add(arrow.source.atoms[0])
      indices.add(arrow.source.atoms[1])
    }
    indices.add(arrow.target)
  }
  return Array.from(indices)
}
