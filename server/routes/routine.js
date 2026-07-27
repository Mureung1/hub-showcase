import { Router } from 'express'
import { prisma } from '../db.js'
import { SPLIT_DAY_TYPES } from '../splitPresets.js'
import {
  WEEK_ORDER as SKIP_WEEK_ORDER,
  violatesAdjacentAreaRule,
} from '../scheduleConstraints.js'

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

  // 재배치 성공한 스킵(원본 요일)은 세션이 다른 요일로 옮겨간 것이므로 이번 주 목표 총 세션 수에서 제외한다.
  // 재배치 실패해서 기록만 된 스킵(skippedToId가 null)은 계속 포함한다.
  const trainingDays = routine.days.filter(
    (d) =>
      d.targetArea !== null &&
      !(d.status === 'SKIPPED' && d.skippedToId !== null),
  )
  const completed = trainingDays.filter((d) => d.status === 'COMPLETED').length

  const skippedTo =
    routineDay.status === 'SKIPPED' && routineDay.skippedToId
      ? {
          dayOfWeek:
            routine.days.find((d) => d.id === routineDay.skippedToId)
              ?.dayOfWeek ?? null,
        }
      : null

  // 운동별로 가장 최근에 기록한 무게를 하나씩만 가져온다(입력 화면의 무게 기본값용).
  // orderBy+distinct 조합: loggedAt 내림차순으로 정렬한 뒤 exerciseId마다 첫 행(=최신 기록)만 남긴다.
  const exerciseIds = routineDay.exercises.map((e) => e.exerciseId)
  const lastLogs = await prisma.exerciseLog.findMany({
    where: { userId: user.id, exerciseId: { in: exerciseIds } },
    orderBy: { loggedAt: 'desc' },
    distinct: ['exerciseId'],
  })
  const lastWeightByExerciseId = Object.fromEntries(
    lastLogs.map((log) => [log.exerciseId, log.weight]),
  )

  res.json({
    hasRoutine: true,
    routineDayId: routineDay.id,
    dayOfWeek: routineDay.dayOfWeek,
    targetArea: routineDay.targetArea,
    status: routineDay.status,
    skippedTo,
    exercises: routineDay.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      lastWeight: lastWeightByExerciseId[e.exerciseId] ?? null,
    })),
    routine: { splitType: routine.splitType, daysPerWeek: routine.daysPerWeek },
    availableDayTypes: Object.keys(SPLIT_DAY_TYPES[routine.splitType]),
    weekProgress: { completed, total: trainingDays.length },
    days: WEEK_ORDER.map((dow) => {
      const d = routine.days.find((day) => day.dayOfWeek === dow)
      return {
        id: d.id,
        dayOfWeek: d.dayOfWeek,
        targetArea: d.targetArea,
        status: d.status,
      }
    }),
  })
})

routineRouter.post('/sessions/:id/complete', async (req, res) => {
  const routineDayId = Number(req.params.id)
  const { logs } = req.body

  const routineDay = await prisma.routineDay.findUnique({
    where: { id: routineDayId },
  })
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

routineRouter.post('/sessions/:id/skip', async (req, res) => {
  const routineDayId = Number(req.params.id)

  const routineDay = await prisma.routineDay.findUnique({
    where: { id: routineDayId },
  })
  if (!routineDay) {
    return res.status(404).json({ error: '해당 세션을 찾을 수 없습니다.' })
  }
  if (routineDay.status === 'COMPLETED') {
    return res
      .status(400)
      .json({ error: '이미 완료된 세션은 스킵할 수 없습니다.' })
  }

  // 이미 스킵 처리된 요청이면(멱등) 재배치 로직을 다시 돌리지 않고 저장된 결과만 그대로 돌려준다.
  if (routineDay.status === 'SKIPPED') {
    const toDay = routineDay.skippedToId
      ? await prisma.routineDay.findUnique({
          where: { id: routineDay.skippedToId },
        })
      : null
    return res.json({
      success: true,
      reassigned: !!toDay,
      fromDayOfWeek: routineDay.dayOfWeek,
      toDayOfWeek: toDay?.dayOfWeek ?? undefined,
    })
  }

  const allDays = await prisma.routineDay.findMany({
    where: { routineId: routineDay.routineId },
    include: { exercises: { include: { exercise: true } } },
  })

  // 순수 함수(violatesAdjacentAreaRule)에 넘길 형태로 변환: 각 요일이 실제로 쓰는 부위 목록만 추린다.
  const daysWithAreas = allDays.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    targetAreas: [...new Set(d.exercises.map((e) => e.exercise.targetArea))],
  }))
  const areasToPlace =
    daysWithAreas.find((d) => d.dayOfWeek === routineDay.dayOfWeek)
      ?.targetAreas ?? []

  // 오늘(스킵된 요일) 이후 남은 요일 중 빈 휴식일만, 이른 순서대로 후보로 삼는다.
  const fromIndex = SKIP_WEEK_ORDER.indexOf(routineDay.dayOfWeek)
  const candidateDayOfWeeks = SKIP_WEEK_ORDER.slice(fromIndex + 1).filter(
    (dow) => {
      const day = allDays.find((d) => d.dayOfWeek === dow)
      return day && day.targetArea === null
    },
  )

  const targetDayOfWeek = candidateDayOfWeeks.find(
    (dow) =>
      !violatesAdjacentAreaRule({
        days: daysWithAreas,
        candidateDayOfWeek: dow,
        areasToPlace,
      }),
  )
  const targetDay = targetDayOfWeek
    ? allDays.find((d) => d.dayOfWeek === targetDayOfWeek)
    : null

  if (!targetDay) {
    await prisma.routineDay.update({
      where: { id: routineDayId },
      data: { status: 'SKIPPED' },
    })
    return res.json({
      success: true,
      reassigned: false,
      fromDayOfWeek: routineDay.dayOfWeek,
    })
  }

  const originalExercises = allDays.find((d) => d.id === routineDayId).exercises

  await prisma.$transaction([
    prisma.routineDayExercise.createMany({
      data: originalExercises.map((e) => ({
        routineDayId: targetDay.id,
        exerciseId: e.exerciseId,
        order: e.order,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      })),
    }),
    prisma.routineDay.update({
      where: { id: targetDay.id },
      data: { targetArea: routineDay.targetArea },
    }),
    prisma.routineDay.update({
      where: { id: routineDayId },
      data: { status: 'SKIPPED', skippedToId: targetDay.id },
    }),
  ])

  res.json({
    success: true,
    reassigned: true,
    fromDayOfWeek: routineDay.dayOfWeek,
    toDayOfWeek: targetDay.dayOfWeek,
  })
})
