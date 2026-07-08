import type { SortCell, SortStep } from './types'

export function bubbleSort(initial: SortCell[]): SortStep[] {
  const steps: SortStep[] = []
  const cells = initial.map((c) => ({ ...c }))
  const n = cells.length
  const sorted = new Set<number>()

  const snapshot = () => cells.map((c) => ({ ...c }))

  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({ type: 'compare', indices: [j, j + 1], cells: snapshot(), line: 2 })
      if (cells[j].value > cells[j + 1].value) {
        ;[cells[j], cells[j + 1]] = [cells[j + 1], cells[j]]
        swapped = true
        steps.push({ type: 'swap', indices: [j, j + 1], cells: snapshot(), line: 3 })
      }
    }
    sorted.add(n - 1 - i)
    steps.push({ type: 'mark-sorted', index: n - 1 - i, cells: snapshot() })
    if (!swapped) break
  }

  for (let idx = 0; idx < n; idx++) {
    if (!sorted.has(idx)) {
      sorted.add(idx)
      steps.push({ type: 'mark-sorted', index: idx, cells: snapshot() })
    }
  }

  steps.push({ type: 'done', cells: snapshot() })
  return steps
}
