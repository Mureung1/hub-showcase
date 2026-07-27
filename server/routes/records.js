import { Router } from 'express'
import { prisma } from '../db.js'

export const recordsRouter = Router()

// routineDay 하나의 exerciseLogs를 화면에서 쓰기 좋은 모양으로 정리한다.
// exerciseId별로 그룹(첫 등장 순서 유지)하고, 그룹 안은 setNumber 오름차순으로 정렬한다.
// 이름은 항상 exerciseLog.exercise에서 가져온다(RoutineDayExercise가 아니라) — 통증 대체로
// 계획이 나중에 바뀌어도, 로깅 당시 실제로 한 운동 이름이 그대로 남는다.
export function groupLogsByExercise(exerciseLogs) {
  const order = []
  const byExercise = new Map()
  for (const log of exerciseLogs) {
    if (!byExercise.has(log.exerciseId)) {
      byExercise.set(log.exerciseId, {
        exerciseId: log.exerciseId,
        name: log.exercise.name,
        sets: [],
      })
      order.push(log.exerciseId)
    }
    byExercise.get(log.exerciseId).sets.push({
      setNumber: log.setNumber,
      weight: log.weight,
      reps: log.reps,
    })
  }
  return order.map((id) => {
    const group = byExercise.get(id)
    group.sets.sort((a, b) => a.setNumber - b.setNumber)
    return group
  })
}

// 완료된 routineDay들을 세션 목록으로 정리한다.
// 세션 대표 시각은 그 세션 첫 로그의 loggedAt — 로그가 하나도 없는(0세트 완료) 세션은
// null이 되고, 정렬에서 맨 뒤로 보낸다(날짜를 알 방법이 없기 때문).
export function buildSessionList(routineDays) {
  const sessions = routineDays.map((day) => {
    const loggedAt = day.exerciseLogs[0]?.loggedAt ?? null
    return {
      routineDayId: day.id,
      dayOfWeek: day.dayOfWeek,
      targetArea: day.targetArea,
      loggedAt,
      exercises: groupLogsByExercise(day.exerciseLogs),
    }
  })
  return sessions.sort((a, b) => {
    if (a.loggedAt === null && b.loggedAt === null) return 0
    if (a.loggedAt === null) return 1
    if (b.loggedAt === null) return -1
    return new Date(b.loggedAt) - new Date(a.loggedAt)
  })
}

recordsRouter.get('/exercise-logs', async (req, res) => {
  const user = await prisma.user.findFirst()
  if (!user) {
    return res.json({ hasRoutine: false })
  }

  const routine = await prisma.routine.findUnique({ where: { userId: user.id } })
  if (!routine) {
    return res.json({ hasRoutine: false })
  }

  const routineDays = await prisma.routineDay.findMany({
    where: { routineId: routine.id, status: 'COMPLETED' },
    include: {
      exerciseLogs: {
        include: { exercise: true },
        orderBy: { id: 'asc' },
      },
    },
  })

  res.json({ hasRoutine: true, sessions: buildSessionList(routineDays) })
})
