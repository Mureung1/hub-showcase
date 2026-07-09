import type { PseudocodeLine } from '../../sorting/data/algorithms'
import type { TraversalOrder } from '../types'

export const INSERT_PSEUDOCODE: PseudocodeLine[] = [
  { code: 'function insert(node, value) {', indent: 0 },
  { code: 'if (node === null) return new Node(value)', indent: 1 },
  { code: 'if (value < node.value) {', indent: 1 },
  { code: 'node.left = insert(node.left, value)', indent: 2 },
  { code: '} else {', indent: 1 },
  { code: 'node.right = insert(node.right, value)', indent: 2 },
  { code: '}', indent: 1 },
  { code: 'return node', indent: 1 },
  { code: '}', indent: 0 },
]

export const INSERT_LINES = {
  insertRoot: 1,
  compare: 2,
  goLeft: 3,
  goRight: 5,
}

export const TRAVERSAL_PSEUDOCODE: Record<TraversalOrder, PseudocodeLine[]> = {
  preorder: [
    { code: 'function preorder(node) {', indent: 0 },
    { code: 'if (!node) return', indent: 1 },
    { code: 'visit(node)', indent: 1 },
    { code: 'preorder(node.left)', indent: 1 },
    { code: 'preorder(node.right)', indent: 1 },
    { code: '}', indent: 0 },
  ],
  inorder: [
    { code: 'function inorder(node) {', indent: 0 },
    { code: 'if (!node) return', indent: 1 },
    { code: 'inorder(node.left)', indent: 1 },
    { code: 'visit(node)', indent: 1 },
    { code: 'inorder(node.right)', indent: 1 },
    { code: '}', indent: 0 },
  ],
  postorder: [
    { code: 'function postorder(node) {', indent: 0 },
    { code: 'if (!node) return', indent: 1 },
    { code: 'postorder(node.left)', indent: 1 },
    { code: 'postorder(node.right)', indent: 1 },
    { code: 'visit(node)', indent: 1 },
    { code: '}', indent: 0 },
  ],
  levelorder: [
    { code: 'function levelorder(root) {', indent: 0 },
    { code: 'queue = [root]', indent: 1 },
    { code: 'while (queue.length) {', indent: 1 },
    { code: 'node = queue.shift()', indent: 2 },
    { code: 'visit(node)', indent: 2 },
    { code: 'if (node.left) queue.push(node.left)', indent: 2 },
    { code: 'if (node.right) queue.push(node.right)', indent: 2 },
    { code: '}', indent: 1 },
    { code: '}', indent: 0 },
  ],
}

/** Line index for the visit + left/right traversal calls, per order. */
export const TRAVERSAL_LINES: Record<TraversalOrder, { visit: number; left: number; right: number }> = {
  preorder: { visit: 2, left: 3, right: 4 },
  inorder: { visit: 3, left: 2, right: 4 },
  postorder: { visit: 4, left: 2, right: 3 },
  levelorder: { visit: 4, left: 5, right: 6 },
}
