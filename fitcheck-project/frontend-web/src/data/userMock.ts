export type BodyPart = '가슴' | '등' | '하체' | '어깨' | '코어';
export type Goal = '다이어트' | '벌크업' | '근력' | '입문';

export interface Course {
  id: string;
  title: string;
  bodyPart: BodyPart;
  goal: Goal;
  durationMin: number;
  level: '초급' | '중급' | '고급';
  trainer: string;
}

export interface MealLog {
  id: string;
  time: string;
  title: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  feedback: string;
  status: 'good' | 'warn' | 'info';
}

export interface GymPlace {
  id: string;
  name: string;
  type: '골목 헬스장' | '1인 PT숍' | '개인 트레이너';
  distanceKm: number;
  rating: number;
  tags: string[];
  address: string;
}

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: '초보 가슴 루틴 — 덤벨 프레스 마스터',
    bodyPart: '가슴',
    goal: '입문',
    durationMin: 18,
    level: '초급',
    trainer: '박코치',
  },
  {
    id: 'c2',
    title: '하체 데이: 스쿼트 폼 교정',
    bodyPart: '하체',
    goal: '근력',
    durationMin: 24,
    level: '중급',
    trainer: '이코치',
  },
  {
    id: 'c3',
    title: '등 자극 집중 — 랫풀다운 & 시티드로우',
    bodyPart: '등',
    goal: '벌크업',
    durationMin: 22,
    level: '중급',
    trainer: '박코치',
  },
  {
    id: 'c4',
    title: '다이어트 코어 15분 서킷',
    bodyPart: '코어',
    goal: '다이어트',
    durationMin: 15,
    level: '초급',
    trainer: '김코치',
  },
  {
    id: 'c5',
    title: '어깨 안정화 — 사이드 레터럴 가이드',
    bodyPart: '어깨',
    goal: '입문',
    durationMin: 16,
    level: '초급',
    trainer: '이코치',
  },
  {
    id: 'c6',
    title: '벌크업 푸시 데이 풀 루틴',
    bodyPart: '가슴',
    goal: '벌크업',
    durationMin: 35,
    level: '고급',
    trainer: '김코치',
  },
];

export const MOCK_MEALS: MealLog[] = [
  {
    id: 'm1',
    time: '08:10',
    title: '그릭요거트 + 바나나',
    calories: 320,
    carbs: 42,
    protein: 18,
    fat: 8,
    feedback: '단백질 비율이 좋아요해요. 오전 운동 전 좋은 선택입니다.',
    status: 'good',
  },
  {
    id: 'm2',
    time: '12:40',
    title: '닭가슴살 샐러드',
    calories: 480,
    carbs: 28,
    protein: 42,
    fat: 16,
    feedback: '탄단지 균형이 안정적입니다. 채소 양을 조금 더 늘려보세요.',
    status: 'good',
  },
  {
    id: 'm3',
    time: '16:20',
    title: '아메리카노 + 쿠키',
    calories: 260,
    carbs: 34,
    protein: 3,
    fat: 12,
    feedback: '단순당 비중이 높아요. 다음엔 견과류로 바꿔보는 걸 추천합니다.',
    status: 'warn',
  },
  {
    id: 'm4',
    time: '19:30',
    title: '현미밥 + 소불고기',
    calories: 640,
    carbs: 68,
    protein: 32,
    fat: 22,
    feedback: '저녁 탄수화물이 다소 높습니다. 내일 하체 데이라면 괜찮아요.',
    status: 'info',
  },
];

export const MOCK_GYMS: GymPlace[] = [
  {
    id: 'g1',
    name: '골목핏 헬스',
    type: '골목 헬스장',
    distanceKm: 0.4,
    rating: 4.8,
    tags: ['여성전용존', 'PT가능'],
    address: '서울 마포구 연남동',
  },
  {
    id: 'g2',
    name: '한스 PT Studio',
    type: '1인 PT숍',
    distanceKm: 0.7,
    rating: 4.9,
    tags: ['자세교정', '입문특화'],
    address: '서울 마포구 합정동',
  },
  {
    id: 'g3',
    name: '트레이너 최민수',
    type: '개인 트레이너',
    distanceKm: 1.1,
    rating: 4.7,
    tags: ['다이어트', '온라인상담'],
    address: '서울 서대문구 연희동',
  },
  {
    id: 'g4',
    name: '동네짐 24',
    type: '골목 헬스장',
    distanceKm: 1.4,
    rating: 4.5,
    tags: ['24시', '주차가능'],
    address: '서울 마포구 망원동',
  },
];

export const BODY_PARTS: Array<BodyPart | '전체'> = [
  '전체',
  '가슴',
  '등',
  '하체',
  '어깨',
  '코어',
];

export const GOALS: Array<Goal | '전체'> = [
  '전체',
  '다이어트',
  '벌크업',
  '근력',
  '입문',
];
