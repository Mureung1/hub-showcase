export type TodayQueueStatus = 'done' | 'current' | 'locked' | 'optional'

export type TodayQueueItem = {
  id: string
  workspaceMissionId?: string
  stepOffset?: number
  title: string
  detail: string
  durationMinutes: number
  status: TodayQueueStatus
}

export type ReviewSummaryItem = {
  id: string
  title: string
  detail: string
}

export const todayQueue: TodayQueueItem[] = [
  {
    id: 'concept-state',
    title: 'state 개념 확인',
    detail: '컴포넌트가 값을 기억하는 방식을 정리합니다.',
    durationMinutes: 8,
    status: 'done',
  },
  {
    id: 'counter-mission',
    title: 'Counter.jsx 실습',
    detail: '버튼 클릭으로 count가 증가하도록 구현합니다.',
    durationMinutes: 18,
    status: 'current',
  },
  {
    id: 'run-tests',
    title: '테스트 실행',
    detail: '기본 동작과 이벤트 핸들러 연결을 확인합니다.',
    durationMinutes: 5,
    status: 'locked',
  },
  {
    id: 'ai-review',
    title: 'AI 코드 리뷰',
    detail: '통과한 코드의 개선점을 짧게 확인합니다.',
    durationMinutes: 7,
    status: 'optional',
  },
]

export const reviewSummaryItems: ReviewSummaryItem[] = [
  {
    id: 'props-state',
    title: 'props와 state 구분',
    detail: '전달받는 값과 내부에서 바뀌는 값을 비교합니다.',
  },
  {
    id: 'event-handler',
    title: '이벤트 핸들러 위치',
    detail: '클릭 핸들러 안에서 상태 업데이트가 호출되는지 확인합니다.',
  },
]

export const recentMistakes: ReviewSummaryItem[] = [
  {
    id: 'missing-state-update',
    title: 'state 업데이트 누락',
    detail: 'Counter 실습에서 setCount 호출 위치를 놓쳤습니다.',
  },
]
