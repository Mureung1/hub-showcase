import type { Briefing } from '@shared/schemas';

const BASE_DATE = '2026-07-09';

export const MOCK_BRIEFING: Briefing = {
  date: BASE_DATE,
  greeting: '최범규님 안녕하세요!',
  schedules: [
    {
      id: 'a1000001-0001-4000-8000-000000000001',
      title: '치과',
      date: BASE_DATE,
      startTime: '15:00',
      rawInput: '오후 3시 치과',
      createdAt: '2026-07-08T10:00:00+09:00',
    },
    {
      id: 'a1000001-0001-4000-8000-000000000002',
      title: '대외활동 모임',
      date: BASE_DATE,
      startTime: '19:00',
      rawInput: '저녁 7시 대외활동 정기 모임',
      createdAt: '2026-07-07T15:00:00+09:00',
    },
  ],
  routines: [
    {
      id: 'b1000001-0001-4000-8000-000000000001',
      title: '오늘의 루틴',
      content: '200 push-up, 500 squat',
      startTime: '20:00',
      endTime: '22:00',
      repeatRule: '2split',
      rawInput: '매일 운동 루틴 상체 day',
      createdAt: '2026-07-01T09:00:00+09:00',
    },
  ],
  meal: {
    id: 'c1000001-0001-4000-8000-000000000001',
    date: BASE_DATE,
    breakfast: '그릭요거트 · 바나나',
    lunch: '잡곡밥 · 닭가슴살',
    dinner: '삶은 달걀 3개 · 샐러드',
    rawInput: '오늘 식단 아침 그릭요거트 바나나 점심 잡곡밥 닭가슴살 저녁 삶은달걀 3개 샐러드',
    createdAt: '2026-07-08T22:00:00+09:00',
  },
  deadlines: [
    {
      id: 'd1000001-0001-4000-8000-000000000001',
      title: '공모전 서류 제출',
      deadline: '2026-07-11',
      completed: false,
      rawInput: '공모전 서류 토요일까지 제출',
      createdAt: '2026-07-05T10:00:00+09:00',
    },
    {
      id: 'd1000001-0001-4000-8000-000000000002',
      title: '데이터베이스 과제 제출',
      deadline: '2026-07-10',
      completed: false,
      rawInput: '금요일까지 데이터베이스 과제 제출',
      createdAt: '2026-07-07T14:00:00+09:00',
    },
    {
      id: 'd1000001-0001-4000-8000-000000000003',
      title: '동아리 회비 납부',
      deadline: '2026-07-14',
      completed: false,
      rawInput: '동아리 회비 다음주 화요일까지',
      createdAt: '2026-07-06T09:00:00+09:00',
    },
  ],
  memos: [
    {
      id: 'e1000001-0001-4000-8000-000000000001',
      content: '아침 주변 체크리스트 확인하기',
      rawInput: '아침 주변 체크리스트 확인하기',
      createdAt: '2026-07-08T23:00:00+09:00',
    },
  ],
};
