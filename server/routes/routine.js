import { Router } from 'express'
import { prisma } from '../db.js'

const DAY_OF_WEEK_BY_JS_DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const routineRouter = Router()

routineRouter.get('/routine/today', async (req, res) => {
  const user = await prisma.user.findFirst()
  if (!user) {
    return res.json({ hasRoutine: false })
  }

  const today = DAY_OF_WEEK_BY_JS_DAY[new Date().getDay()]
  const routineDay = await prisma.routineDay.findFirst({
    where: { dayOfWeek: today, routine: { userId: user.id } },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { exercise: true },
      },
    },
  })

  if (!routineDay) {
    return res.json({ hasRoutine: false })
  }

  res.json({
    hasRoutine: true,
    routineDayId: routineDay.id,
    dayOfWeek: routineDay.dayOfWeek,
    targetArea: routineDay.targetArea,
    status: routineDay.status,
    exercises: routineDay.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
    })),
  })
})

routineRouter.post('/sessions/:id/complete', async (req, res) => {
  const routineDayId = Number(req.params.id)
  const { logs } = req.body

  const routineDay = await prisma.routineDay.findUnique({ where: { id: routineDayId } })
  if (!routineDay) {
    return res.status(404).json({ error: '해당 세션을 찾을 수 없습니다.' })
  }

  const user = await prisma.user.findFirst()
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
  }

  if (Array.isArray(logs) && logs.length > 0) {
    await prisma.exerciseLog.createMany({
      data: logs.map((log) => ({
        userId: user.id,
        routineDayId,
        exerciseId: log.exerciseId,
        setNumber: log.setNumber,
        weight: log.weight,
        reps: log.reps,
        completed: log.completed,
      })),
    })
  }

  await prisma.routineDay.update({
    where: { id: routineDayId },
    data: { status: 'COMPLETED' },
  })

  res.json({ success: true })
})
