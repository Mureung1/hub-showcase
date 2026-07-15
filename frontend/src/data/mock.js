// 목데이터 — 백엔드 연동 전까지 화면을 채우는 더미 콘텐츠.
// 색상/배지 스타일은 여기서 정하지 않고 status 값만 담아 컴포넌트(css module + tokens.css)에서 매핑한다.

export const RECOMMEND_LETTER = {
  serialNo: 'BR-2024-0488',
  from: '모음소의 누군가',
  topic: '새로운 시작',
  title: '이 계절의 문턱에서',
  body: `요즘 저는 자주 새로운 시작을 생각합니다. 익숙했던 자리를 떠나는 일은 여전히 두렵지만, 그 두려움 뒤에 작은 기대가 숨어 있다는 걸 요즘에서야 알아가는 중입니다.

당신도 지금 어떤 문턱 앞에 서 있을까요. 만약 그렇다면, 너무 서두르지 않았으면 합니다. 시작은 한 번에 완성되지 않아도 괜찮으니까요.`,
}

// '내가 쓴 편지'는 백엔드 실데이터(GET /api/letters)로 대체됨 — MINE_LETTERS 제거.

// status: 'unread' | 'read' | 'passed'
export const RECEIVED_LETTERS = [
  {
    id: 'recv-1',
    status: 'unread',
    from: '모음소 · 익명',
    text: 'AI가 골라준 편지가 도착했어요. "새로운 시작"이라는 주제로 이어졌습니다.',
    date: '2024.05.12',
  },
  {
    id: 'recv-2',
    status: 'read',
    from: '모음소 · 익명',
    text: '읽었지만 아직 답장하지 않은 편지예요.',
    date: '2024.05.09',
  },
  {
    id: 'recv-3',
    status: 'passed',
    from: '모음소 · 익명',
    text: '스쳐 지나간 편지입니다.',
    date: '2024.05.03',
  },
]

// status: 'sending' | 'active'
export const LINKED_THREADS = [
  {
    id: 'linked-1',
    title: '이어진 대화',
    status: 'sending',
    text: '답장이 상대에게 전달되는 중이에요. (8시간 후 도착)',
    date: '2024.05.11',
  },
  {
    id: 'linked-2',
    title: '이어진 대화',
    status: 'active',
    text: '벌써 세 번째 답장을 주고받았어요.',
    date: '2024.04.28',
  },
]
