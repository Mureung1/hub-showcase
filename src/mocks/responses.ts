import type { Task, ResolvedParseResult } from '@shared/schemas';
import type { ClarifyData, QueryData } from '../types/overlay';
import { toConfirmData } from '../lib/parseResultToConfirmData';

const BASE_DATE = '2026-07-09';

const MOCK_PARSE_RESULT_TASK_CREATE: ResolvedParseResult = {
  status: 'resolved',
  intent: 'create',
  item: {
    type: 'tasks',
    data: {
      id: 'd1000001-0001-4000-8000-000000000002',
      title: '데이터베이스 과제 제출',
      deadline: '2026-07-10',
      completed: false,
      rawInput: '금요일까지 데이터베이스 과제 제출',
      createdAt: '2026-07-07T14:00:00+09:00',
    },
  },
};

const MOCK_PARSE_RESULT_ROUTINE_COMPLETE: ResolvedParseResult = {
  status: 'resolved',
  intent: 'complete',
  item: {
    type: 'routines',
    data: {
      id: 'b1000001-0001-4000-8000-000000000001',
      title: '오늘의 루틴',
      content: '200 push-up, 500 squat',
      startTime: '20:00',
      endTime: '22:00',
      repeatRule: '2split',
      rawInput: '매일 운동 루틴 상체 day',
      createdAt: '2026-07-01T09:00:00+09:00',
    },
  },
};

const MOCK_PARSE_RESULT_TASK_ADD: ResolvedParseResult = {
  status: 'resolved',
  intent: 'create',
  item: {
    type: 'tasks',
    data: {
      id: 'd1000001-0001-4000-8000-000000000004',
      title: '운동 기록 정리',
      deadline: '2026-07-09',
      completed: false,
      rawInput: '운동',
      createdAt: '2026-07-09T20:30:00+09:00',
    },
  },
};

const MOCK_PARSE_RESULT_ROUTINE_UPDATE: ResolvedParseResult = {
  status: 'resolved',
  intent: 'update',
  item: {
    type: 'routines',
    data: {
      id: 'b1000001-0001-4000-8000-000000000001',
      title: '오늘의 루틴',
      content: '200 push-up, 500 squat',
      startTime: '20:00',
      endTime: '22:00',
      repeatRule: '2split',
      rawInput: '매일 운동 루틴 상체 day',
      createdAt: '2026-07-01T09:00:00+09:00',
    },
  },
};

export const MOCK_CONFIRM_RESPONSE = toConfirmData(MOCK_PARSE_RESULT_TASK_CREATE);

export const MOCK_CLARIFY_RESPONSE: ClarifyData = {
  status: 'clarify',
  question: '어떤 작업일까요?',
  candidates: [
    {
      label: '오늘 운동 완료 기록',
      intent: 'complete',
      item: MOCK_PARSE_RESULT_ROUTINE_COMPLETE.item,
    },
    { label: '할 일 추가', intent: 'create', item: MOCK_PARSE_RESULT_TASK_ADD.item },
    { label: '루틴 수정', intent: 'update', item: MOCK_PARSE_RESULT_ROUTINE_UPDATE.item },
  ],
};

const MOCK_DEADLINE_ITEMS: Task[] = [
  {
    id: 'd1000001-0001-4000-8000-000000000002',
    title: '데이터베이스 과제 제출',
    deadline: '2026-07-10',
    completed: false,
    rawInput: '금요일까지 데이터베이스 과제 제출',
    createdAt: '2026-07-07T14:00:00+09:00',
  },
  {
    id: 'd1000001-0001-4000-8000-000000000001',
    title: '공모전 서류 제출',
    deadline: '2026-07-11',
    completed: false,
    rawInput: '공모전 서류 토요일까지 제출',
    createdAt: '2026-07-05T10:00:00+09:00',
  },
  {
    id: 'd1000001-0001-4000-8000-000000000003',
    title: '동아리 회비 납부',
    deadline: '2026-07-14',
    completed: false,
    rawInput: '동아리 회비 다음주 화요일까지',
    createdAt: '2026-07-06T09:00:00+09:00',
  },
];

export const MOCK_QUERY_RESPONSE: QueryData = {
  title: '이번 주 마감',
  count: 3,
  sortLabel: '마감순',
  items: MOCK_DEADLINE_ITEMS,
  baseDate: BASE_DATE,
};
