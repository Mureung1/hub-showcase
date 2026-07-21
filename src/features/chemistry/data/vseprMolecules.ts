export interface VseprMolecule {
  id: string
  label: string
  formula: string
  searchName: string
  bondingPairs: number
  lonePairs: number
  geometry: string
  approxBondAngle: string
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
  },
]
