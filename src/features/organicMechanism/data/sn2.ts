import type { ReactionTemplate } from './types'

export const sn2Reaction: ReactionTemplate = {
  id: 'sn2',
  name: 'SN2 친핵성 치환반응',
  summary:
    '수산화이온이 브로민화메틸의 탄소를 뒤에서 공격하며 브로민이 이탈기로 떨어져 나가는 한 단계 반응입니다.',
  steps: [
    {
      id: 'reactant',
      smiles: '[OH-].CBr',
      title: '반응물: 수산화이온 + 브로민화메틸',
      description:
        '수산화이온(OH⁻)의 비공유 전자쌍이 브로민화메틸의 탄소를 공격하는 동시에, C–Br 결합의 전자쌍이 브로민 쪽으로 이동하며 결합이 끊어집니다.',
      arrows: [
        { id: 'nucleophile-attack', source: { kind: 'lone-pair', atom: 0 }, target: 1 },
        { id: 'leaving-group', source: { kind: 'sigma-bond', atoms: [1, 2] }, target: 2 },
      ],
    },
    {
      id: 'product',
      smiles: 'CO.[Br-]',
      title: '생성물: 메탄올 + 브로민화이온',
      description:
        '친핵체(OH⁻)가 이탈기(Br)의 정반대쪽에서 공격하기 때문에, 탄소에 붙은 나머지 결합들이 우산이 뒤집히듯 반대편으로 젖혀지는 배치 반전(inversion)이 일어납니다. 다만 이 예시(브로민화메틸)는 탄소의 나머지 세 자리가 모두 같은 수소라 반전이 일어나도 겉모습이 똑같아 그림에서는 드러나지 않습니다 — 반전을 눈으로 확인하려면 네 치환기가 모두 다른 카이랄 탄소가 필요합니다. 새로운 C–O 결합을 가진 메탄올과 브로민화이온이 생성됩니다.',
      arrows: [],
    },
  ],
}
