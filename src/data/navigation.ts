export interface NavLeaf {
  id: string
  label: string
  shortLabel?: string
  to?: string
  iconKey: string
}

export interface NavDept {
  id: string
  label: string
  leaves: NavLeaf[]
}

export const NAVIGATION: NavDept[] = [
  {
    id: 'cs',
    label: '컴퓨터공학과',
    leaves: [
      { id: 'sort', label: '정렬', to: '/cs/sorting', iconKey: 'sorting' },
      { id: 'stack', label: '스택', to: '/cs/stack', iconKey: 'stack' },
      { id: 'queue', label: '큐', to: '/cs/queue', iconKey: 'queue' },
      { id: 'deque', label: '덱', to: '/cs/deque', iconKey: 'deque' },
      { id: 'tree', label: '트리', to: '/cs/tree', iconKey: 'tree' },
    ],
  },
  {
    id: 'chem',
    label: '화학과',
    leaves: [
      {
        id: 'genchem',
        label: '일반화학 (분자 뷰어)',
        shortLabel: '일반화학',
        to: '/chemistry/viewer',
        iconKey: 'generalChem',
      },
      {
        id: 'orgchem',
        label: '유기화학 (반응 멘토)',
        shortLabel: '유기화학',
        to: '/chemistry/organic',
        iconKey: 'organicChem',
      },
      {
        id: 'inorgchem',
        label: '무기화학 (배위 화합물)',
        shortLabel: '무기화학',
        to: '/chemistry/inorganic',
        iconKey: 'inorganicChem',
      },
      { id: 'physchem', label: '물리화학', iconKey: 'physicalChem' },
    ],
  },
]
