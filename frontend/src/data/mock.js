// 목데이터 — 백엔드 연동 전까지 화면을 채우는 더미 콘텐츠.
// 색상/배지 스타일은 여기서 정하지 않고 status 값만 담아 컴포넌트(css module + tokens.css)에서 매핑한다.

// '내가 쓴 편지'는 백엔드 실데이터(GET /api/letters)로 대체됨 — MINE_LETTERS 제거.
// 추천 편지(RECOMMEND_LETTER)도 백엔드 실데이터(POST /api/letters/:id/recommendations)로 대체됨.

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
