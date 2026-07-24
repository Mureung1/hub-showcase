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
  /** true면 아직 개설 전 학과 — 사이드바에선 "준비 중", 홈 그래프에선 점선·흐림으로 표시 */
  planned?: boolean
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
            label: '관능기 인식',
            to: '/chemistry/functional-groups',
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
  // ---- 아래는 개설 예정 학과 (planned) ----
  // 실제 화면은 없고, 홈 그래프의 방사형 구조와 사이드바 "준비 중" 표시에만 쓰임.
  // 세부과목명은 각 학과의 대표 전공 과목으로 채움(가짜 단원은 만들지 않음 — 과목 수준까지만).
  {
    id: 'math',
    label: '수학과',
    planned: true,
    groups: [
      {
        id: 'math-subjects',
        label: '개설 예정',
        leaves: [
          { id: 'linalg', label: '선형대수학', iconKey: 'planned' },
          { id: 'calculus', label: '미적분학', iconKey: 'planned' },
          { id: 'probstat', label: '확률과통계', iconKey: 'planned' },
          { id: 'discretemath', label: '이산수학', iconKey: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'ee',
    label: '전자공학과',
    planned: true,
    groups: [
      {
        id: 'ee-subjects',
        label: '개설 예정',
        leaves: [
          { id: 'circuit', label: '회로이론', iconKey: 'planned' },
          { id: 'digitallogic', label: '디지털논리', iconKey: 'planned' },
          { id: 'signals', label: '신호및시스템', iconKey: 'planned' },
          { id: 'semicon', label: '반도체공학', iconKey: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'physics',
    label: '물리학과',
    planned: true,
    groups: [
      {
        id: 'physics-subjects',
        label: '개설 예정',
        leaves: [
          { id: 'quantum', label: '양자역학', iconKey: 'planned' },
          { id: 'classmech', label: '고전역학', iconKey: 'planned' },
          { id: 'emag', label: '전자기학', iconKey: 'planned' },
          { id: 'thermo', label: '열역학', iconKey: 'planned' },
        ],
      },
    ],
  },
  {
    id: 'bio',
    label: '생명과학과',
    planned: true,
    groups: [
      {
        id: 'bio-subjects',
        label: '개설 예정',
        leaves: [
          { id: 'genetics', label: '유전학', iconKey: 'planned' },
          { id: 'cellbio', label: '세포생물학', iconKey: 'planned' },
          { id: 'molbio', label: '분자생물학', iconKey: 'planned' },
          { id: 'biochem', label: '생화학', iconKey: 'planned' },
        ],
      },
    ],
  },
]
