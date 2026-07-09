import type { BuiltTreeNode } from './buildTree'

export interface NodePosition {
  x: number
  y: number
}

const WIDTH = 560
const MARGIN = 40
const DEPTH_SPACING = 70

/**
 * Computes 2D positions for every node: x from its in-order traversal index
 * (guarantees no overlaps for any binary tree shape), y from its depth.
 * Height is derived from the tree's actual max depth so deep/skewed trees
 * (e.g. the 편향트리 dataset) aren't clipped by a fixed viewBox.
 */
export function layoutTree(root: BuiltTreeNode): {
  positions: Map<number, NodePosition>
  width: number
  height: number
} {
  const order: number[] = []
  let maxDepth = 0
  const walkInorder = (node: BuiltTreeNode | null, depth: number) => {
    if (!node) return
    walkInorder(node.left, depth + 1)
    order.push(node.value)
    maxDepth = Math.max(maxDepth, depth)
    walkInorder(node.right, depth + 1)
  }
  walkInorder(root, 0)

  const indexOf = new Map<number, number>()
  order.forEach((v, i) => indexOf.set(v, i))

  const spacingX = order.length > 1 ? (WIDTH - MARGIN * 2) / (order.length - 1) : 0
  const positions = new Map<number, NodePosition>()

  const place = (node: BuiltTreeNode | null, depth: number) => {
    if (!node) return
    const x =
      MARGIN + (order.length > 1 ? (indexOf.get(node.value) ?? 0) * spacingX : WIDTH / 2 - MARGIN)
    const y = MARGIN + depth * DEPTH_SPACING
    positions.set(node.value, { x, y })
    place(node.left, depth + 1)
    place(node.right, depth + 1)
  }
  place(root, 0)

  return { positions, width: WIDTH, height: MARGIN * 2 + maxDepth * DEPTH_SPACING }
}
