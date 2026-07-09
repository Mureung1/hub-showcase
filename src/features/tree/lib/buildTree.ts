export interface BuiltTreeNode {
  value: number
  left: BuiltTreeNode | null
  right: BuiltTreeNode | null
}

function insertNode(node: BuiltTreeNode | null, value: number): BuiltTreeNode {
  if (!node) return { value, left: null, right: null }
  if (value < node.value) {
    node.left = insertNode(node.left, value)
  } else {
    node.right = insertNode(node.right, value)
  }
  return node
}

/** Builds a BST from an insertion order using real comparison-based insertion. */
export function buildTree(insertionOrder: number[]): BuiltTreeNode {
  let root: BuiltTreeNode | null = null
  for (const value of insertionOrder) {
    root = insertNode(root, value)
  }
  if (!root) throw new Error('insertionOrder must be non-empty')
  return root
}
