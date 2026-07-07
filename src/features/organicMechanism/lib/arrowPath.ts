import type { AtomIndex, CurlyArrow } from '../data/types'

type Point = { x: number; y: number }

const HEAD_PULLBACK = 9
const BEND_MAGNITUDE = 20

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
  const head = { x: rawHead.x - ux * HEAD_PULLBACK, y: rawHead.y - uy * HEAD_PULLBACK }

  const sign = arrow.bend === 'left' ? -1 : 1
  const perp = { x: -uy, y: ux }
  const mid = midpoint(tail, head)
  const control = {
    x: mid.x + perp.x * BEND_MAGNITUDE * sign,
    y: mid.y + perp.y * BEND_MAGNITUDE * sign,
  }

  return `M ${tail.x} ${tail.y} Q ${control.x} ${control.y} ${head.x} ${head.y}`
}
