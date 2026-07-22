import type { VseprDiagramSpec } from '../components/VseprDiagram'

export interface VseprMolecule {
  id: string
  label: string
  formula: string
  searchName: string
  bondingPairs: number
  lonePairs: number
  geometry: string
  approxBondAngle: string
  diagram: VseprDiagramSpec
}

// 전자 도메인(결합쌍+비공유쌍) 총 개수는 셋 다 4개로 같지만, 비공유쌍 개수가
// 늘어날수록 결합각이 압축되는 걸 보여주는 고전적인 3종 세트.
// 전부 평범한 공유결합 분자라 PubChem에 실제 3D 데이터가 있음 — 배위 화합물과
// 달리 여기서는 직접 계산 없이 기존 pubchem.ts 파이프라인을 그대로 씀.
export const VSEPR_MOLECULES: VseprMolecule[] = [
  {
    id: 'methane',
    label: '메테인',
    formula: 'CH4',
    searchName: 'methane',
    bondingPairs: 4,
    lonePairs: 0,
    geometry: '정사면체 (tetrahedral)',
    approxBondAngle: '약 109.5°',
    // 표준 쐐기-대시 표기: 평면 결합 2개(위) + 쐐기 1개(앞, 아래오른쪽) + 대시 1개(뒤, 아래왼쪽).
    // 4개를 전부 쐐기로 그리면 기하학적으로 불가능한 배치가 되므로 반드시 섞어서 그린다.
    diagram: {
      centerSymbol: 'C',
      bonds: [
        { angle: 150, style: 'plain', label: 'H' },
        { angle: 30, style: 'plain', label: 'H' },
        { angle: 300, style: 'wedge', label: 'H' },
        { angle: 240, style: 'dash', label: 'H' },
      ],
      lonePairs: [],
      angleArc: { fromAngle: 30, toAngle: 150, label: '109.5°' },
    },
  },
  {
    id: 'ammonia',
    label: '암모니아',
    formula: 'NH3',
    searchName: 'ammonia',
    bondingPairs: 3,
    lonePairs: 1,
    geometry: '삼각뿔형 (trigonal pyramidal)',
    approxBondAngle: '약 107°',
    // 결합 3개(평면 2개 + 쐐기 1개, 아래쪽 삼발이 배치) + 비공유쌍 1개(위쪽).
    diagram: {
      centerSymbol: 'N',
      bonds: [
        { angle: 210, style: 'plain', label: 'H' },
        { angle: 330, style: 'plain', label: 'H' },
        { angle: 270, style: 'wedge', label: 'H' },
      ],
      lonePairs: [{ angle: 90 }],
      // 세 분자 모두 "평면 결합-평면 결합" 쌍에 호를 걸어야 화면상 벌어진 정도가
      // 109.5°→107°→104.5° 순서로 시각적으로도 일관되게 좁아져 보인다.
      angleArc: { fromAngle: 210, toAngle: 330, label: '107°' },
    },
  },
  {
    id: 'water',
    label: '물',
    formula: 'H2O',
    searchName: 'water',
    bondingPairs: 2,
    lonePairs: 2,
    geometry: '굽은형 (bent)',
    approxBondAngle: '약 104.5°',
    // 결합 2개는 평면(쐐기/대시 불필요, 교재 표준 표기) + 비공유쌍 2개는 위쪽에 대칭 배치("토끼 귀").
    diagram: {
      centerSymbol: 'O',
      bonds: [
        { angle: 240, style: 'plain', label: 'H' },
        { angle: 300, style: 'plain', label: 'H' },
      ],
      lonePairs: [{ angle: 60 }, { angle: 120 }],
      angleArc: { fromAngle: 240, toAngle: 300, label: '104.5°' },
    },
  },
]
