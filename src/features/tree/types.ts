export interface TreeNode {
  id: number
  value: number
}

export type TraversalOrder = 'preorder' | 'inorder' | 'postorder' | 'levelorder'

export interface TreeStep {
  phase: 'insert' | 'traverse' | 'done'
  /** Node values that exist in the tree at this point. */
  builtNodes: number[]
  /** Edges (parentValue, childValue) that exist at this point. */
  builtEdges: [number, number][]
  /** Node currently being compared (phase 'insert') or visited (phase 'traverse'). */
  highlightNode?: number
  /** Edge currently being traversed. */
  highlightEdge?: [number, number]
  /** Nodes already visited during traversal, accumulated. */
  visitedNodes: number[]
  /** Value currently being inserted, not yet placed in builtNodes. */
  pendingValue?: number
  /** Existing node value the pending value is currently being compared/moved against. */
  pendingAnchor?: number
  /** Values from the insertion order that haven't started inserting yet. */
  upcomingValues?: number[]
  /** Pseudocode line this step corresponds to. */
  line?: number
  description: string
}
