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
        '탄소는 친핵체가 공격한 반대쪽에서 이탈기가 빠져나가며 형태가 반전(inversion)되고, 새로운 C–O 결합을 가진 메탄올과 브로민화이온이 생성됩니다.',
      arrows: [],
    },
  ],
}
