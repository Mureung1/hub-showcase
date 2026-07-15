import type { AppData, Exercise, MealEntry, MealType, WorkoutRecord } from '../types';
import { daysAgo, todayString } from '../utils/date';
import { generateId } from '../utils/routine';

const MEMBER_CALORIE_GOALS: Record<string, number> = {
  '1': 2000,
  '2': 2200,
  '3': 2800,
  '4': 2600,
  '5': 2300,
};

/** Base daily intake profile used to synthesize chart-friendly meal history */
const MEMBER_NUTRITION_PROFILE: Record<
  string,
  { baseCalories: number; carbsRatio: number; proteinRatio: number; fatRatio: number }
> = {
  '1': { baseCalories: 1750, carbsRatio: 0.4, proteinRatio: 0.3, fatRatio: 0.3 },
  '2': { baseCalories: 2100, carbsRatio: 0.45, proteinRatio: 0.3, fatRatio: 0.25 },
  '3': { baseCalories: 2650, carbsRatio: 0.4, proteinRatio: 0.35, fatRatio: 0.25 },
  '4': { baseCalories: 2550, carbsRatio: 0.45, proteinRatio: 0.35, fatRatio: 0.2 },
  '5': { baseCalories: 2250, carbsRatio: 0.4, proteinRatio: 0.3, fatRatio: 0.3 },
};

const MEAL_SPLITS: { mealType: MealType; time: string; share: number; memo: string }[] = [
  { mealType: '아침', time: '08:10', share: 0.25, memo: '아침 식단' },
  { mealType: '점심', time: '12:30', share: 0.35, memo: '점심 식단' },
  { mealType: '간식', time: '16:00', share: 0.1, memo: '간식' },
  { mealType: '저녁', time: '19:20', share: 0.3, memo: '저녁 식단' },
];

function splitMacros(
  calories: number,
  carbsRatio: number,
  proteinRatio: number,
  fatRatio: number,
) {
  const carbs = Math.round((calories * carbsRatio) / 4);
  const protein = Math.round((calories * proteinRatio) / 4);
  const fat = Math.round((calories * fatRatio) / 9);
  return { calories, carbs, protein, fat };
}

function createNutritionMealHistory(): MealEntry[] {
  const meals: MealEntry[] = [];

  for (const [memberId, profile] of Object.entries(MEMBER_NUTRITION_PROFILE)) {
    for (let day = 0; day < 30; day += 1) {
      // Skip a few days to simulate missing logs (visible in 30d view)
      if (day % 11 === 7) continue;

      const wave = Math.sin(day / 3) * 180;
      const plateau = day >= 10 && day <= 18 ? -220 : 0;
      const dailyCalories = Math.max(
        1200,
        Math.round(profile.baseCalories + wave + plateau + ((day % 5) - 2) * 40),
      );

      for (const split of MEAL_SPLITS) {
        // Drop snack on some days for variety
        if (split.mealType === '간식' && day % 4 === 0) continue;

        const mealCalories = Math.round(dailyCalories * split.share);
        const macros = splitMacros(
          mealCalories,
          profile.carbsRatio,
          profile.proteinRatio,
          profile.fatRatio,
        );

        meals.push({
          id: `nm-${memberId}-d${day}-${split.mealType}`,
          memberId,
          date: daysAgo(day),
          mealType: split.mealType,
          time: split.time,
          memo: split.memo,
          pending: false,
          ...macros,
        });
      }
    }
  }

  return meals;
}

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
  const generatedMeals = createNutritionMealHistory();

  const highlightMeals: MealEntry[] = [
    {
      id: 'm1',
      memberId: '2',
      date: today,
      mealType: '아침',
      time: '08:12',
      memo: '오트밀 + 바나나 + 프로틴',
      pending: true,
      calories: 420,
      carbs: 58,
      protein: 28,
      fat: 9,
    },
    {
      id: 'm2',
      memberId: '3',
      date: today,
      mealType: '점심',
      time: '12:34',
      memo: '닭가슴살 도시락, 현미밥',
      pending: true,
      calories: 620,
      carbs: 64,
      protein: 48,
      fat: 14,
    },
    {
      id: 'm3',
      memberId: '4',
      date: today,
      mealType: '저녁',
      time: '19:05',
      memo: '연어 샐러드, 고구마',
      pending: true,
      calories: 580,
      carbs: 42,
      protein: 40,
      fat: 22,
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
      calories: 280,
      carbs: 18,
      protein: 20,
      fat: 14,
    },
    {
      id: 'm5',
      memberId: '1',
      date: today,
      mealType: '점심',
      time: '13:01',
      memo: '샐러드 볼 (단백질 부족)',
      pending: true,
      calories: 380,
      carbs: 32,
      protein: 18,
      fat: 16,
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
      calories: 920,
      carbs: 28,
      protein: 42,
      fat: 68,
    },
  ];

  // Prefer highlight meals when ids collide with generated history for today/yesterday.
  const highlightIds = new Set(highlightMeals.map((meal) => meal.id));
  const meals = [
    ...highlightMeals,
    ...generatedMeals.filter((meal) => {
      if (highlightIds.has(meal.id)) return false;
      // Replace generated slots that overlap highlight member/date/mealType
      return !highlightMeals.some(
        (highlight) =>
          highlight.memberId === meal.memberId &&
          highlight.date === meal.date &&
          highlight.mealType === meal.mealType,
      );
    }),
  ];

  return {
    members: [
      {
        id: '1',
        name: '이준호',
        avatar: '준',
        lastContactDate: daysAgo(9),
        goal: '체지방 감량 + 근력 유지',
        calorieGoal: MEMBER_CALORIE_GOALS['1']!,
      },
      {
        id: '2',
        name: '박서연',
        avatar: '서',
        lastContactDate: daysAgo(4),
        goal: '하체 근비대',
        calorieGoal: MEMBER_CALORIE_GOALS['2']!,
      },
      {
        id: '3',
        name: '최민수',
        avatar: '민',
        lastContactDate: daysAgo(5),
        goal: '데드리프트 140kg 달성',
        calorieGoal: MEMBER_CALORIE_GOALS['3']!,
      },
      {
        id: '4',
        name: '김하늘',
        avatar: '하',
        lastContactDate: daysAgo(1),
        goal: '등/이두 집중 벌크업',
        calorieGoal: MEMBER_CALORIE_GOALS['4']!,
      },
      {
        id: '5',
        name: '정우진',
        avatar: '우',
        lastContactDate: today,
        goal: '어깨 라인 개선',
        calorieGoal: MEMBER_CALORIE_GOALS['5']!,
      },
    ],
    routines: structuredClone(MEMBER_ROUTINES),
    meals,
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
