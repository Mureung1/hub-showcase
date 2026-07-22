export interface NavLeaf {
  id: string
  label: string
  shortLabel?: string
  to?: string
  iconKey: string
}

export interface NavGroup {
  id: string
  label: string
  leaves: NavLeaf[]
}

export interface NavDept {
  id: string
  label: string
  groups: NavGroup[]
}

export const NAVIGATION: NavDept[] = [
  {
    id: 'cs',
    label: '컴퓨터공학과',
    groups: [
      {
        id: 'data-structures',
        label: '자료구조',
        leaves: [
          { id: 'stack', label: '스택', to: '/cs/stack', iconKey: 'stack' },
          { id: 'queue', label: '큐', to: '/cs/queue', iconKey: 'queue' },
          { id: 'deque', label: '덱', to: '/cs/deque', iconKey: 'deque' },
          { id: 'tree', label: '트리', to: '/cs/tree', iconKey: 'tree' },
        ],
      },
      {
        id: 'algorithms',
        label: '알고리즘',
        leaves: [{ id: 'sort', label: '정렬', to: '/cs/sorting', iconKey: 'sorting' }],
      },
      {
        id: 'os',
        label: '운영체제',
        leaves: [{ id: 'os-scheduling', label: 'CPU 스케줄링', iconKey: 'osScheduling' }],
      },
      {
        id: 'db',
        label: '데이터베이스',
        leaves: [{ id: 'db-btree', label: 'B-트리 인덱스', iconKey: 'dbBtree' }],
      },
    ],
  },
  {
    id: 'chem',
    label: '화학과',
    groups: [
      {
        id: 'genchem',
        label: '일반화학',
        leaves: [
          {
            id: 'molecule-viewer',
            label: '분자 뷰어',
            to: '/chemistry/viewer',
            iconKey: 'generalChem',
          },
          {
            id: 'vsepr',
            label: '분자 구조 (VSEPR)',
            to: '/chemistry/vsepr',
            iconKey: 'generalChem',
          },
          {
            id: 'orbitals',
            label: '오비탈 모양과 결합',
            to: '/chemistry/orbitals',
            iconKey: 'generalChem',
          },
          {
            id: 'lewis-structure',
            label: '루이스 구조 그리기',
            to: '/chemistry/lewis-structure',
            iconKey: 'generalChem',
          },
        ],
      },
      {
        id: 'orgchem',
        label: '유기화학',
        leaves: [
          {
            id: 'sub-elim',
            label: '치환·제거 반응',
            to: '/chemistry/organic/substitution-elimination',
            iconKey: 'organicChem',
          },
          {
            id: 'alkene-addition',
            label: '알켄 첨가 반응',
            to: '/chemistry/organic/alkene-addition',
            iconKey: 'organicChem',
          },
          {
            id: 'acyl-sub',
            label: '카르복시산 유도체 반응',
            to: '/chemistry/organic/acyl-substitution',
            iconKey: 'organicChem',
          },
        ],
      },
      {
        id: 'inorgchem',
        label: '무기화학',
        leaves: [
          {
            id: 'coordination-geometry',
            label: '배위 기하구조·이성질체',
            to: '/chemistry/inorganic/geometry',
            iconKey: 'inorganicChem',
          },
          {
            id: 'crystal-field',
            label: '결정장 이론',
            to: '/chemistry/inorganic/crystal-field',
            iconKey: 'inorganicChem',
          },
          {
            id: 'isomerism',
            label: 'cis/trans·킬레이트',
            to: '/chemistry/inorganic/isomerism',
            iconKey: 'inorganicChem',
          },
        ],
      },
      {
        id: 'physchem',
        label: '물리화학',
        leaves: [
          {
            id: 'speed-distribution',
            label: '분자 속도 분포',
            to: '/chemistry/physical',
            iconKey: 'physicalChem',
          },
        ],
      },
    ],
  },
]
