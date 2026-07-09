export interface TreeDataset {
  id: string
  name: string
  /**
   * Fixed insertion order. Each dataset's shape emerges from running real
   * BST comparison-based insertion on this sequence — not a hardcoded shape.
   */
  insertionOrder: number[]
}

export const TREE_DATASETS: TreeDataset[] = [
  { id: 'binary', name: '이진트리', insertionOrder: [50, 30, 70, 20, 40, 60, 80] },
  { id: 'complete', name: '완전트리', insertionOrder: [40, 20, 60, 10, 30, 50] },
  { id: 'skewed', name: '편향트리', insertionOrder: [10, 20, 30, 40, 50] },
]
