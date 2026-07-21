import { prisma } from '../db.js'

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

// 오늘 아직 완료한 게 없어도 어제까지 이어졌으면 연속기록이 살아있는 걸로 본다.
export async function computeCurrentStreak(userId: string) {
  const completedSchedules = await prisma.schedule.findMany({
    where: { userId, completed: true, completedAt: { not: null } },
    select: { completedAt: true },
  })
  const completedDates = new Set(completedSchedules.map((entry) => toDateKey(entry.completedAt!)))

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const cursor = new Date(today)

  if (!completedDates.has(toDateKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  let currentStreak = 0
  while (completedDates.has(toDateKey(cursor))) {
    currentStreak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return currentStreak
}
