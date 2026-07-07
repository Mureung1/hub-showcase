import type { AtomIndex } from '../data/types'

interface DrawnGraph {
  atomIdxToVertexId: number[]
  vertices: { position: { x: number; y: number } }[]
}

/**
 * Reads final 2D layout coordinates for each atom out of a smiles-drawer
 * SvgDrawer's internal graph (`svgDrawer.preprocessor.graph`), keyed by the
 * atom's 0-based index in the SMILES string that was parsed — matching the
 * indices used in `CurlyArrow`.
 *
 * `atomIdxToVertexId` and `vertices[].position` exist on smiles-drawer's
 * runtime Graph class (and its .d.ts) but are not part of the package's
 * documented/stable public API. If arrows stop lining up after upgrading
 * smiles-drawer, check here first.
 */
export function getAtomCoords(graph: unknown): Map<AtomIndex, { x: number; y: number }> {
  const { atomIdxToVertexId, vertices } = graph as DrawnGraph
  const coords = new Map<AtomIndex, { x: number; y: number }>()
  atomIdxToVertexId.forEach((vertexId, atomIdx) => {
    const vertex = vertices[vertexId]
    if (vertex) coords.set(atomIdx, { x: vertex.position.x, y: vertex.position.y })
  })
  return coords
}
