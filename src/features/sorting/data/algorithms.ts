import type { SortCell, SortStep } from '../algorithms/types'
import { bubbleSort } from '../algorithms/bubbleSort'
import { selectionSort } from '../algorithms/selectionSort'
import { quickSort } from '../algorithms/quickSort'
import { heapSort } from '../algorithms/heapSort'

export interface PseudocodeLine {
  code: string
  indent: number
}

export interface SortAlgorithm {
  id: string
  name: string
  sort: (cells: SortCell[]) => SortStep[]
  pseudocode: PseudocodeLine[]
  description: string
  complexity: string
}

export const SORT_ALGORITHMS: SortAlgorithm[] = [
  {
    id: 'bubble-sort',
    name: '버블 정렬',
    sort: bubbleSort,
    pseudocode: [
      { code: 'for (let i = 0; i < n - 1; i++) {', indent: 0 },
      { code: 'for (let j = 0; j < n - 1 - i; j++) {', indent: 1 },
      { code: 'if (arr[j] > arr[j + 1]) {', indent: 2 },
      { code: 'swap(arr[j], arr[j + 1]);', indent: 3 },
      { code: '}', indent: 2 },
      { code: '}', indent: 1 },
      { code: '}', indent: 0 },
    ],
    description:
      '인접한 두 원소를 비교해 순서가 잘못되어 있으면 자리를 바꾸는 과정을 배열 전체에 반복합니다. 한 번의 패스가 끝날 때마다 가장 큰 값이 배열의 뒤쪽으로 밀려나며, 더 이상 교환이 일어나지 않으면 정렬이 완료됩니다.',
    complexity: '평균/최악 시간복잡도: O(n²)',
  },
  {
    id: 'selection-sort',
    name: '선택 정렬',
    sort: selectionSort,
    pseudocode: [
      { code: 'for (let i = 0; i < n - 1; i++) {', indent: 0 },
      { code: 'let minIdx = i', indent: 1 },
      { code: 'for (let j = i + 1; j < n; j++) {', indent: 1 },
      { code: 'if (arr[j] < arr[minIdx]) minIdx = j', indent: 2 },
      { code: '}', indent: 1 },
      { code: 'swap(arr[i], arr[minIdx]);', indent: 1 },
      { code: '}', indent: 0 },
    ],
    description:
      '매 패스마다 아직 정렬되지 않은 구간에서 최솟값을 찾아, 그 구간의 맨 앞 원소와 자리를 바꿉니다. 앞쪽부터 하나씩 정렬이 확정되어 나가는 방식입니다.',
    complexity: '평균/최악 시간복잡도: O(n²)',
  },
  {
    id: 'quick-sort',
    name: '퀵 정렬',
    sort: quickSort,
    pseudocode: [
      { code: 'function partition(low, high) {', indent: 0 },
      { code: 'pivot = arr[high]', indent: 1 },
      { code: 'for (let j = low; j < high; j++) {', indent: 1 },
      { code: 'if (arr[j] < pivot) {', indent: 2 },
      { code: 'swap(arr[++i], arr[j]);', indent: 3 },
      { code: '}', indent: 2 },
      { code: '}', indent: 1 },
      { code: 'swap(arr[i + 1], arr[high]);', indent: 1 },
      { code: '}', indent: 0 },
    ],
    description:
      '마지막 원소를 피벗(보라색)으로 정하고, 피벗보다 작은 원소들을 앞쪽으로 모은 뒤 피벗을 그 경계에 놓습니다. 피벗을 기준으로 나뉜 양쪽 구간에 대해 재귀적으로 같은 과정을 반복합니다.',
    complexity: '평균 O(n log n), 최악 O(n²) — 이미 정렬된 배열에 최악의 경우 발생',
  },
  {
    id: 'heap-sort',
    name: '힙 정렬',
    sort: heapSort,
    pseudocode: [
      { code: 'function heapify(size, root) {', indent: 0 },
      { code: 'largest = root; left = 2*root+1; right = 2*root+2', indent: 1 },
      { code: 'if (arr[left] > arr[largest]) largest = left', indent: 1 },
      { code: 'if (arr[right] > arr[largest]) largest = right', indent: 1 },
      { code: 'if (largest !== root) {', indent: 1 },
      { code: 'swap(arr[root], arr[largest]); heapify(size, largest);', indent: 2 },
      { code: '}', indent: 1 },
      { code: '}', indent: 0 },
    ],
    description:
      '배열을 최대 힙으로 구성한 뒤, 힙의 루트(최댓값)를 배열 끝과 교환하고 힙 크기를 줄여가며 다시 힙 성질을 복원(heapify)하는 과정을 반복합니다.',
    complexity: '평균/최악 시간복잡도: O(n log n)',
  },
]
