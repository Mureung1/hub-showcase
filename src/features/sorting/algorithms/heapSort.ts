import type { SortCell, SortStep } from './types'

export function heapSort(initial: SortCell[]): SortStep[] {
  const steps: SortStep[] = []
  const cells = initial.map((c) => ({ ...c }))
  const n = cells.length

  const snapshot = () => cells.map((c) => ({ ...c }))

  function heapify(size: number, root: number) {
    let largest = root
    const left = 2 * root + 1
    const right = 2 * root + 2

    if (left < size) {
      steps.push({ type: 'compare', indices: [left, largest], cells: snapshot(), line: 2 })
      if (cells[left].value > cells[largest].value) largest = left
    }
    if (right < size) {
      steps.push({ type: 'compare', indices: [right, largest], cells: snapshot(), line: 3 })
      if (cells[right].value > cells[largest].value) largest = right
    }

    if (largest !== root) {
      ;[cells[root], cells[largest]] = [cells[largest], cells[root]]
      steps.push({ type: 'swap', indices: [root, largest], cells: snapshot(), line: 5 })
      heapify(size, largest)
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i)
  }

  for (let end = n - 1; end > 0; end--) {
    ;[cells[0], cells[end]] = [cells[end], cells[0]]
    steps.push({ type: 'swap', indices: [0, end], cells: snapshot(), line: 5 })
    steps.push({ type: 'mark-sorted', index: end, cells: snapshot() })
    heapify(end, 0)
  }
  if (n > 0) {
    steps.push({ type: 'mark-sorted', index: 0, cells: snapshot() })
  }

  steps.push({ type: 'done', cells: snapshot() })
  return steps
}
