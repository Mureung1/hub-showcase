import type { SortCell } from '../algorithms/types'

let idCounter = 0

export function createCells(values: number[]): SortCell[] {
  return values.map((value) => ({ id: idCounter++, value }))
}

export function generateRandomValues(size: number, min = 5, max = 99): number[] {
  return Array.from(
    { length: size },
    () => Math.floor(Math.random() * (max - min + 1)) + min,
  )
}
