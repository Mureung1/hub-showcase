import type { ReactionTemplate } from './types'

export const e2EliminationReaction: ReactionTemplate = {
  id: 'e2-elimination',
  name: 'E2 제거반응',
  summary:
    '에톡시화이온이 2-브로모프로판의 베타 수소를 떼어내며 프로펜이 생성되는, 한 번에 결합이 끊어지고 만들어지는 협동(concerted) 반응입니다.',
  steps: [
    {
      id: 'reactant',
      smiles: 'CC[O-].CC(Br)C',
      title: '염기의 베타 수소 제거',
      description:
        '에톡시화이온(염기)의 비공유 전자쌍이 베타 탄소에 붙은 수소를 떼어내는 동시에, C–Br 결합은 끊어지며 브로민이 이탈기로 떨어져 나갑니다. 수소가 붙어있던 자리(베타 탄소)에서 전자쌍이 이동해 새로운 C=C 파이 결합이 형성되며, 세 가지 변화가 동시에 일어나는 협동 반응입니다. 수소 원자는 그림에 따로 표시되지 않아 화살표가 베타 탄소 쪽을 향합니다.',
      arrows: [
        { id: 'base-removes-beta-h', source: { kind: 'lone-pair', atom: 2 }, target: 6 },
        { id: 'c-br-breaks', source: { kind: 'sigma-bond', atoms: [4, 5] }, target: 5 },
      ],
    },
    {
      id: 'product',
      smiles: 'CC=C.CCO.[Br-]',
      title: '생성물: 프로펜 + 에탄올 + 브로민화이온',
      description: '새로운 C=C 이중결합을 가진 프로펜과 에탄올, 브로민화이온이 생성됩니다.',
      arrows: [],
    },
  ],
}
