import type { ReactionTemplate } from './types'

export const fischerEsterificationReaction: ReactionTemplate = {
  id: 'fischer-esterification',
  name: '아실화 반응 (아스피린 합성)',
  summary:
    '살리실산의 페놀성 하이드록시기가 무수아세트산과 반응해 아스피린(아세틸살리실산)이 합성되는 친핵성 아실 치환(아실화) 반응입니다. (Fischer 에스테르화는 카르복시산+알코올·산 촉매·부산물이 물인 별개 반응이며, 이 반응은 무수물을 쓰는 아실화라 그와 구분됩니다.)',
  steps: [
    {
      id: 'reactant',
      smiles: 'OC(=O)c1ccccc1O[H].CC(=O)OC(=O)C',
      title: '1단계: 카르보닐 탄소 공격',
      description:
        '살리실산의 페놀성 산소가 비공유 전자쌍으로 무수아세트산의 카르보닐 탄소를 공격하고, 동시에 그 탄소의 파이(C=O) 결합이 끊어지며 전자쌍이 산소로 이동합니다.',
      // 원래 SMILES 문자열 순서(1-based 표기 없이 그대로 세면) 카르보닐 탄소는
      // 15번째지만, 문자열 앞쪽의 명시적 [H](페놀성 수소)에 smiles-drawer가
      // 별도 인덱스를 안 줘서 그 뒤 원자들이 전부 1씩 당겨짐 — 실제 렌더링된
      // 좌표로 확인한 진짜 인덱스는 14(카르보닐 탄소)/15(그 탄소의 =O)임.
      arrows: [
        { id: 'phenol-attacks', source: { kind: 'lone-pair', atom: 9 }, target: 14 },
        { id: 'carbonyl-pi-breaks', source: { kind: 'pi-bond', atoms: [14, 15] }, target: 15 },
      ],
    },
    {
      id: 'tetrahedral-intermediate',
      smiles: '[O-]C(C)(OC(=O)C)[OH+]c1ccccc1C(=O)O',
      title: '2단계: 사면체 중간체 붕괴',
      description:
        '알콕시화물(O⁻)의 비공유 전자쌍이 다시 파이 결합을 형성하며 C=O가 재생되고, 동시에 중심 탄소와 다리 산소 사이의 결합이 끊어지며 아세트산이 이탈기로 떨어져 나갑니다.',
      arrows: [
        { id: 'alkoxide-reforms-pi', source: { kind: 'lone-pair', atom: 0 }, target: 1 },
        { id: 'leaving-group-departs', source: { kind: 'sigma-bond', atoms: [1, 3] }, target: 3 },
      ],
    },
    {
      id: 'product',
      smiles: 'CC(=O)Oc1ccccc1C(=O)O.CC(=O)O',
      title: '생성물: 아스피린 + 아세트산',
      description:
        '페놀성 산소에 남아있던 양전하는 이후 빠른 양성자 이동(별도로 표시하지 않음)을 거쳐 중화되며, 최종적으로 아스피린(아세틸살리실산)과 아세트산이 생성됩니다.',
      arrows: [],
    },
  ],
}
