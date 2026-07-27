import { prisma } from '../db.js'
import { computeCurrentStreak } from './stats.js'

export type DodoMood = 1 | 2 | 3 | 4

export type DodoBehavior =
  | 'NO_SCHEDULE'
  | 'WAITING'
  | 'DEADLINE_SOON'
  | 'VIDEO_VERIFIED'
  | 'REACTION_RECEIVED'
  | 'ALL_DONE'
  | 'INCOMPLETE_DAY'

function toDateOnly(date: Date) {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`)
}

function endOfDay(dateOnly: Date) {
  const end = new Date(dateOnly)
  end.setUTCDate(end.getUTCDate() + 1)
  return end
}

// mood는 스트릭이 하루 끊겼다고 바로 곤두박질치지 않도록 최근 7일 누적 활동까지 함께 반영한다
// (기획서 "혼내지 않는다" 원칙). 임계값은 실제 사용자 데이터를 보며 조정 가능한 상수다.
const MOOD_THRESHOLDS: { min: number; mood: DodoMood }[] = [
  { min: 9, mood: 4 },
  { min: 4, mood: 3 },
  { min: 1, mood: 2 },
  { min: 0, mood: 1 },
]

export async function computeMood(userId: string): Promise<DodoMood> {
  const sevenDaysAgo = toDateOnly(new Date())
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)

  const [currentStreak, last7DaysCompleted] = await Promise.all([
    computeCurrentStreak(userId),
    prisma.schedule.count({ where: { userId, completed: true, completedAt: { gte: sevenDaysAgo } } }),
  ])

  const score = currentStreak * 2 + last7DaysCompleted
  return MOOD_THRESHOLDS.find((entry) => score >= entry.min)!.mood
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export async function computeTodayBehavior(userId: string): Promise<DodoBehavior> {
  const dateOnly = toDateOnly(new Date())
  const dayEnd = endOfDay(dateOnly)
  const now = new Date()
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  const [todaySchedules, videoCountToday, reactionCountToday, commentCountToday] = await Promise.all([
    prisma.schedule.findMany({ where: { userId, date: dateOnly }, select: { time: true, completed: true } }),
    prisma.videoPost.count({ where: { userId, deletedAt: null, createdAt: { gte: dateOnly, lt: dayEnd } } }),
    prisma.reaction.count({ where: { videoPost: { userId, deletedAt: null }, fromUserId: { not: userId }, createdAt: { gte: dateOnly, lt: dayEnd } } }),
    prisma.comment.count({ where: { videoPost: { userId, deletedAt: null }, authorId: { not: userId }, createdAt: { gte: dateOnly, lt: dayEnd } } }),
  ])

  const hasScheduleToday = todaySchedules.length > 0
  const hasVideoToday = videoCountToday > 0
  const hasReactionToday = reactionCountToday + commentCountToday > 0
  const incomplete = todaySchedules.filter((schedule) => !schedule.completed)
  const allDone = hasScheduleToday && incomplete.length === 0

  const deadlineSoon = incomplete.some((schedule) => {
    if (!schedule.time) return false
    const minutes = timeToMinutes(schedule.time)
    if (minutes === null) return false
    const diff = minutes - nowMinutes
    return diff >= 0 && diff <= 30
  })

  const allTimedPassed = incomplete.length > 0 && incomplete.every((schedule) => {
    if (!schedule.time) return false
    const minutes = timeToMinutes(schedule.time)
    return minutes !== null && minutes - nowMinutes < 0
  })

  if (allDone) return 'ALL_DONE'
  if (hasReactionToday) return 'REACTION_RECEIVED'
  if (hasVideoToday) return 'VIDEO_VERIFIED'
  if (deadlineSoon) return 'DEADLINE_SOON'
  if (!hasScheduleToday) return 'NO_SCHEDULE'
  if (allTimedPassed) return 'INCOMPLETE_DAY'
  return 'WAITING'
}

const MOOD_CLAUSES: Record<DodoMood, string> = {
  1: '나는 옆에 조용히 앉아 내일을 기다렸다',
  2: '나는 소파에서 응원했다',
  3: '나는 옆에서 같이 뿌듯해했다',
  4: '나는 신이 나서 방 안을 콩콩 뛰어다녔다',
}

function generateDiaryText(options: { completedCategoryNames: string[]; hasReaction: boolean; allDone: boolean; mood: DodoMood }) {
  const { completedCategoryNames, hasReaction, allDone, mood } = options

  if (completedCategoryNames.length === 0) {
    return '오늘은 완료한 일이 없다. 괜찮다. 우리는 내일 다시 해보면 된다.'
  }

  const activityClause = completedCategoryNames.length === 1
    ? `오늘 주인은 ${completedCategoryNames[0]}을(를) 했다`
    : `오늘 주인은 ${completedCategoryNames.slice(0, -1).join(', ')}과(와) ${completedCategoryNames[completedCategoryNames.length - 1]}까지 해냈다`

  const dodoClause = allDone
    ? '나도 괜히 뿌듯해서 춤을 췄다'
    : hasReaction
      ? '친구 반응에 눈이 반짝였다'
      : MOOD_CLAUSES[mood]

  return `${activityClause}. ${dodoClause}.`
}

// 그날 인증 영상이 없으면 일기를 만들지 않는다(§6.4: 영상 인증 완료가 전제 조건).
// 오늘 날짜는 인증·반응·포인트가 들어올 때마다, 그리고 영상이 삭제됐을 때도 다시 불러 최신 상태로 갱신한다.
export async function upsertDailyDiary(userId: string, forDate: Date = new Date()) {
  const dateOnly = toDateOnly(forDate)
  const dayEnd = endOfDay(dateOnly)

  const representativeVideo = await prisma.videoPost.findFirst({
    where: { userId, deletedAt: null, createdAt: { gte: dateOnly, lt: dayEnd } },
    orderBy: { createdAt: 'desc' },
  })
  if (!representativeVideo) {
    // 그날 대표로 삼을 영상이 하나도 안 남았으면(예: 유일한 영상을 삭제) 일기도 더 이상 근거가 없으니 지운다.
    // 없는 걸 지우려는 게 아니라 있으면 지우는 것이라 deleteMany로 안전하게 처리한다.
    await prisma.dodoDiaryEntry.deleteMany({ where: { userId, date: dateOnly } })
    return null
  }

  const [todaySchedules, pointsAgg, reactionCountToday, commentCountToday, mood] = await Promise.all([
    prisma.schedule.findMany({ where: { userId, date: dateOnly }, include: { category: { select: { name: true } } } }),
    prisma.pointsLedgerEntry.aggregate({ where: { userId, createdAt: { gte: dateOnly, lt: dayEnd } }, _sum: { amount: true } }),
    prisma.reaction.count({ where: { videoPost: { userId, deletedAt: null }, createdAt: { gte: dateOnly, lt: dayEnd } } }),
    prisma.comment.count({ where: { videoPost: { userId, deletedAt: null }, createdAt: { gte: dateOnly, lt: dayEnd } } }),
    computeMood(userId),
  ])

  const completedToday = todaySchedules.filter((schedule) => schedule.completed)
  const allDone = todaySchedules.length > 0 && completedToday.length === todaySchedules.length
  const pointsEarned = pointsAgg._sum.amount ?? 0
  const hasReaction = reactionCountToday + commentCountToday > 0

  const text = generateDiaryText({
    completedCategoryNames: completedToday.map((schedule) => schedule.category.name),
    hasReaction,
    allDone,
    mood,
  })

  return prisma.dodoDiaryEntry.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: { userId, date: dateOnly, representativeVideoPostId: representativeVideo.id, text, mood, pointsEarned },
    update: { representativeVideoPostId: representativeVideo.id, text, mood, pointsEarned },
    include: { representativeVideoPost: true },
  })
}
