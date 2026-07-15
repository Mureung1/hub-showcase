import { Router } from 'express'
import { prisma } from '../db.js'
import { SPLIT_TYPE_BY_DAYS_PER_WEEK, SPLIT_DAY_TYPES } from '../splitPresets.js'

export const onboardingRouter = Router()

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// 분할별 고정 요일 배치. PPL은 요일 수가 다양해서(5~7일) 규칙(Push→Pull→Legs 반복)으로 계산한다.
const FIXED_ARRANGEMENTS = {
  전신: {
    2: { MON: '전신', THU: '전신' },
    3: { MON: '전신', WED: '전신', FRI: '전신' },
  },
  상하체: {
    4: { MON: '상체', TUE: '하체', THU: '상체', FRI: '하체' },
  },
}

function getDayArrangement(splitType, daysPerWeek) {
  if (splitType === 'PPL') {
    const cycle = ['Push', 'Pull', 'Legs']
    const arrangement = {}
    for (let i = 0; i < daysPerWeek; i++) {
      arrangement[WEEKDAYS[i]] = cycle[i % 3]
    }
    return arrangement
  }
  return FIXED_ARRANGEMENTS[splitType][daysPerWeek]
}

onboardingRouter.post('/onboarding', async (req, res) => {
  const daysPerWeek = Number(req.body.daysPerWeek)
  const splitType = SPLIT_TYPE_BY_DAYS_PER_WEEK(daysPerWeek)
  const dayArrangement = getDayArrangement(splitType, daysPerWeek)

  if (!dayArrangement) {
    return res.status(400).json({ error: `daysPerWeek=${daysPerWeek}에 대한 배치 규칙이 없습니다.` })
  }

  const user = await prisma.user.findFirst()
  const existingRoutine = user ? await prisma.routine.findUnique({ where: { userId: user.id } }) : null

  if (existingRoutine) {
    await prisma.exerciseLog.deleteMany({ where: { routineDay: { routineId: existingRoutine.id } } })
    await prisma.painReport.deleteMany({ where: { routineDay: { routineId: existingRoutine.id } } })
    await prisma.routineDayExercise.deleteMany({ where: { routineDay: { routineId: existingRoutine.id } } })
    await prisma.routineDay.deleteMany({ where: { routineId: existingRoutine.id } })
  }

  const activeUser = user ?? (await prisma.user.create({ data: {} }))

  const routine = await prisma.routine.upsert({
    where: { userId: activeUser.id },
    update: { splitType, daysPerWeek },
    create: { userId: activeUser.id, splitType, daysPerWeek },
  })

  for (const dayOfWeek of WEEKDAYS) {
    const dayType = dayArrangement[dayOfWeek] ?? null
    const routineDay = await prisma.routineDay.create({
      data: { routineId: routine.id, dayOfWeek, targetArea: dayType },
    })

    if (!dayType) continue

    const categories = SPLIT_DAY_TYPES[splitType][dayType]
    let order = 1
    for (const category of categories) {
      const exercise = await prisma.exercise.findFirst({ where: { targetArea: category }, orderBy: { id: 'asc' } })
      if (!exercise) continue
      await prisma.routineDayExercise.create({
        data: { routineDayId: routineDay.id, exerciseId: exercise.id, order: order++, targetSets: 3, targetReps: 10 },
      })
    }
  }

  res.json({ success: true, splitType, daysPerWeek })
})
