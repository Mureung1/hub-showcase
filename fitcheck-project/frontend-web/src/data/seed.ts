import type { AppData, Exercise, WorkoutRecord } from '../types';
import { daysAgo, todayString } from '../utils/date';
import { generateId } from '../utils/routine';

const MEMBER_ROUTINES: Record<string, Exercise[]> = {
  '1': [
    { id: 'e1', name: '벤치프레스', weight: 60, sets: 3, reps: 10 },
    { id: 'e2', name: '인클라인 덤벨프레스', weight: 22, sets: 3, reps: 12 },
    { id: 'e3', name: '케이블 플라이', weight: 15, sets: 3, reps: 15 },
    { id: 'e4', name: '트라이셉스 푸시다운', weight: 20, sets: 3, reps: 12 },
  ],
  '2': [
    { id: 'e5', name: '스쿼트', weight: 70, sets: 4, reps: 8 },
    { id: 'e6', name: '레그프레스', weight: 120, sets: 3, reps: 12 },
    { id: 'e7', name: '루마니안 데드리프트', weight: 50, sets: 3, reps: 10 },
    { id: 'e8', name: '레그컬', weight: 35, sets: 3, reps: 15 },
  ],
  '3': [
    { id: 'e9', name: '데드리프트', weight: 100, sets: 3, reps: 5 },
    { id: 'e10', name: '풀업', weight: 0, sets: 4, reps: 8 },
    { id: 'e11', name: '바벨로우', weight: 60, sets: 3, reps: 10 },
    { id: 'e12', name: '페이스풀', weight: 15, sets: 3, reps: 15 },
  ],
  '4': [
    { id: 'e13', name: '랫풀다운', weight: 45, sets: 3, reps: 12 },
    { id: 'e14', name: '시티드 로우', weight: 40, sets: 3, reps: 10 },
    { id: 'e15', name: '리어 델트 플라이', weight: 8, sets: 3, reps: 15 },
    { id: 'e16', name: '바벨 컬', weight: 20, sets: 3, reps: 12 },
  ],
  '5': [
    { id: 'e17', name: '오버헤드프레스', weight: 40, sets: 3, reps: 10 },
    { id: 'e18', name: '사이드 레터럴 레이즈', weight: 8, sets: 4, reps: 15 },
    { id: 'e19', name: '프론트 레이즈', weight: 10, sets: 3, reps: 12 },
    { id: 'e20', name: '업라이트 로우', weight: 25, sets: 3, reps: 12 },
  ],
};

/** 8주간 메인 운동 중량 추이 (회원별) */
const MAIN_WEIGHT_PROGRESSION: Record<string, number[]> = {
  '1': [50, 52.5, 55, 55, 57.5, 57.5, 60, 60],
  '2': [60, 62.5, 65, 65, 67.5, 67.5, 70, 70],
  '3': [90, 92.5, 95, 95, 97.5, 97.5, 100, 100],
  '4': [35, 37.5, 40, 40, 42.5, 42.5, 45, 45],
  '5': [32.5, 35, 37.5, 37.5, 40, 40, 40, 40],
};

function createWorkoutHistory(): WorkoutRecord[] {
  const records: WorkoutRecord[] = [];

  for (const [memberId, weights] of Object.entries(MAIN_WEIGHT_PROGRESSION)) {
    const template = MEMBER_ROUTINES[memberId]!;
    for (let week = 0; week < 8; week++) {
      const mainWeight = weights[week]!;
      const exercises = template.map((ex, i) => ({
        ...ex,
        id: `wh-${memberId}-w${week}-e${i}`,
        weight: i === 0 ? mainWeight : ex.weight,
      }));

      records.push({
        id: `wh-${memberId}-w${week}`,
        memberId,
        date: daysAgo(7 * (7 - week)),
        exercises,
      });
    }
  }

  return records;
}

export function createSeedData(): AppData {
  const today = todayString();

  return {
    members: [
      {
        id: '1',
        name: '이준호',
        avatar: '준',
        lastContactDate: daysAgo(9),
        goal: '체지방 감량 + 근력 유지',
      },
      {
        id: '2',
        name: '박서연',
        avatar: '서',
        lastContactDate: daysAgo(4),
        goal: '하체 근비대',
      },
      {
        id: '3',
        name: '최민수',
        avatar: '민',
        lastContactDate: daysAgo(5),
        goal: '데드리프트 140kg 달성',
      },
      {
        id: '4',
        name: '김하늘',
        avatar: '하',
        lastContactDate: daysAgo(1),
        goal: '등/이두 집중 벌크업',
      },
      {
        id: '5',
        name: '정우진',
        avatar: '우',
        lastContactDate: today,
        goal: '어깨 라인 개선',
      },
    ],
    routines: structuredClone(MEMBER_ROUTINES),
    meals: [
      {
        id: 'm1',
        memberId: '2',
        date: today,
        mealType: '아침',
        time: '08:12',
        memo: '오트밀 + 바나나 + 프로틴',
        pending: true,
      },
      {
        id: 'm2',
        memberId: '3',
        date: today,
        mealType: '점심',
        time: '12:34',
        memo: '닭가슴살 도시락, 현미밥',
        pending: true,
      },
      {
        id: 'm3',
        memberId: '4',
        date: today,
        mealType: '저녁',
        time: '19:05',
        memo: '연어 샐러드, 고구마',
        pending: true,
      },
      {
        id: 'm4',
        memberId: '5',
        date: today,
        mealType: '간식',
        time: '15:20',
        memo: '그릭요거트 + 견과류',
        pending: false,
        feedback: '단백질 보충 잘 하고 있어요!',
        feedbackAt: new Date().toISOString(),
      },
      {
        id: 'm5',
        memberId: '1',
        date: today,
        mealType: '점심',
        time: '13:01',
        memo: '샐러드 볼 (단백질 부족)',
        pending: true,
      },
      {
        id: 'm6',
        memberId: '2',
        date: daysAgo(1),
        mealType: '저녁',
        time: '20:10',
        memo: '삼겹살 + 상추쌈 (치팅데이)',
        pending: false,
        feedback: '치팅데이 OK! 내일부터 단백질 위주로',
        feedbackAt: daysAgo(1),
      },
      {
        id: 'm7',
        memberId: '2',
        date: daysAgo(2),
        mealType: '아침',
        time: '07:50',
        memo: '계란 3개 + 토스트',
        pending: false,
        feedback: '단백질 충분해요',
        feedbackAt: daysAgo(2),
      },
      {
        id: 'm8',
        memberId: '3',
        date: daysAgo(3),
        mealType: '저녁',
        time: '19:30',
        memo: '소고기 구이 + 샐러드',
        pending: false,
        feedback: '완벽한 식단!',
        feedbackAt: daysAgo(3),
      },
      {
        id: 'm9',
        memberId: '4',
        date: daysAgo(5),
        mealType: '점심',
        time: '12:00',
        memo: '닭가슴살 샐러드',
        pending: false,
        feedback: '좋아요',
        feedbackAt: daysAgo(5),
      },
      {
        id: 'm10',
        memberId: '2',
        date: daysAgo(7),
        mealType: '점심',
        time: '12:20',
        memo: '현미밥 도시락',
        pending: false,
        feedback: '잘 하고 있어요',
        feedbackAt: daysAgo(7),
      },
      {
        id: 'm11',
        memberId: '3',
        date: daysAgo(10),
        mealType: '아침',
        time: '08:00',
        memo: '프로틴 쉐이크 + 바나나',
        pending: false,
        feedback: '굿',
        feedbackAt: daysAgo(10),
      },
      {
        id: 'm12',
        memberId: '4',
        date: daysAgo(14),
        mealType: '저녁',
        time: '20:00',
        memo: '닭가슴살 + 브로콜리',
        pending: false,
        feedback: '완벽',
        feedbackAt: daysAgo(14),
      },
    ],
    notifications: [
      {
        id: 'n1',
        message: '이준호 회원 — 9일간 무응답 (🔴)',
        time: '10분 전',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        message: '박서연 회원 — 오늘 아침 식단 업로드',
        time: '1시간 전',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n3',
        message: '최민수 회원 — 5일간 무응답 (🟡)',
        time: '3시간 전',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ],
    communicationLogs: [],
    sentGuides: [],
    workoutHistory: createWorkoutHistory(),
  };
}

export function createEmptyExercise(): Exercise {
  return { id: generateId(), name: '', weight: 0, sets: 3, reps: 10 };
}
