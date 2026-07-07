import type { ReactionTemplate } from './types'

export const electrophilicAdditionReaction: ReactionTemplate = {
  id: 'electrophilic-addition',
  name: '알켄 첨가반응 (마르코니코프)',
  summary:
    '프로펜에 브로민화수소(HBr)가 첨가되어 2-브로모프로판이 생성되는, 마르코니코프 법칙을 따르는 2단계 반응입니다.',
  steps: [
    {
      id: 'reactant',
      smiles: 'CC=C.Br',
      title: '1단계: 양성자 첨가',
      description:
        '알켄의 파이(π) 결합이 브로민화수소의 산성 양성자를 공격해 새로운 C–H 결합을 형성하고, 동시에 H–Br 결합이 끊어지며 전자쌍이 브로민 쪽으로 이동합니다. 수소가 더 많이 붙어있던 탄소에 새 수소가 붙어, 더 안정한 2차 탄소양이온이 만들어집니다 (마르코니코프 법칙). 수소 원자는 그림에 따로 표시되지 않아 화살표가 브로민 쪽을 향하지만, 실제로는 브로민에 붙은 수소를 공격합니다.',
      arrows: [{ id: 'pi-attacks-hbr', source: { kind: 'pi-bond', atoms: [1, 2] }, target: 3 }],
    },
    {
      id: 'carbocation',
      smiles: 'C[CH+]C.[Br-]',
      title: '2단계: 브로민화이온의 공격',
      description:
        '브로민화이온(Br⁻)의 비공유 전자쌍이 2차 탄소양이온을 공격하며 새로운 C–Br 결합을 형성합니다.',
      arrows: [{ id: 'br-attacks-cation', source: { kind: 'lone-pair', atom: 3 }, target: 1 }],
    },
    {
      id: 'product',
      smiles: 'CC(Br)C',
      title: '생성물: 2-브로모프로판',
      description: '브로민이 중심 탄소에 결합해 2-브로모프로판이 생성되며 반응이 완료됩니다.',
      arrows: [],
    },
  ],
}
