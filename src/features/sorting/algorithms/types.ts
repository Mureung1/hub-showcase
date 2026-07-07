export interface SortCell {
  id: number
  value: number
}

export type SortStep =
  | { type: 'compare'; indices: [number, number]; cells: SortCell[] }
  | { type: 'swap'; indices: [number, number]; cells: SortCell[] }
  | { type: 'mark-sorted'; index: number; cells: SortCell[] }
  | { type: 'done'; cells: SortCell[] }
