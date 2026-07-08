import type { SortCell, SortStep } from './types'

export function selectionSort(initial: SortCell[]): SortStep[] {
  const steps: SortStep[] = []
  const cells = initial.map((c) => ({ ...c }))
  const n = cells.length

  const snapshot = () => cells.map((c) => ({ ...c }))

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i
    for (let j = i + 1; j < n; j++) {
      steps.push({ type: 'compare', indices: [minIdx, j], cells: snapshot(), line: 3 })
      if (cells[j].value < cells[minIdx].value) {
        minIdx = j
      }
    }
    if (minIdx !== i) {
      ;[cells[i], cells[minIdx]] = [cells[minIdx], cells[i]]
      steps.push({ type: 'swap', indices: [i, minIdx], cells: snapshot(), line: 5 })
    }
    steps.push({ type: 'mark-sorted', index: i, cells: snapshot() })
  }

  steps.push({ type: 'mark-sorted', index: n - 1, cells: snapshot() })
  steps.push({ type: 'done', cells: snapshot() })
  return steps
}
