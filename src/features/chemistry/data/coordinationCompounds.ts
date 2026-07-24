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
  /** 결정장 갈라짐 에너지(Δ, 문헌 확인됨) — cm⁻¹ 단위. 화합물 간 막대 높이를
   * 같은 스케일에서 비교하기 위한 실측 수치(chemistry-reviewer 사전 검증 통과). */
  deltaWavenumber_cm1: number
  /** 흡수 밴드의 모양 — 단일 파장이 아니라 폭과 비대칭성을 가진 띠로 그리기 위한 값.
   * peakNm: 흡수 극대 파장(문헌값). fwhmNm: 반치폭(밴드가 퍼진 정도, 클수록 넓고 흐릿하게
   * 마스킹). skew: 밴드가 좌우 대칭이 아니라 한쪽으로 치우친 정도(여러 전이가 겹친 경우). */
  absorptionBand: {
    peakNm: number
    fwhmNm: number
    skew: 'symmetric' | 'broadTowardLonger' | 'broadTowardShorter'
  }
  /** 위 수치가 화면에 그려진 이상화 구조와 실제로 다른 화학종에서 측정된 값일 때,
   * 그 출처/괴리를 명시하는 고지문. 그려진 구조와 측정 화학종이 일치하면 생략. */
  deltaSourceNote?: string
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
    observedColor: { label: '노랑-주황', hex: '#f0a536' },
    // λmax=437nm, Δo=22,900cm⁻¹ (문헌 다수 일치, chemistry-reviewer 사전 검증 통과).
    // 저스핀 d6 단일 전이(1A1g→1T1g)로 밴드가 좁고 대칭적임.
    deltaWavenumber_cm1: 22900,
    absorptionBand: { peakNm: 437, fwhmNm: 40, skew: 'symmetric' },
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
      '중심 금속 이온(Cu2+) 주위에 암모니아 리간드 4개가 한 평면 위에서 사각형 모양으로 배위결합한 화합물입니다. 배위수가 4일 때 정사면체와 함께 나타날 수 있는 대표적인 기하구조입니다. 다만 실제 이 구리 착이온은 물 분자가 축 방향에 추가로 약하게 결합해 5배위(사각뿔)·6배위(정팔면체, Jahn-Teller 왜곡)로 관찰되는 경우가 많고, 여기서는 배위수 4의 이상적 평면사각형만 단순화해 보여줍니다.',
    // d 오비탈은 항상 5개. 평면사각형은 4준위로 갈라짐(아래부터 dxz·dyz 겹침 / dz² / dxy / dx²-y²)
    // = [2,1,1,1], 총 5개. (정확한 순서는 금속·리간드에 따라 달라질 수 있어 대표적 배열로 단순화)
    dOrbitalGroups: [2, 1, 1, 1],
    observedColor: { label: '진한 파랑-보라', hex: '#3b4cca' },
    splitNote:
      '평면사각형은 정팔면체보다 더 잘게 4단계로 갈라집니다(d 오비탈 5개가 4준위로). 정확한 순서는 금속·리간드에 따라 달라질 수 있어 대표적 배열로 단순화해 표시합니다.',
    // λmax≈600-620nm, Δ≈16,000-17,000cm⁻¹ (문헌 근사치, chemistry-reviewer 사전 검증 통과).
    // Jahn-Teller 왜곡으로 여러 전이가 겹쳐 밴드가 넓고 장파장 쪽으로 치우침 — 좁은 단일
    // 피크로 그리면 안 됨(사전 검증에서 명시적으로 지적된 조건).
    deltaWavenumber_cm1: 16500,
    absorptionBand: { peakNm: 610, fwhmNm: 120, skew: 'broadTowardLonger' },
    deltaSourceNote:
      '이 λmax/Δ 값은 화면에 그려진 이상화된 평면사각형 구조가 아니라, 실제 수용액에서 관찰되는 6배위(축 방향에 물 분자가 약하게 결합한 Jahn-Teller 왜곡 팔면체) 화학종에서 측정된 값입니다. 평면사각형은 배위수 4의 이상적 기하구조를 보여주기 위한 단순화이며, 색을 만드는 실제 흡수는 왜곡된 6배위 구조에서 일어납니다.',
  },
]
