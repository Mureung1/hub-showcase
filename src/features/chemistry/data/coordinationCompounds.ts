// PubChem은 배위결합을 CanonicalSMILES에서 "."(분리된 조각)으로 표현하고,
// 배위 화합물의 3D 컨포머 레코드 자체를 아예 제공하지 않는 경우가 대부분이라
// (직접 조회로 확인: 페로센/헥사암민코발트/테트라암민구리/시스플라틴 전부 3D 없음),
// 이 두 예시는 PubChem을 거치지 않고 이상적인 배위 기하구조의 결합각으로
// 직접 계산한 SMILES/SDF를 사용한다. 자세한 배경은 CLAUDE.md 참고.
export interface CoordinationCompound {
  id: string
  label: string
  formula: string
  geometry: string
  coordinationNumber: number
  smiles: string
  sdf: string
  description: string
  /** d 오비탈이 리간드 결정장에 의해 갈라지는 에너지 그룹, 낮은 에너지부터 순서대로.
   * 그룹 사이 간격 중 가장 큰 것(보통 마지막 간격)이 빛을 흡수하는 에너지 차이다. */
  dOrbitalGroups: number[]
  /** 실제 관찰되는 색(문헌 확인됨) — 결정장이 만드는 에너지 차이만큼의 파장을 흡수하고 남은 보색. */
  observedColor: { label: string; hex: string }
  /** 오비탈 갈라짐 다이어그램에 대한 보충 설명(예: 단순화 여부). */
  splitNote?: string
}

// 정팔면체(octahedral): 중심 원자에서 6개 리간드가 ±x/±y/±z 축 방향으로
// 90도/180도 각도를 이루며 배치됨 (Co-N 결합 길이는 대표값 2.0으로 근사)
const hexaamminecobaltSdf = `hexaamminecobalt(III)
  hub-inorganic  3D

  7  6  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 Co  0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    2.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -2.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    2.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000   -2.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
  1  4  1  0
  1  5  1  0
  1  6  1  0
  1  7  1  0
M  CHG  1   1   3
M  END
`

// 평면사각형(square planar): 중심 원자와 4개 리간드가 한 평면(xy) 위에서
// 90도 간격으로 배치됨
const tetraamminecopperSdf = `tetraamminecopper(II)
  hub-inorganic  3D

  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 Cu  0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    2.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -2.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
  1  4  1  0
  1  5  1  0
M  CHG  1   1   2
M  END
`

export const COORDINATION_COMPOUNDS: CoordinationCompound[] = [
  {
    id: 'hexaamminecobalt',
    label: '헥사암민코발트(III)',
    formula: '[Co(NH3)6]3+',
    geometry: '정팔면체 (octahedral)',
    coordinationNumber: 6,
    smiles: '[NH3][Co+3]([NH3])([NH3])([NH3])([NH3])[NH3]',
    sdf: hexaamminecobaltSdf,
    description:
      '중심 금속 이온(Co3+) 주위에 암모니아 리간드 6개가 정팔면체 모양으로 배위결합한 화합물입니다. 배위수(coordination number)가 6일 때 나타나는 가장 대표적인 기하구조입니다.',
    dOrbitalGroups: [3, 2],
    observedColor: { label: '노랑-주황 (실제 문헌 확인)', hex: '#f0a536' },
  },
  {
    id: 'tetraamminecopper',
    label: '테트라암민구리(II)',
    formula: '[Cu(NH3)4]2+',
    geometry: '평면사각형 (square planar)',
    coordinationNumber: 4,
    smiles: '[NH3][Cu+2]([NH3])([NH3])[NH3]',
    sdf: tetraamminecopperSdf,
    description:
      '중심 금속 이온(Cu2+) 주위에 암모니아 리간드 4개가 한 평면 위에서 사각형 모양으로 배위결합한 화합물입니다. 배위수가 4일 때 정사면체와 함께 나타날 수 있는 대표적인 기하구조입니다.',
    dOrbitalGroups: [2, 1, 1],
    observedColor: { label: '진한 파랑-보라 (실제 문헌 확인)', hex: '#3b4cca' },
    splitNote:
      '평면사각형은 정팔면체보다 더 잘게(보통 4단계) 갈라지고 정확한 순서는 금속·리간드에 따라 달라질 수 있어, 여기서는 간략화해서 표시합니다.',
  },
]
