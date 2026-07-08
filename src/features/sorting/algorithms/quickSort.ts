import type { SortCell, SortStep } from './types'

export function quickSort(initial: SortCell[]): SortStep[] {
  const steps: SortStep[] = []
  const cells = initial.map((c) => ({ ...c }))
  const n = cells.length
  const sorted = new Set<number>()

  const snapshot = () => cells.map((c) => ({ ...c }))

  function partition(low: number, high: number): number {
    const pivotIndex = high
    const pivotValue = cells[pivotIndex].value
    let i = low - 1

    for (let j = low; j < high; j++) {
      steps.push({
        type: 'compare',
        indices: [j, pivotIndex],
        cells: snapshot(),
        line: 3,
        pivotIndex,
      })
      if (cells[j].value < pivotValue) {
        i++
        if (i !== j) {
          ;[cells[i], cells[j]] = [cells[j], cells[i]]
          steps.push({
            type: 'swap',
            indices: [i, j],
            cells: snapshot(),
            line: 4,
            pivotIndex,
          })
        }
      }
    }

    if (i + 1 !== pivotIndex) {
      ;[cells[i + 1], cells[pivotIndex]] = [cells[pivotIndex], cells[i + 1]]
      steps.push({
        type: 'swap',
        indices: [i + 1, pivotIndex],
        cells: snapshot(),
        line: 7,
        pivotIndex,
      })
    }

    sorted.add(i + 1)
    steps.push({ type: 'mark-sorted', index: i + 1, cells: snapshot() })
    return i + 1
  }

  function sort(low: number, high: number) {
    if (low > high) return
    if (low === high) {
      sorted.add(low)
      steps.push({ type: 'mark-sorted', index: low, cells: snapshot() })
      return
    }
    const p = partition(low, high)
    sort(low, p - 1)
    sort(p + 1, high)
  }

  if (n > 0) sort(0, n - 1)

  for (let idx = 0; idx < n; idx++) {
    if (!sorted.has(idx)) {
      sorted.add(idx)
      steps.push({ type: 'mark-sorted', index: idx, cells: snapshot() })
    }
  }

  steps.push({ type: 'done', cells: snapshot() })
  return steps
}
