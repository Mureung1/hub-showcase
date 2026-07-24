export interface FunctionalGroupHighlight {
  /** SMILES 원자맵의 class 번호와 매칭되는 강조색 */
  classNumber: number
  color: string
  label: string
}

export interface FunctionalGroupExample {
  id: string
  moleculeName: string
  /** 강조할 원자에 SMILES 원자맵([X:n])을 심어둔 SMILES. 구조 자체는 원본과 동일하고,
   * class 번호가 붙은 원자만 나중에 색으로 강조된다. */
  smiles: string
  /** 이 분자에 강조할 그룹 하나 이상 (아스피린처럼 두 그룹을 동시에 다루는 경우 대비) */
  highlights: FunctionalGroupHighlight[]
  /** true면 골격식 토글과 무관하게 항상 탄소·수소를 표시한다 — 카르보닐 탄소의 H 유무로
   * 알데하이드/케톤이 갈리는 경우, 아민의 N-H가 생략되면 헷갈리는 경우에 사용 */
  forceShowCarbons?: boolean
}

export const FUNCTIONAL_GROUP_EXAMPLES: FunctionalGroupExample[] = [
  {
    id: 'ethanol',
    moleculeName: '에탄올',
    smiles: 'CC[OH:1]',
    highlights: [{ classNumber: 1, color: '#22d3ee', label: '알코올 −OH' }],
  },
  {
    id: 'diethyl-ether',
    moleculeName: '다이에틸에터',
    smiles: 'CC[O:1]CC',
    highlights: [{ classNumber: 1, color: '#60a5fa', label: '에테르 −O−' }],
  },
  {
    id: 'acetaldehyde',
    moleculeName: '아세트알데하이드',
    smiles: 'C[CH:1]=[O:1]',
    highlights: [{ classNumber: 1, color: '#f7931a', label: '알데하이드 −CHO' }],
    forceShowCarbons: true,
  },
  {
    id: 'acetone',
    moleculeName: '아세톤',
    smiles: 'C[C:1](=[O:1])C',
    highlights: [{ classNumber: 1, color: '#f7931a', label: '케톤 C=O (양쪽 모두 탄소)' }],
    forceShowCarbons: true,
  },
  {
    id: 'acetic-acid',
    moleculeName: '아세트산',
    smiles: 'C[C:1](=[O:1])[OH:1]',
    highlights: [{ classNumber: 1, color: '#ef4444', label: '카르복시산 −COOH' }],
  },
  {
    id: 'ethyl-acetate',
    moleculeName: '아세트산에틸',
    smiles: 'C[C:1](=[O:1])[O:1]CC',
    highlights: [{ classNumber: 1, color: '#a78bfa', label: '에스터 −COO−' }],
  },
  {
    id: 'ethylamine',
    moleculeName: '에틸아민',
    smiles: 'CC[NH2:1]',
    highlights: [{ classNumber: 1, color: '#22c55e', label: '아민 −NH₂' }],
    forceShowCarbons: true,
  },
  {
    id: 'acetamide',
    moleculeName: '아세트아마이드',
    smiles: 'C[C:1](=[O:1])[NH2:1]',
    highlights: [{ classNumber: 1, color: '#eab308', label: '아마이드 −CONH₂' }],
    forceShowCarbons: true,
  },
  {
    id: 'aspirin',
    moleculeName: '아스피린 (아세틸살리실산)',
    smiles: 'C[C:1](=[O:1])[O:1]c1ccccc1[C:2](=[O:2])[OH:2]',
    highlights: [
      { classNumber: 1, color: '#a78bfa', label: '에스터 −COO− (아세틸기)' },
      { classNumber: 2, color: '#ef4444', label: '카르복시산 −COOH' },
    ],
  },
]
