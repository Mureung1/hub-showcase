import type { TraversalOrder, TreeStep } from '../types'
import type { BuiltTreeNode } from './buildTree'
import { INSERT_LINES, TRAVERSAL_LINES } from '../data/pseudocode'

/** Collects every node value and parent-child edge in the tree, in preorder. */
function flattenTree(root: BuiltTreeNode): { nodes: number[]; edges: [number, number][] } {
  const nodes: number[] = []
  const edges: [number, number][] = []
  const walk = (node: BuiltTreeNode | null, parent: BuiltTreeNode | null) => {
    if (!node) return
    nodes.push(node.value)
    if (parent) edges.push([parent.value, node.value])
    walk(node.left, node)
    walk(node.right, node)
  }
  walk(root, null)
  return { nodes, edges }
}

/** Steps for animating the tree being built up, node by node, from an empty tree. */
export function generateInsertSteps(insertionOrder: number[]): TreeStep[] {
  const steps: TreeStep[] = []
  const builtNodes: number[] = []
  const builtEdges: [number, number][] = []

  const snapshot = (extra: Partial<TreeStep> & Pick<TreeStep, 'phase' | 'description'>): TreeStep => ({
    builtNodes: [...builtNodes],
    builtEdges: [...builtEdges],
    visitedNodes: [],
    ...extra,
  })

  let root: BuiltTreeNode | null = null
  for (let i = 0; i < insertionOrder.length; i++) {
    const value = insertionOrder[i]
    const upcomingValues = insertionOrder.slice(i + 1)

    if (!root) {
      root = { value, left: null, right: null }
      builtNodes.push(value)
      steps.push(
        snapshot({
          phase: 'insert',
          highlightNode: value,
          upcomingValues,
          description: `${value}을(를) 루트로 삽입합니다.`,
          line: INSERT_LINES.insertRoot,
        }),
      )
      continue
    }

    let current: BuiltTreeNode = root
    while (true) {
      steps.push(
        snapshot({
          phase: 'insert',
          highlightNode: current.value,
          pendingValue: value,
          pendingAnchor: current.value,
          upcomingValues,
          description: `${value}과(와) ${current.value}을(를) 비교합니다.`,
          line: INSERT_LINES.compare,
        }),
      )

      const goLeft = value < current.value
      const child = goLeft ? current.left : current.right

      if (!child) {
        const newNode: BuiltTreeNode = { value, left: null, right: null }
        if (goLeft) current.left = newNode
        else current.right = newNode
        builtNodes.push(value)
        builtEdges.push([current.value, value])
        steps.push(
          snapshot({
            phase: 'insert',
            highlightNode: value,
            highlightEdge: [current.value, value],
            upcomingValues,
            description: goLeft
              ? `${value} < ${current.value} — 왼쪽 자식으로 삽입합니다.`
              : `${value} >= ${current.value} — 오른쪽 자식으로 삽입합니다.`,
            line: goLeft ? INSERT_LINES.goLeft : INSERT_LINES.goRight,
          }),
        )
        break
      }

      steps.push(
        snapshot({
          phase: 'insert',
          highlightEdge: [current.value, child.value],
          pendingValue: value,
          pendingAnchor: current.value,
          upcomingValues,
          description: goLeft
            ? `${value} < ${current.value} — 왼쪽으로 이동합니다.`
            : `${value} >= ${current.value} — 오른쪽으로 이동합니다.`,
          line: goLeft ? INSERT_LINES.goLeft : INSERT_LINES.goRight,
        }),
      )
      current = child
    }
  }

  return steps
}

/** Steps for animating a traversal over an already-complete tree (structure never changes). */
export function generateTraversalSteps(root: BuiltTreeNode, traversal: TraversalOrder): TreeStep[] {
  const steps: TreeStep[] = []
  const { nodes, edges } = flattenTree(root)

  const snapshot = (extra: Partial<TreeStep> & Pick<TreeStep, 'phase' | 'description' | 'visitedNodes'>): TreeStep => ({
    builtNodes: nodes,
    builtEdges: edges,
    ...extra,
  })

  steps.push(
    snapshot({
      phase: 'traverse',
      visitedNodes: [],
      description: '트리 순회를 시작합니다.',
    }),
  )

  const visited: number[] = []
  const lines = TRAVERSAL_LINES[traversal]

  if (traversal === 'levelorder') {
    const queue: BuiltTreeNode[] = [root]
    while (queue.length) {
      const node = queue.shift()!
      steps.push(
        snapshot({
          phase: 'traverse',
          highlightNode: node.value,
          visitedNodes: [...visited],
          description: `${node.value} 노드를 방문합니다.`,
          line: lines.visit,
        }),
      )
      visited.push(node.value)

      if (node.left) {
        steps.push(
          snapshot({
            phase: 'traverse',
            highlightEdge: [node.value, node.left.value],
            visitedNodes: [...visited],
            description: `${node.left.value}을(를) 큐에 넣습니다.`,
            line: lines.left,
          }),
        )
        queue.push(node.left)
      }
      if (node.right) {
        steps.push(
          snapshot({
            phase: 'traverse',
            highlightEdge: [node.value, node.right.value],
            visitedNodes: [...visited],
            description: `${node.right.value}을(를) 큐에 넣습니다.`,
            line: lines.right,
          }),
        )
        queue.push(node.right)
      }
    }
  } else {
    const visit = (node: BuiltTreeNode) => {
      steps.push(
        snapshot({
          phase: 'traverse',
          highlightNode: node.value,
          visitedNodes: [...visited],
          description: `${node.value} 노드를 방문합니다.`,
          line: lines.visit,
        }),
      )
      visited.push(node.value)
    }

    const walk = (node: BuiltTreeNode | null, parentValue: number | null, viaLeft: boolean) => {
      if (!node) return
      if (parentValue !== null) {
        steps.push(
          snapshot({
            phase: 'traverse',
            highlightEdge: [parentValue, node.value],
            visitedNodes: [...visited],
            description: `${node.value}(으)로 내려갑니다.`,
            line: viaLeft ? lines.left : lines.right,
          }),
        )
      }
      if (traversal === 'preorder') visit(node)
      walk(node.left, node.value, true)
      if (traversal === 'inorder') visit(node)
      walk(node.right, node.value, false)
      if (traversal === 'postorder') visit(node)
    }
    walk(root, null, false)
  }

  steps.push(
    snapshot({
      phase: 'done',
      visitedNodes: [...visited],
      description: `순회 완료 — 방문 순서: ${visited.join(' → ')}`,
    }),
  )

  return steps
}
