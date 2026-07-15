import { Router } from 'express'
import { prisma } from '../db.js'
import { SPLIT_DAY_TYPES } from '../splitPresets.js'

const DAY_OF_WEEK_BY_JS_DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const WEEK_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export const routineRouter = Router()

routineRouter.get('/routine/today', async (req, res) => {
  const user = await prisma.user.findFirst()
  if (!user) {
    return res.json({ hasRoutine: false })
  }

  const routine = await prisma.routine.findUnique({
    where: { userId: user.id },
    include: {
      days: {
        include: {
          exercises: {
            orderBy: { order: 'asc' },
            include: { exercise: true },
          },
        },
      },
    },
  })

  if (!routine) {
    return res.json({ hasRoutine: false })
  }

  const today = DAY_OF_WEEK_BY_JS_DAY[new Date().getDay()]
  const routineDay = routine.days.find((d) => d.dayOfWeek === today)

  if (!routineDay) {
    return res.json({ hasRoutine: false })
  }

  const trainingDays = routine.days.filter((d) => d.targetArea !== null)
  const completed = trainingDays.filter((d) => d.status === 'COMPLETED').length

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
    routine: { splitType: routine.splitType, daysPerWeek: routine.daysPerWeek },
    availableDayTypes: Object.keys(SPLIT_DAY_TYPES[routine.splitType]),
    weekProgress: { completed, total: trainingDays.length },
    days: WEEK_ORDER.map((dow) => {
      const d = routine.days.find((day) => day.dayOfWeek === dow)
      return { id: d.id, dayOfWeek: d.dayOfWeek, targetArea: d.targetArea, status: d.status }
    }),
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
