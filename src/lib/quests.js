// 퀘스트 게시판(FR-11, 일간/주간 로테이션 FR-16) — MY 탭 "오늘의 미션"(missions.js)과는 별개의
// 새 시스템이다. missions.js는 하루 1개를 결정적으로 골라 보여줄 뿐 완료 이력을 저장하지 않는 반면,
// 이 모듈은 일간 풀 34개 중 3개·주간 풀 36개 중 5개를 매일/매주 자동 로테이션으로 노출하고, 완료
// (수령)를 dataStore.claimQuest로 영구 저장해 중복 XP 지급을 막는다. 로테이션 선택은 hashString
// 기반 결정적 해시라 서버 크론 없이 클라이언트에서 항상 같은 결과를 재계산할 수 있다.
//
// "너무 어려운 미션 금지, 부담 없이 재미있게" 요청에 따라 모든 퀘스트를 자동 판정+자동 수령(마운트
// 시 QuestBoard.jsx의 안전망, 또는 끼니 저장 직후 Analyze.jsx의 runGamification)으로 통일했다 —
// FR-11 초기 버전에 있던 "수령하기" 수동 클레임 버튼은 더 이상 없다(물/영양제도 WaterIntakeCard에서
// 기록하는 즉시 다음 방문 때 조용히 자동 수령된다).
//
// 리텐션 강화 v5 — "물 목표 3일/4일/5일 달성"처럼 같은 행동을 임계값만 바꿔 반복 노출한다는 피드백에
// 따라 모든 퀘스트에 category(같은 "행동"을 묶는 태그)를 붙이고, selectRotation이 같은 category를
// 최대 2개까지만 로테이션에 넣도록 제한한다(아래 selectRotation 참고). 동시에 아침/저녁 챙기기·
// 짧은 스트릭·퀴즈 1회 등 새 카테고리 퀘스트를 추가해 로테이션 자체의 다양성도 늘렸다.
import { hashString } from './hashString.js'
import { isSetMeal } from './mealStore.js'
import { isMet } from './nutrientCriteria.js'
import { NUTRIENT_SATISFY_RATIO, NUTRITION_SOURCE } from './nutrition.js'

const MEAL_TYPES_FOR_THREE_MEALS = ['breakfast', 'lunch', 'dinner']

function hasMealType(ctx, type) {
  return ctx.mealTypesToday?.has(type) === true
}

function hasAllMealTypes(ctx, types) {
  return types.every((t) => hasMealType(ctx, t))
}

// ctx(일간): { mealCount, todayTotal, recommended, mealTypesToday: Set<string>, streakCurrent,
//   waterMlConsumed, waterTargetMl, supplementTaken, hasSetMeal, hasDbMatchedItem,
//   hasServingsAdjustedItem, hasLabelScanItem,
//   weekLoggedDays, weekThreeMealDays, weekBreakfastDays, weekDinnerDays, weekWaterMetDays,
//   weekSupplementDays, weekSodiumOkDays, weekLongestStreak, weekQuizDays, weekProteinOkDays,
//   weekCarbsOkDays, weekFatOkDays, weekFiberOkDays, weekCalorieOkDays, weekUniqueFoodCount,
//   weekComboBuilderDays, weekMapDuelDays }
//
// category: 같은 "행동"을 묶는 태그(selectRotation이 카테고리당 최대 2개로 제한하는 데 쓴다) — 화면에
// 노출되지 않는 내부 분류일 뿐이라 자유롭게 늘려도 된다.
export const DAILY_QUEST_POOL = [
  { id: 'first-meal-today', title: '오늘 한 끼 기록', description: '오늘 식사를 한 번 기록해보세요.', xp: 10, category: 'log', evaluate: (ctx) => (ctx.mealCount ?? 0) >= 1 },
  { id: 'three-meals', title: '세 끼 모두 기록', description: '아침·점심·저녁을 모두 기록해보세요.', xp: 15, category: 'log', evaluate: (ctx) => hasAllMealTypes(ctx, MEAL_TYPES_FOR_THREE_MEALS) },
  { id: 'protein-80', title: '단백질 80% 채우기', description: '오늘 단백질 섭취량을 권장량의 80% 이상으로 채워보세요.', xp: 15, category: 'protein', evaluate: (ctx) => isMet('protein', ctx.todayTotal?.protein, ctx.recommended?.protein, NUTRIENT_SATISFY_RATIO) },
  { id: 'sodium-in-limit', title: '나트륨 관리', description: '오늘 나트륨 섭취를 상한 이내로 유지해보세요.', xp: 15, category: 'sodium', evaluate: (ctx) => (ctx.mealCount ?? 0) >= 1 && isMet('sodium', ctx.todayTotal?.sodium, ctx.recommended?.sodium) },
  { id: 'streak-3', title: '3일 연속 기록', description: '3일 연속으로 식사를 기록해보세요.', xp: 20, category: 'streak', evaluate: (ctx) => (ctx.streakCurrent ?? 0) >= 3 },
  { id: 'water-4', title: '물 목표 절반 마시기', description: '오늘 물 섭취 목표의 절반 이상을 채워보세요.', xp: 10, category: 'water', evaluate: (ctx) => (ctx.waterMlConsumed ?? 0) >= (ctx.waterTargetMl ?? 0) * 0.5 },
  { id: 'supplement', title: '영양제 챙겨 먹기', description: '오늘 영양제 섭취를 체크해보세요.', xp: 5, category: 'supplement', evaluate: (ctx) => ctx.supplementTaken === true },
  { id: 'breakfast-log', title: '아침 기록하기', description: '아침 식사를 기록해보세요.', xp: 10, category: 'log', evaluate: (ctx) => hasMealType(ctx, 'breakfast') },
  { id: 'lunch-log', title: '점심 기록하기', description: '점심 식사를 기록해보세요.', xp: 10, category: 'log', evaluate: (ctx) => hasMealType(ctx, 'lunch') },
  { id: 'dinner-log', title: '저녁 기록하기', description: '저녁 식사를 기록해보세요.', xp: 10, category: 'log', evaluate: (ctx) => hasMealType(ctx, 'dinner') },
  { id: 'two-meals', title: '두 끼 이상 기록', description: '오늘 두 끼 이상 기록해보세요.', xp: 15, category: 'log', evaluate: (ctx) => (ctx.mealTypesToday?.size ?? 0) >= 2 },
  { id: 'set-meal', title: '한 끼에 두 가지 이상 먹기', description: '한 번의 식사에 두 가지 이상의 음식을 기록해보세요.', xp: 10, category: 'log', evaluate: (ctx) => ctx.hasSetMeal === true },
  { id: 'protein-50', title: '단백질 절반 채우기', description: '오늘 단백질 섭취량을 권장량의 50% 이상으로 채워보세요.', xp: 10, category: 'protein', evaluate: (ctx) => isMet('protein', ctx.todayTotal?.protein, ctx.recommended?.protein, 0.5) },
  { id: 'protein-100', title: '단백질 완주하기', description: '오늘 단백질 섭취량을 권장량만큼 채워보세요.', xp: 20, category: 'protein', evaluate: (ctx) => isMet('protein', ctx.todayTotal?.protein, ctx.recommended?.protein, 1) },
  { id: 'carbs-80', title: '탄수화물 80% 채우기', description: '오늘 탄수화물 섭취량을 권장량의 80% 이상으로 채워보세요.', xp: 15, category: 'carbs', evaluate: (ctx) => isMet('carbs', ctx.todayTotal?.carbs, ctx.recommended?.carbs, NUTRIENT_SATISFY_RATIO) },
  {
    id: 'fat-balance',
    title: '지방 적정 범위 지키기',
    description: '오늘 지방 섭취량을 권장량의 80~120% 범위로 맞춰보세요.',
    xp: 15,
    category: 'fat',
    evaluate: (ctx) => {
      const rec = ctx.recommended?.fat
      if (!(rec > 0)) return false
      const actual = ctx.todayTotal?.fat ?? 0
      return actual >= rec * 0.8 && actual <= rec * 1.2
    },
  },
  { id: 'fiber-80', title: '식이섬유 80% 채우기', description: '오늘 식이섬유 섭취량을 권장량의 80% 이상으로 채워보세요.', xp: 15, category: 'fiber', evaluate: (ctx) => isMet('fiber', ctx.todayTotal?.fiber, ctx.recommended?.fiber, NUTRIENT_SATISFY_RATIO) },
  {
    id: 'calorie-balance',
    title: '칼로리 적정 범위 지키기',
    description: '오늘 칼로리 섭취량을 권장량의 85~115% 범위로 맞춰보세요.',
    xp: 20,
    category: 'calorie',
    evaluate: (ctx) => {
      const rec = ctx.recommended?.calories
      if (!(rec > 0)) return false
      const actual = ctx.todayTotal?.calories ?? 0
      return actual >= rec * 0.85 && actual <= rec * 1.15
    },
  },
  { id: 'water-25', title: '물 조금씩이라도 마시기', description: '오늘 물 섭취 목표의 25% 이상을 채워보세요.', xp: 5, category: 'water', evaluate: (ctx) => (ctx.waterMlConsumed ?? 0) >= (ctx.waterTargetMl ?? 0) * 0.25 },
  { id: 'water-80', title: '물 목표 80% 마시기', description: '오늘 물 섭취 목표의 80% 이상을 채워보세요.', xp: 15, category: 'water', evaluate: (ctx) => (ctx.waterMlConsumed ?? 0) >= (ctx.waterTargetMl ?? 0) * 0.8 },
  { id: 'water-full', title: '물 목표 완주하기', description: '오늘 물 섭취 목표를 전부 채워보세요.', xp: 20, category: 'water', evaluate: (ctx) => (ctx.waterTargetMl ?? 0) > 0 && (ctx.waterMlConsumed ?? 0) >= ctx.waterTargetMl },
  { id: 'streak-5', title: '5일 연속 기록', description: '5일 연속으로 식사를 기록해보세요.', xp: 25, category: 'streak', evaluate: (ctx) => (ctx.streakCurrent ?? 0) >= 5 },
  { id: 'streak-7', title: '일주일 연속 기록', description: '7일 연속으로 식사를 기록해보세요.', xp: 30, category: 'streak', evaluate: (ctx) => (ctx.streakCurrent ?? 0) >= 7 },
  { id: 'db-matched-meal', title: '정확한 DB 매칭으로 기록하기', description: '식약처 DB로 정확히 매칭된 음식을 기록해보세요.', xp: 10, category: 'accuracy', evaluate: (ctx) => ctx.hasDbMatchedItem === true },
  { id: 'servings-adjusted', title: '인분 수 조절해서 기록하기', description: '실제로 먹은 만큼 인분 수를 조절해 기록해보세요.', xp: 10, category: 'accuracy', evaluate: (ctx) => ctx.hasServingsAdjustedItem === true },
  { id: 'breakfast-dinner', title: '아침·저녁 챙기기', description: '아침과 저녁을 모두 기록해보세요.', xp: 15, category: 'log', evaluate: (ctx) => hasAllMealTypes(ctx, ['breakfast', 'dinner']) },
  { id: 'lunch-dinner', title: '점심·저녁 챙기기', description: '점심과 저녁을 모두 기록해보세요.', xp: 15, category: 'log', evaluate: (ctx) => hasAllMealTypes(ctx, ['lunch', 'dinner']) },
  {
    id: 'dual-nutrient',
    title: '단백질+나트륨 동시 관리',
    description: '단백질 80% 채우기와 나트륨 관리를 동시에 달성해보세요.',
    xp: 20,
    category: 'combo',
    evaluate: (ctx) =>
      isMet('protein', ctx.todayTotal?.protein, ctx.recommended?.protein, NUTRIENT_SATISFY_RATIO) &&
      (ctx.mealCount ?? 0) >= 1 &&
      isMet('sodium', ctx.todayTotal?.sodium, ctx.recommended?.sodium),
  },
  { id: 'label-scan', title: '영양성분표 스캔으로 기록하기', description: '영양성분표를 스캔해서 기록해보세요.', xp: 10, category: 'accuracy', evaluate: (ctx) => ctx.hasLabelScanItem === true },
  { id: 'low-effort-log', title: '가볍게라도 기록 남기기', description: '오늘 아무거나 한 번만 기록해도 괜찮아요.', xp: 5, category: 'log', evaluate: (ctx) => (ctx.mealCount ?? 0) >= 1 },
  // ── 다양화(리텐션 강화 v5) — carbs/fiber/fat 카테고리도 daily 안에서 임계값 2단계를 골라 볼 수 있게.
  { id: 'carbs-50', title: '탄수화물 절반 채우기', description: '오늘 탄수화물 섭취량을 권장량의 50% 이상으로 채워보세요.', xp: 10, category: 'carbs', evaluate: (ctx) => isMet('carbs', ctx.todayTotal?.carbs, ctx.recommended?.carbs, 0.5) },
  { id: 'carbs-100', title: '탄수화물 완주하기', description: '오늘 탄수화물 섭취량을 권장량만큼 채워보세요.', xp: 20, category: 'carbs', evaluate: (ctx) => isMet('carbs', ctx.todayTotal?.carbs, ctx.recommended?.carbs, 1) },
  { id: 'fiber-50', title: '식이섬유 절반 채우기', description: '오늘 식이섬유 섭취량을 권장량의 50% 이상으로 채워보세요.', xp: 10, category: 'fiber', evaluate: (ctx) => isMet('fiber', ctx.todayTotal?.fiber, ctx.recommended?.fiber, 0.5) },
  {
    id: 'fat-50',
    title: '지방 절반 이상 채우기',
    description: '오늘 지방 섭취량을 권장량의 50% 이상으로 채워보세요.',
    xp: 10,
    category: 'fat',
    evaluate: (ctx) => {
      const rec = ctx.recommended?.fat
      if (!(rec > 0)) return false
      return (ctx.todayTotal?.fat ?? 0) >= rec * 0.5
    },
  },
]

// 주간 퀘스트 XP는 일간 퀘스트 XP 스케일(5/10/15/20/25/30)의 정확히 5배(25/50/75/100/125/150)로
// 맞췄다(리텐션 강화 v5 — "주간 보상이 일간 대비 너무 짜다"는 피드백). 난이도가 높을수록(더 많은
// 일수를 요구할수록) 더 높은 티어를 쓴다.
//
// MY 탭 개편(퀘스트 화면 진행률 바) — metricKey/target: evaluate가 참조하는 ctx 필드명과 그 임계값을
// 그대로 데이터로도 갖고 있으면 "3/5일" 같은 숫자 진행률을 evaluate를 다시 파싱하지 않고 그릴 수
// 있다. week-try-both처럼 단일 필드로 표현 안 되는 항목만 metricKey 대신 progress(ctx)를 직접 준다
// (아래 progressOf가 있으면 그쪽을 우선한다).
export const WEEKLY_QUEST_POOL = [
  { id: 'week-log-3', title: '이번 주 3일 이상 기록', description: '이번 주 3일 이상 식사를 기록해보세요.', xp: 50, category: 'log', metricKey: 'weekLoggedDays', target: 3, evaluate: (ctx) => (ctx.weekLoggedDays ?? 0) >= 3 },
  { id: 'week-log-4', title: '이번 주 4일 이상 기록', description: '이번 주 4일 이상 식사를 기록해보세요.', xp: 75, category: 'log', metricKey: 'weekLoggedDays', target: 4, evaluate: (ctx) => (ctx.weekLoggedDays ?? 0) >= 4 },
  { id: 'week-log-5', title: '이번 주 5일 이상 기록', description: '이번 주 5일 이상 식사를 기록해보세요.', xp: 100, category: 'log', metricKey: 'weekLoggedDays', target: 5, evaluate: (ctx) => (ctx.weekLoggedDays ?? 0) >= 5 },
  { id: 'week-log-6', title: '이번 주 6일 이상 기록', description: '이번 주 6일 이상 식사를 기록해보세요.', xp: 125, category: 'log', metricKey: 'weekLoggedDays', target: 6, evaluate: (ctx) => (ctx.weekLoggedDays ?? 0) >= 6 },
  { id: 'week-log-7', title: '이번 주 개근 기록', description: '이번 주 7일 모두 식사를 기록해보세요.', xp: 150, category: 'log', metricKey: 'weekLoggedDays', target: 7, evaluate: (ctx) => (ctx.weekLoggedDays ?? 0) >= 7 },
  { id: 'week-3meals-2', title: '세 끼 모두 채운 날 2일', description: '이번 주 세 끼를 모두 채운 날이 2일 이상 되어보세요.', xp: 50, category: 'meal-completeness', metricKey: 'weekThreeMealDays', target: 2, evaluate: (ctx) => (ctx.weekThreeMealDays ?? 0) >= 2 },
  { id: 'week-3meals-3', title: '세 끼 모두 채운 날 3일', description: '이번 주 세 끼를 모두 채운 날이 3일 이상 되어보세요.', xp: 75, category: 'meal-completeness', metricKey: 'weekThreeMealDays', target: 3, evaluate: (ctx) => (ctx.weekThreeMealDays ?? 0) >= 3 },
  { id: 'week-3meals-4', title: '세 끼 모두 채운 날 4일', description: '이번 주 세 끼를 모두 채운 날이 4일 이상 되어보세요.', xp: 100, category: 'meal-completeness', metricKey: 'weekThreeMealDays', target: 4, evaluate: (ctx) => (ctx.weekThreeMealDays ?? 0) >= 4 },
  { id: 'week-water-3', title: '이번 주 물 목표 3일 달성', description: '이번 주 물 목표(80% 이상)를 3일 이상 달성해보세요.', xp: 50, category: 'water', metricKey: 'weekWaterMetDays', target: 3, evaluate: (ctx) => (ctx.weekWaterMetDays ?? 0) >= 3 },
  { id: 'week-water-4', title: '이번 주 물 목표 4일 달성', description: '이번 주 물 목표(80% 이상)를 4일 이상 달성해보세요.', xp: 75, category: 'water', metricKey: 'weekWaterMetDays', target: 4, evaluate: (ctx) => (ctx.weekWaterMetDays ?? 0) >= 4 },
  { id: 'week-water-5', title: '이번 주 물 목표 5일 달성', description: '이번 주 물 목표(80% 이상)를 5일 이상 달성해보세요.', xp: 100, category: 'water', metricKey: 'weekWaterMetDays', target: 5, evaluate: (ctx) => (ctx.weekWaterMetDays ?? 0) >= 5 },
  { id: 'week-supplement-3', title: '영양제 3일 챙기기', description: '이번 주 영양제를 3일 이상 챙겨보세요.', xp: 25, category: 'supplement', metricKey: 'weekSupplementDays', target: 3, evaluate: (ctx) => (ctx.weekSupplementDays ?? 0) >= 3 },
  { id: 'week-supplement-5', title: '영양제 5일 챙기기', description: '이번 주 영양제를 5일 이상 챙겨보세요.', xp: 75, category: 'supplement', metricKey: 'weekSupplementDays', target: 5, evaluate: (ctx) => (ctx.weekSupplementDays ?? 0) >= 5 },
  { id: 'week-supplement-7', title: '영양제 개근', description: '이번 주 7일 모두 영양제를 챙겨보세요.', xp: 125, category: 'supplement', metricKey: 'weekSupplementDays', target: 7, evaluate: (ctx) => (ctx.weekSupplementDays ?? 0) >= 7 },
  { id: 'week-sodium-3', title: '나트륨 관리 3일', description: '이번 주 나트륨 관리를 3일 이상 성공해보세요.', xp: 50, category: 'sodium', metricKey: 'weekSodiumOkDays', target: 3, evaluate: (ctx) => (ctx.weekSodiumOkDays ?? 0) >= 3 },
  { id: 'week-sodium-4', title: '나트륨 관리 4일', description: '이번 주 나트륨 관리를 4일 이상 성공해보세요.', xp: 75, category: 'sodium', metricKey: 'weekSodiumOkDays', target: 4, evaluate: (ctx) => (ctx.weekSodiumOkDays ?? 0) >= 4 },
  { id: 'week-sodium-5', title: '나트륨 관리 5일', description: '이번 주 나트륨 관리를 5일 이상 성공해보세요.', xp: 100, category: 'sodium', metricKey: 'weekSodiumOkDays', target: 5, evaluate: (ctx) => (ctx.weekSodiumOkDays ?? 0) >= 5 },
  { id: 'week-streak-5', title: '이번 주 5일 연속 기록', description: '이번 주 안에서 5일 연속으로 기록해보세요.', xp: 100, category: 'streak', metricKey: 'weekLongestStreak', target: 5, evaluate: (ctx) => (ctx.weekLongestStreak ?? 0) >= 5 },
  { id: 'week-quiz-3', title: '이번 주 퀴즈 3회 정답', description: '이번 주 식단 퀴즈를 3회 이상 맞혀보세요.', xp: 75, category: 'quiz', metricKey: 'weekQuizDays', target: 3, evaluate: (ctx) => (ctx.weekQuizDays ?? 0) >= 3 },
  { id: 'week-quiz-5', title: '이번 주 퀴즈 5회 정답', description: '이번 주 식단 퀴즈를 5회 이상 맞혀보세요.', xp: 125, category: 'quiz', metricKey: 'weekQuizDays', target: 5, evaluate: (ctx) => (ctx.weekQuizDays ?? 0) >= 5 },
  // ── 다양성 확대(주간 노출 개수 3→5에 맞춰 추가) — 물/나트륨/영양제에 편중되지 않도록 daily
  // 풀에만 있던 단백질/탄수화물/지방/식이섬유/칼로리 판정과 "새 기능 사용" 유도, 다양한 음식 섭취를
  // 주간 버전으로도 넣는다.
  { id: 'week-protein-3', title: '단백질 80% 3일 달성', description: '이번 주 단백질 섭취를 80% 이상 채운 날이 3일 이상 되어보세요.', xp: 50, category: 'protein', metricKey: 'weekProteinOkDays', target: 3, evaluate: (ctx) => (ctx.weekProteinOkDays ?? 0) >= 3 },
  { id: 'week-protein-5', title: '단백질 80% 5일 달성', description: '이번 주 단백질 섭취를 80% 이상 채운 날이 5일 이상 되어보세요.', xp: 100, category: 'protein', metricKey: 'weekProteinOkDays', target: 5, evaluate: (ctx) => (ctx.weekProteinOkDays ?? 0) >= 5 },
  { id: 'week-carbs-3', title: '탄수화물 80% 3일 달성', description: '이번 주 탄수화물 섭취를 80% 이상 채운 날이 3일 이상 되어보세요.', xp: 50, category: 'carbs', metricKey: 'weekCarbsOkDays', target: 3, evaluate: (ctx) => (ctx.weekCarbsOkDays ?? 0) >= 3 },
  { id: 'week-fat-3', title: '지방 적정 범위 3일 달성', description: '이번 주 지방 섭취를 적정 범위로 맞춘 날이 3일 이상 되어보세요.', xp: 50, category: 'fat', metricKey: 'weekFatOkDays', target: 3, evaluate: (ctx) => (ctx.weekFatOkDays ?? 0) >= 3 },
  { id: 'week-fiber-3', title: '식이섬유 80% 3일 달성', description: '이번 주 식이섬유 섭취를 80% 이상 채운 날이 3일 이상 되어보세요.', xp: 50, category: 'fiber', metricKey: 'weekFiberOkDays', target: 3, evaluate: (ctx) => (ctx.weekFiberOkDays ?? 0) >= 3 },
  { id: 'week-calorie-3', title: '칼로리 적정 범위 3일 달성', description: '이번 주 칼로리 섭취를 적정 범위로 맞춘 날이 3일 이상 되어보세요.', xp: 75, category: 'calorie', metricKey: 'weekCalorieOkDays', target: 3, evaluate: (ctx) => (ctx.weekCalorieOkDays ?? 0) >= 3 },
  { id: 'week-calorie-5', title: '칼로리 적정 범위 5일 달성', description: '이번 주 칼로리 섭취를 적정 범위로 맞춘 날이 5일 이상 되어보세요.', xp: 125, category: 'calorie', metricKey: 'weekCalorieOkDays', target: 5, evaluate: (ctx) => (ctx.weekCalorieOkDays ?? 0) >= 5 },
  { id: 'week-variety-5', title: '이번 주 5가지 다른 음식 먹기', description: '이번 주 서로 다른 음식을 5가지 이상 기록해보세요.', xp: 50, category: 'variety', metricKey: 'weekUniqueFoodCount', target: 5, evaluate: (ctx) => (ctx.weekUniqueFoodCount ?? 0) >= 5 },
  { id: 'week-variety-8', title: '이번 주 8가지 다른 음식 먹기', description: '이번 주 서로 다른 음식을 8가지 이상 기록해보세요.', xp: 100, category: 'variety', metricKey: 'weekUniqueFoodCount', target: 8, evaluate: (ctx) => (ctx.weekUniqueFoodCount ?? 0) >= 8 },
  { id: 'week-try-combo', title: '커스텀 조합 빌더 사용해보기', description: '홈 화면의 커스텀 조합 빌더로 나만의 조합을 만들어보세요.', xp: 25, category: 'feature', metricKey: 'weekComboBuilderDays', target: 1, evaluate: (ctx) => (ctx.weekComboBuilderDays ?? 0) >= 1 },
  { id: 'week-try-mapduel', title: '지도 듀얼 비교 사용해보기', description: '지도에서 식당 두 곳을 골라 영양을 비교해보세요.', xp: 25, category: 'feature', metricKey: 'weekMapDuelDays', target: 1, evaluate: (ctx) => (ctx.weekMapDuelDays ?? 0) >= 1 },
  // ── 다양화(리텐션 강화 v5) — 아침/저녁 챙기기, 짧은 주간 스트릭, 퀴즈 1회, 기능 2종 모두 써보기 등
  // 새 카테고리를 추가해 "물 목표 3/4/5일"류의 같은 행동 반복 노출을 줄인다.
  { id: 'week-breakfast-3', title: '아침 챙기기 3일', description: '이번 주 아침을 챙긴 날이 3일 이상 되어보세요.', xp: 50, category: 'breakfast', metricKey: 'weekBreakfastDays', target: 3, evaluate: (ctx) => (ctx.weekBreakfastDays ?? 0) >= 3 },
  { id: 'week-dinner-3', title: '저녁 챙기기 3일', description: '이번 주 저녁을 챙긴 날이 3일 이상 되어보세요.', xp: 50, category: 'dinner', metricKey: 'weekDinnerDays', target: 3, evaluate: (ctx) => (ctx.weekDinnerDays ?? 0) >= 3 },
  { id: 'week-streak-3', title: '이번 주 3일 연속 기록', description: '이번 주 안에서 3일 연속으로 기록해보세요.', xp: 75, category: 'streak', metricKey: 'weekLongestStreak', target: 3, evaluate: (ctx) => (ctx.weekLongestStreak ?? 0) >= 3 },
  { id: 'week-quiz-1', title: '이번 주 퀴즈 1회 정답', description: '이번 주 식단 퀴즈를 1회 이상 맞혀보세요.', xp: 50, category: 'quiz', metricKey: 'weekQuizDays', target: 1, evaluate: (ctx) => (ctx.weekQuizDays ?? 0) >= 1 },
  {
    id: 'week-try-both',
    title: '조합 빌더 + 지도 듀얼 둘 다 써보기',
    description: '이번 주 커스텀 조합 빌더와 지도 듀얼 비교를 모두 한 번씩 사용해보세요.',
    xp: 75,
    category: 'feature',
    // 단일 ctx 필드로 표현할 수 없어(두 기능을 각각 썼는지의 합) metricKey/target 대신 progress를 직접 준다.
    progress: (ctx) => ({ current: Number((ctx.weekComboBuilderDays ?? 0) >= 1) + Number((ctx.weekMapDuelDays ?? 0) >= 1), target: 2 }),
    evaluate: (ctx) => (ctx.weekComboBuilderDays ?? 0) >= 1 && (ctx.weekMapDuelDays ?? 0) >= 1,
  },
]

// 퀘스트 화면(MyQuestsPage)의 "N/target" 진행률 바용. quest.progress(ctx)가 있으면 그걸 우선하고(예:
// week-try-both), 아니면 metricKey/target으로 계산한다. 둘 다 없으면(daily 풀 전부, 이분법이라 숫자
// 진행률이 의미 없음) null — 호출부는 null이면 완료✓/진행중 배지만 보여주면 된다.
export function progressOf(quest, ctx) {
  if (typeof quest.progress === 'function') return quest.progress(ctx)
  if (!quest.metricKey) return null
  return { current: Math.min(ctx[quest.metricKey] ?? 0, quest.target), target: quest.target }
}

// FR-16 개선 — "이번 기능 써보기" 유도 퀘스트 전용 클레임 id(quest_claims의 (user_id,date,quest_id)
// 유니크 제약을 그대로 "오늘/이번 주 이미 했는지" 표시로 재사용한다). CustomComboBuilder.jsx/
// PlaceDuelModal.jsx가 결과를 처음 보여줄 때 이 id로 claimQuest를 한 번 호출한다.
export const COMBO_BUILDER_TRY_ID = 'feature-combo-builder'
export const MAP_DUEL_TRY_ID = 'feature-map-duel'
export const FEATURE_TRY_XP = 5

const QUEST_BY_ID = new Map([...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL].map((q) => [q.id, q]))

export function evaluateQuest(questId, ctx) {
  const quest = QUEST_BY_ID.get(questId)
  return quest ? quest.evaluate(ctx) === true : false
}

// 시드 해시 오름차순으로 정렬한 뒤, 같은 category가 maxPerCategory개를 넘으면 건너뛰며 채운다(리텐션
// 강화 v5 — "같은 행동 미션은 최대 2개만" 요청). 카테고리 제한 때문에 n개를 다 못 채우는 경우(풀
// 다양성이 부족할 때)를 대비해, 건너뛴 항목으로 남는 자리를 채워 항상 정확히 n개(또는 풀 전체 크기)를
// 반환한다 — 로테이션 개수 자체는 이 제한으로 절대 줄어들지 않는다.
function selectRotation(pool, seed, n, maxPerCategory = 2) {
  const ranked = pool.map((quest) => ({ quest, key: hashString(`${seed}:${quest.id}`) })).sort((a, b) => a.key - b.key)

  const selected = []
  const counts = new Map()
  const skipped = []
  for (const { quest } of ranked) {
    if (selected.length >= n) break
    const count = counts.get(quest.category) ?? 0
    if (count >= maxPerCategory) {
      skipped.push(quest)
      continue
    }
    selected.push(quest)
    counts.set(quest.category, count + 1)
  }
  for (const quest of skipped) {
    if (selected.length >= n) break
    selected.push(quest)
  }
  return selected
}

export function selectDailyQuests(dateKey, userId, n = 3) {
  return selectRotation(DAILY_QUEST_POOL, `${userId}:${dateKey}`, n)
}

export function selectWeeklyQuests(weekKey, userId, n = 5) {
  return selectRotation(WEEKLY_QUEST_POOL, `${userId}:${weekKey}`, n)
}

// 일간/주간 로테이션 3개를 전부 수령하면 지급되는 보너스. quest_claims의 (user_id,date,quest_id)
// 유니크 제약을 그대로 재사용하기 위해 고정 id로 claimQuest에 넘긴다 — 새 테이블이 필요 없다.
// WEEKLY_ALL_CLEAR_XP도 개별 퀘스트와 같은 "일간의 5배" 스케일(DAILY_ALL_CLEAR_XP×5)로 맞췄다.
export const DAILY_ALL_CLEAR_ID = 'daily-all-clear'
export const WEEKLY_ALL_CLEAR_ID = 'weekly-all-clear'
export const DAILY_ALL_CLEAR_XP = 10
export const WEEKLY_ALL_CLEAR_XP = 50

// MY 탭 퀘스트 게시판 전체 상태. QuestBoard가 그대로 렌더한다.
export function getQuestBoard(
  ctx,
  { dateKey, weekKey, userId, dailyClaimedIds = [], weeklyClaimedIds = [], dailyCount = 3, weeklyCount = 5 } = {},
) {
  const dailyQuests = selectDailyQuests(dateKey, userId, dailyCount)
  const weeklyQuests = selectWeeklyQuests(weekKey, userId, weeklyCount)
  const daily = dailyQuests.map((quest) => ({
    ...quest,
    completed: evaluateQuest(quest.id, ctx),
    claimed: dailyClaimedIds.includes(quest.id),
  }))
  const weekly = weeklyQuests.map((quest) => ({
    ...quest,
    completed: evaluateQuest(quest.id, ctx),
    claimed: weeklyClaimedIds.includes(quest.id),
    progress: progressOf(quest, ctx),
  }))
  return {
    daily,
    weekly,
    dailyAllClear: daily.length > 0 && daily.every((q) => q.claimed),
    weeklyAllClear: weekly.length > 0 && weekly.every((q) => q.claimed),
  }
}

// 오늘/이번 주 로테이션에 실제로 포함된 퀘스트 중, 아직 수령 안 했는데 이번에 새로 조건을 만족한 것만
// 골라낸다(순수 함수, I/O 없음) — 로테이션 밖의 퀘스트는 화면에 보이지도 않으므로 절대 자동 지급되지
// 않는다. 각 항목에 period('daily'|'weekly')를 붙여, 호출부가 claimQuest에 넘길 dateKey(일간은
// dateKey, 주간은 weekKey)를 고를 수 있게 한다.
export function findNewlyCompletedAutoQuests(
  ctx,
  { dateKey, weekKey, userId, dailyClaimedIds = [], weeklyClaimedIds = [], dailyCount = 3, weeklyCount = 5 } = {},
) {
  const daily = selectDailyQuests(dateKey, userId, dailyCount)
    .filter((quest) => !dailyClaimedIds.includes(quest.id) && evaluateQuest(quest.id, ctx))
    .map((quest) => ({ ...quest, period: 'daily' }))
  const weekly = selectWeeklyQuests(weekKey, userId, weeklyCount)
    .filter((quest) => !weeklyClaimedIds.includes(quest.id) && evaluateQuest(quest.id, ctx))
    .map((quest) => ({ ...quest, period: 'weekly' }))
  return [...daily, ...weekly]
}

// 방금 daily/weeklyClaimedIds가 갱신된 뒤(새로 완료된 퀘스트를 claimQuest로 지급한 다음) 호출한다 —
// 그 갱신된 목록을 기준으로 "지금 막 로테이션 전체를 클리어했고, 아직 보너스는 못 받은" 상태만 골라
// 돌려준다. 호출부가 이 목록을 claimQuest(dateKey 또는 weekKey, bonus.id, bonus.xp)로 지급한다.
export function resolveAllClearBonuses({ dailyQuests, dailyClaimedIds = [], weeklyQuests, weeklyClaimedIds = [] }) {
  const bonuses = []
  if (dailyQuests?.length > 0 && !dailyClaimedIds.includes(DAILY_ALL_CLEAR_ID) && dailyQuests.every((q) => dailyClaimedIds.includes(q.id))) {
    bonuses.push({ id: DAILY_ALL_CLEAR_ID, title: '오늘의 퀘스트 올클리어', xp: DAILY_ALL_CLEAR_XP, period: 'daily' })
  }
  if (weeklyQuests?.length > 0 && !weeklyClaimedIds.includes(WEEKLY_ALL_CLEAR_ID) && weeklyQuests.every((q) => weeklyClaimedIds.includes(q.id))) {
    bonuses.push({ id: WEEKLY_ALL_CLEAR_ID, title: '이번 주 퀘스트 올클리어', xp: WEEKLY_ALL_CLEAR_XP, period: 'weekly' })
  }
  return bonuses
}

// 주간 퀘스트 판정용 요일별 집계(순수 함수) — 호출부(questWeekContext.js의 buildWeekDays)가 이번 주
// 7일치 원자료(끼니/물/영양제/퀴즈 클레임)를 모아 day 배열을 만들면, 여기서 주간 카운터로 환산한다.
// days: [{ dayNumber, mealCount, threeMeals, breakfast, dinner, sodiumOk, proteinOk, carbsOk, fatOk,
//   fiberOk, calorieOk, waterMet, supplementTaken, quizSuccess, foodNames, usedComboBuilder,
//   usedMapDuel }]
export function buildWeeklyStats(days) {
  const loggedDayNumbers = days.filter((d) => (d.mealCount ?? 0) > 0).map((d) => d.dayNumber)
  return {
    weekLoggedDays: loggedDayNumbers.length,
    weekThreeMealDays: days.filter((d) => d.threeMeals).length,
    weekBreakfastDays: days.filter((d) => d.breakfast).length,
    weekDinnerDays: days.filter((d) => d.dinner).length,
    weekWaterMetDays: days.filter((d) => d.waterMet).length,
    weekSupplementDays: days.filter((d) => d.supplementTaken).length,
    weekSodiumOkDays: days.filter((d) => d.sodiumOk).length,
    weekProteinOkDays: days.filter((d) => d.proteinOk).length,
    weekCarbsOkDays: days.filter((d) => d.carbsOk).length,
    weekFatOkDays: days.filter((d) => d.fatOk).length,
    weekFiberOkDays: days.filter((d) => d.fiberOk).length,
    weekCalorieOkDays: days.filter((d) => d.calorieOk).length,
    weekUniqueFoodCount: new Set(days.flatMap((d) => d.foodNames ?? [])).size,
    weekComboBuilderDays: days.filter((d) => d.usedComboBuilder).length,
    weekMapDuelDays: days.filter((d) => d.usedMapDuel).length,
    weekQuizDays: days.filter((d) => d.quizSuccess).length,
    weekLongestStreak: longestConsecutiveRun(loggedDayNumbers),
  }
}

function longestConsecutiveRun(dayNumbers) {
  if (dayNumbers.length === 0) return 0
  const sorted = [...new Set(dayNumbers)].sort((a, b) => a - b)
  let longest = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    current = sorted[i] === sorted[i - 1] + 1 ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}

// 오늘 저장된 끼니 기록(mealStore.js record 배열)에서 item 단위 ctx 플래그를 뽑는다 — 순수 함수,
// QuestBoard.jsx/Analyze.jsx가 동일하게 재사용한다.
const DB_MATCHED_SOURCES = new Set([NUTRITION_SOURCE.DB, NUTRITION_SOURCE.DB_PROCESS, NUTRITION_SOURCE.OFFICIAL])

export function buildItemFlags(mealRecords) {
  const items = (mealRecords ?? []).flatMap((record) => record.items ?? [])
  return {
    hasSetMeal: (mealRecords ?? []).some((record) => isSetMeal(record)),
    hasDbMatchedItem: items.some((item) => DB_MATCHED_SOURCES.has(item.source)),
    hasServingsAdjustedItem: items.some((item) => typeof item.servings === 'number' && item.servings !== 1),
    hasLabelScanItem: items.some((item) => item.source === NUTRITION_SOURCE.LABEL),
  }
}
