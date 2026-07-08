export interface SortCell {
  id: number
  value: number
}

interface StepMeta {
  cells: SortCell[]
  /** Pseudocode line this step corresponds to, tagged by the algorithm itself. */
  line?: number
  /** Quick sort only — highlights the current pivot cell. */
  pivotIndex?: number
}

export type SortStep =
  | (StepMeta & { type: 'compare'; indices: [number, number] })
  | (StepMeta & { type: 'swap'; indices: [number, number] })
  | (StepMeta & { type: 'mark-sorted'; index: number })
  | (StepMeta & { type: 'done' })
