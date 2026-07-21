import type { LewisTemplate } from './types'

const O = { id: 'O', symbol: 'O', x: 150, y: 110 }
const H1 = { id: 'H1', symbol: 'H', x: 70, y: 110 }
const H2 = { id: 'H2', symbol: 'H', x: 230, y: 110 }
const BONDS = [
  { a: 'O', b: 'H1', order: 1 as const },
  { a: 'O', b: 'H2', order: 1 as const },
]

export const waterLewis: LewisTemplate = {
  id: 'water',
  name: '물 (H2O)',
  formula: 'H2O',
  totalValenceElectrons: 8,
  steps: [
    {
      id: 'count',
      title: '1단계: 원자가전자 총 개수 세기',
      description:
        '산소(O)는 원자가전자 6개, 수소(H)는 1개씩이라 총 6 + 1 + 1 = 8개의 전자를 배치해야 합니다.',
      atoms: [O, H1, H2],
      bonds: [],
      lonePairs: {},
    },
    {
      id: 'skeleton',
      title: '2단계: 뼈대 구조 정하기',
      description:
        '수소는 결합을 1개만 만들 수 있어 중심 원자가 될 수 없으므로, 산소를 중심 원자로 하고 수소 2개를 양쪽에 연결하는 뼈대를 정합니다.',
      atoms: [O, H1, H2],
      bonds: [],
      lonePairs: {},
    },
    {
      id: 'bonds',
      title: '3단계: 결합쌍 배치',
      description:
        'O-H 결합 2개를 그려 넣습니다. 결합 하나당 전자 2개를 쓰므로, 8개 중 4개(2쌍)를 사용했습니다.',
      atoms: [O, H1, H2],
      bonds: BONDS,
      lonePairs: {},
    },
    {
      id: 'terminal-octet',
      title: '4단계: 말단 원자(H) 전자 채우기 확인',
      description:
        '수소는 옥텟이 아니라 듀엣(전자 2개)이 목표인데, 이미 O와의 결합 1개로 전자 2개를 채웠으므로 추가로 채울 게 없습니다.',
      atoms: [O, H1, H2],
      bonds: BONDS,
      lonePairs: {},
    },
    {
      id: 'central-lone-pairs',
      title: '5단계: 남은 전자를 중심 원자에 배치',
      description:
        '8개 중 4개(결합 2개)를 이미 썼으니 4개(비공유 전자쌍 2개)가 남았습니다. 이 2쌍을 중심 원자인 산소에 배치합니다.',
      atoms: [O, H1, H2],
      bonds: BONDS,
      lonePairs: { O: 2 },
    },
    {
      id: 'formal-charge',
      title: '6단계: 형식 전하 확인 — 완성',
      description:
        '산소의 형식 전하 = 원자가전자(6) − 비공유 전자(4) − 결합 전자/2(2) = 0. 모든 원자의 형식 전하가 0이라 이 구조가 가장 안정한 루이스 구조입니다.',
      atoms: [O, H1, H2],
      bonds: BONDS,
      lonePairs: { O: 2 },
    },
  ],
}
