import type { ReactionTemplate } from './types'

export const sn1Reaction: ReactionTemplate = {
  id: 'sn1',
  name: 'SN1 친핵성 치환반응',
  summary:
    '3차 기질인 2-브로모-2-메틸프로판(tert-뷰틸 브로마이드)이 물 같은 약한 친핵체·극성 양성자성 용매 속에서 먼저 이온화해 탄소양이온을 만든 뒤 물이 공격하는(가용매분해) 두 단계 반응입니다. SN2와 달리 이탈기가 먼저 떠나는 게 특징입니다.',
  steps: [
    {
      id: 'ionization',
      smiles: 'CC(C)(C)Br.O',
      title: '1단계: 이온화 (느린 단계·속도 결정)',
      description:
        'C–Br 결합이 스스로 끊어지며(heterolysis) 전자쌍이 브로민 쪽으로 이동하고, 브로민이 이탈기로 먼저 떨어져 나갑니다. 3차 탄소라 만들어지는 탄소양이온이 안정하고 극성 양성자성 용매(물 등)가 이온을 안정화해 주어 이 단계가 가능하며, 이 느린 이온화 단계가 전체 반응 속도를 결정합니다(그래서 이름이 SN1 — 속도가 기질 농도 1차에만 의존). 참고로 친핵체가 물처럼 약한 염기일 때 SN1이 잘 일어나고, 하이드록시화이온 같은 강염기 조건에서는 대신 E2 제거가 우세해집니다.',
      arrows: [{ id: 'c-br-ionizes', source: { kind: 'sigma-bond', atoms: [1, 4] }, target: 4 }],
    },
    {
      id: 'carbocation',
      smiles: 'C[C+](C)C.O',
      title: '2단계: 물(친핵체)의 공격',
      description:
        '평면 삼각형 구조의 3차 탄소양이온을 물 분자의 비공유 전자쌍이 공격해 새로운 C–O 결합을 형성합니다. 탄소양이온은 평면이라 물이 양쪽 어느 면에서든 공격할 수 있어, 카이랄 기질이었다면 입체배치가 뒤섞인(라세미화) 생성물이 나옵니다 — SN2의 완전한 반전과 대조되는 지점입니다.',
      arrows: [{ id: 'nucleophile-attacks', source: { kind: 'lone-pair', atom: 4 }, target: 1 }],
    },
    {
      id: 'product',
      smiles: 'CC(C)(C)O.[Br-]',
      title: '생성물: tert-뷰탄올 + 브로민화이온',
      description:
        '물이 공격한 직후에는 양전하를 띤 상태(–OH₂⁺)이지만 곧 빠른 양성자 이동(별도로 표시하지 않음)을 거쳐 중화되어 3차 알코올인 tert-뷰탄올이 됩니다. 정리하면 SN1은 (이탈기 먼저 떠남 → 탄소양이온 중간체 → 친핵체 공격)의 2단계, SN2는 (친핵체 공격과 이탈기 이탈이 동시에)의 1단계로 서로 다릅니다.',
      arrows: [],
    },
  ],
}
