import type { SortStep } from '../algorithms/types'

export interface PseudocodeLine {
  code: string
  indent: number
}

export const BUBBLE_SORT_PSEUDOCODE: PseudocodeLine[] = [
  { code: 'for (let i = 0; i < n - 1; i++) {', indent: 0 },
  { code: 'for (let j = 0; j < n - 1 - i; j++) {', indent: 1 },
  { code: 'if (arr[j] > arr[j + 1]) {', indent: 2 },
  { code: 'swap(arr[j], arr[j + 1]);', indent: 3 },
  { code: '}', indent: 2 },
  { code: '}', indent: 1 },
  { code: '}', indent: 0 },
]

export function getHighlightedLine(stepType: SortStep['type'] | undefined): number | null {
  switch (stepType) {
    case 'compare':
      return 2
    case 'swap':
      return 3
    default:
      return null
  }
}
