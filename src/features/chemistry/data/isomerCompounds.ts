// cis/trans는 평면사각형·정팔면체 배위 화합물에서 나타나는 입체이성질현상이고,
// 킬레이트는 한 리간드가 금속 하나에 여러 자리로 붙는 것이다. 둘 다 PubChem
// SMILES로는 표현이 안 된다(직접 WebFetch로 확인):
// - cisplatin/transplatin의 PubChem CanonicalSMILES는 둘 다 "N.N.Cl[Pt]Cl"류로
//   금속-리간드 결합 자체가 없는 분리된 조각이라 cis/trans 구분이 아예 없음
// - 평면사각형 전용 SMILES 확장(@SP1 등)이 있지만 이 프로젝트가 쓰는
//   smiles-drawer/3dmol은 이를 해석하지 못함
// 그래서 2D는 "리간드가 무엇에 연결됐는가"만 보여주고(연결성),
// cis/trans·킬레이트 고리 구조는 전부 이 파일에서 직접 계산한 3D SDF로만 표현한다.
export interface IsomerCompound {
  id: string
  label: string
  formula: string
  category: 'cis-trans' | 'chelate'
  smiles: string
  sdf: string
  description: string
}

// 평면사각형, Pt-N/Pt-Cl 결합 길이 약 2.0으로 근사(기존 배위 화합물과 동일 관례).
// cis: 같은 리간드끼리 인접(90°) — N-N, Cl-Cl이 각각 이웃함.
const cisplatinSdf = `cisplatin (cis)
  hub-inorganic  3D

  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 Pt  0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    2.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -2.0000    0.0000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -2.0000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
  1  4  1  0
  1  5  1  0
M  END
`

// trans: 같은 리간드끼리 반대편(180°) — N-N, Cl-Cl이 서로 마주봄.
const transplatinSdf = `transplatin (trans)
  hub-inorganic  3D

  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 Pt  0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -2.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    2.0000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -2.0000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
  1  4  1  0
  1  5  1  0
M  END
`

// 트리스(에틸렌디아민)코발트(III), [Co(en)3]3+. 실제 결정구조가 아니라 근사 모델:
// en의 물림각(bite angle, N-Co-N)은 이상적 정팔면체 각(90°)이 아니라 킬레이트
// 5원자 고리(Co-N-C-C-N) 제약 때문에 약 80°로 좁혀진다는 걸 반영해 좌표를
// 직접 계산함(Co-N 결합 2.0, 물림각 약 80°, 세 리간드가 z축 기준 3회 대칭).
// 리간드 수소는 기존 배위 화합물과 같은 이유로 생략(기하구조를 가리지 않기 위함,
// CoordinationGeometryPage 참고) — 대신 C-C 뼈대는 킬레이트 고리 자체를 보여주기
// 위해 반드시 포함함(수소만 생략, 고리를 이루는 무거운 원자는 전부 표시).
const trisEthylenediamineCobaltSdf = `tris(ethylenediamine)cobalt(III)
  hub-inorganic  3D  (bite angle approx, ligand H omitted)

 13 15  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 Co  0  0  0  0  0  0  0  0  0  0  0  0
    1.6384    0.0000    1.1472 N   0  0  0  0  0  0  0  0  0  0  0  0
    1.2290    1.0834   -1.1472 N   0  0  0  0  0  0  0  0  0  0  0  0
    2.8435    0.7035    0.6875 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.5981    1.3527   -0.6875 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8192    1.4188    1.1472 N   0  0  0  0  0  0  0  0  0  0  0  0
   -1.5535    0.5198   -1.1472 N   0  0  0  0  0  0  0  0  0  0  0  0
   -2.0309    2.1107    0.6875 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.4706    1.5737   -0.6875 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8192   -1.4188    1.1472 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.3246   -1.6058   -1.1472 N   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8125   -2.8142    0.6875 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.1276   -2.9264   -0.6875 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
  2  4  1  0
  4  5  1  0
  5  3  1  0
  1  6  1  0
  1  7  1  0
  6  8  1  0
  8  9  1  0
  9  7  1  0
  1 10  1  0
  1 11  1  0
 10 12  1  0
 12 13  1  0
 13 11  1  0
M  CHG  1   1   3
M  END
`

export const ISOMER_COMPOUNDS: IsomerCompound[] = [
  {
    id: 'cisplatin',
    label: '시스플라틴 (cisplatin)',
    formula: 'cis-[PtCl2(NH3)2]',
    category: 'cis-trans',
    smiles: '[NH3][Pt]([NH3])(Cl)Cl',
    sdf: cisplatinSdf,
    description:
      '같은 리간드(NH3끼리, Cl끼리)가 서로 이웃한(90°) 평면사각형 배치입니다. 두 Cl이 인접해 있어 DNA의 이웃한 두 염기와 동시에 결합할 수 있고, 이 가교가 세포 분열을 막아 임상 항암제로 쓰입니다.',
  },
  {
    id: 'transplatin',
    label: '트랜스플라틴 (transplatin)',
    formula: 'trans-[PtCl2(NH3)2]',
    category: 'cis-trans',
    smiles: '[NH3][Pt]([NH3])(Cl)Cl',
    sdf: transplatinSdf,
    description:
      '시스플라틴과 분자식(PtCl2(NH3)2)은 완전히 같지만, 같은 리간드가 서로 마주보는(180°) 배치입니다. 이 배치에서는 두 Cl이 이웃한 DNA 염기에 동시에 닿기 어려운 입체적 이유로 시스플라틴과 같은 방식의 항암 효과를 내지 못합니다 — 같은 조성이라도 배치(isomer)가 다르면 실제 작용이 달라지는 대표 사례입니다.',
  },
  {
    id: 'tris-en-cobalt',
    label: '트리스(에틸렌디아민)코발트(III)',
    formula: '[Co(en)3]3+',
    category: 'chelate',
    // 리간드가 "."로 분리된 조각이면(예: PubChem 원본 표기) 금속-리간드 결합 자체가
    // 안 그려져 이 화면의 핵심(킬레이트=한 리간드가 금속에 두 자리로 붙음)과 정반대로
    // 보인다 — 링 클로저 숫자로 Co-N 결합 6개를 전부 명시한 연결된 SMILES를 씀
    // (기존 [NH3][Co+3](...) 패턴과 같은 이유로 N도 [NH2] 브래킷으로 H 개수를 직접 지정).
    smiles: '[Co+3]123([NH2]CC[NH2]1)([NH2]CC[NH2]2)[NH2]CC[NH2]3',
    sdf: trisEthylenediamineCobaltSdf,
    description:
      '에틸렌디아민(en, H2N-CH2-CH2-NH2)은 양쪽 끝 질소가 각각 비공유 전자쌍을 내줘 한 리간드가 금속 하나에 두 자리로 동시에 붙습니다(두 자리 리간드, bidentate) — 이렇게 금속-리간드가 고리를 이루는 결합을 킬레이트라고 합니다. 이 착이온은 en 3개가 코발트 하나에 붙어 3개의 5원자 고리(Co-N-C-C-N)를 이룹니다. 붙는 자리가 가까이 있어야 해서 고리 안 N-Co-N 각(물림각)은 이상적인 정팔면체 각 90°보다 좁은 약 80°입니다.',
  },
]
