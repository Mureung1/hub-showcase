import { Router } from 'express'
import { prisma } from '../db.js'
import {
  SPLIT_TYPE_BY_DAYS_PER_WEEK,
  SPLIT_DAY_TYPES,
} from '../splitPresets.js'
import {
  violatesAdjacentAreaRule,
  findArrangementViolation,
} from '../scheduleConstraints.js'

export const onboardingRouter = Router()

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// 분할별 고정 요일 배치. PPL은 요일 수가 다양해서(5~7일) 규칙(Push→Pull→Legs 반복)으로 계산한다.
const FIXED_ARRANGEMENTS = {
  전신: {
    1: { MON: '전신' },
    2: { MON: '전신', THU: '전신' },
    3: { MON: '전신', WED: '전신', FRI: '전신' },
  },
  상하체: {
    4: { MON: '상체', TUE: '하체', THU: '상체', FRI: '하체' },
  },
}

export function getDayArrangement(splitType, daysPerWeek) {
  if (splitType === 'PPL') {
    // 7일은 3개 주기(Push/Pull/Legs)로 꽉 채우면 7%3=1이라 월요일과 일요일이
    // 항상 같은 카테고리로 겹친다(순환 인접 위반). 목요일을 강제 휴식으로 비워
    // 앞 3일(월화수)과 뒤 3일(금토일)을 완전히 분리된 두 번의 3일 주기로 만든다.
    if (daysPerWeek === 7) {
      return {
        MON: 'Push',
        TUE: 'Pull',
        WED: 'Legs',
        FRI: 'Push',
        SAT: 'Pull',
        SUN: 'Legs',
      }
    }
    const cycle = ['Push', 'Pull', 'Legs']
    const arrangement = {}
    for (let i = 0; i < daysPerWeek; i++) {
      arrangement[WEEKDAYS[i]] = cycle[i % 3]
    }
    return arrangement
  }
  return FIXED_ARRANGEMENTS[splitType][daysPerWeek]
}

// splitType의 dayType(예: "Push")에 맞는 운동을 카테고리당 1개씩 routineDayId에 배정한다.
// 기존 배정은 호출 전에 지워둔 상태여야 한다(온보딩·수정 둘 다 이 전제를 지킨다).
export async function assignExercisesForDay(routineDayId, splitType, dayType) {
  if (!dayType) return
  const categories = SPLIT_DAY_TYPES[splitType][dayType]
  let order = 1
  for (const category of categories) {
    const exercise = await prisma.exercise.findFirst({
      where: { targetArea: category },
      orderBy: { id: 'asc' },
    })
    if (!exercise) continue
    await prisma.routineDayExercise.create({
      data: {
        routineDayId,
        exerciseId: exercise.id,
        order: order++,
        targetSets: 3,
        targetReps: 10,
      },
    })
  }
}

onboardingRouter.post('/onboarding', async (req, res) => {
  const daysPerWeek = Number(req.body.daysPerWeek)
  const splitType = SPLIT_TYPE_BY_DAYS_PER_WEEK(daysPerWeek)
  const dayArrangement = getDayArrangement(splitType, daysPerWeek)

  if (!dayArrangement) {
    return res.status(400).json({
      error: `daysPerWeek=${daysPerWeek}에 대한 배치 규칙이 없습니다.`,
    })
  }

  const violatingDay = findArrangementViolation({ dayArrangement, splitType })
  if (violatingDay) {
    return res
      .status(400)
      .json({ error: `${violatingDay} 요일이 인접 요일과 부위가 겹칩니다.` })
  }

  const user = await prisma.user.findFirst()
  const existingRoutine = user
    ? await prisma.routine.findUnique({ where: { userId: user.id } })
    : null

  if (existingRoutine) {
    await prisma.exerciseLog.deleteMany({
      where: { routineDay: { routineId: existingRoutine.id } },
    })
    await prisma.painReport.deleteMany({
      where: { routineDay: { routineId: existingRoutine.id } },
    })
    await prisma.routineDayExercise.deleteMany({
      where: { routineDay: { routineId: existingRoutine.id } },
    })
    await prisma.routineDay.deleteMany({
      where: { routineId: existingRoutine.id },
    })
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
    await assignExercisesForDay(routineDay.id, splitType, dayType)
  }

  res.json({ success: true, splitType, daysPerWeek })
})

export const routineDayRouter = Router()

routineDayRouter.patch('/routine/days/:id', async (req, res) => {
  const routineDayId = Number(req.params.id)
  const targetArea = req.body.targetArea ?? null

  const routineDay = await prisma.routineDay.findUnique({
    where: { id: routineDayId },
    include: { routine: true },
  })
  if (!routineDay) {
    return res.status(404).json({ error: '해당 요일을 찾을 수 없습니다.' })
  }

  // 휴식으로 바꾸는 경우는 겹칠 부위 자체가 없어 검증이 필요 없다.
  if (targetArea !== null) {
    const allDays = await prisma.routineDay.findMany({
      where: { routineId: routineDay.routineId },
      include: { exercises: { include: { exercise: true } } },
    })
    const daysWithAreas = allDays.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      targetAreas: [...new Set(d.exercises.map((e) => e.exercise.targetArea))],
    }))
    const areasToPlace =
      SPLIT_DAY_TYPES[routineDay.routine.splitType][targetArea] ?? []

    if (
      violatesAdjacentAreaRule({
        days: daysWithAreas,
        candidateDayOfWeek: routineDay.dayOfWeek,
        areasToPlace,
      })
    ) {
      return res.status(400).json({
        error: '인접한 요일과 부위가 겹쳐서 이 조합으로는 바꿀 수 없습니다.',
      })
    }
  }

  await prisma.routineDayExercise.deleteMany({ where: { routineDayId } })
  await prisma.routineDay.update({
    where: { id: routineDayId },
    data: { targetArea },
  })
  await assignExercisesForDay(
    routineDayId,
    routineDay.routine.splitType,
    targetArea,
  )

  res.json({ success: true })
})
