import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.mts'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// E2E 전용 시드. seed.js(MON/WED/FRI만 운동일)를 그대로 쓰면 CI가 어느 요일에
// 돌든 결과가 같아야 한다는 조건을 못 지켜서, 7일 전부 같은 타겟부위·운동으로 심는다.
const exercises = [
  {
    name: '벤치프레스',
    targetArea: '가슴',
    involvedJoints: ['어깨', '팔꿈치'],
  },
  {
    name: '오버헤드프레스',
    targetArea: '어깨',
    involvedJoints: ['어깨', '팔꿈치'],
  },
]

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

async function main() {
  await prisma.exercise.createMany({ data: exercises })

  const exerciseIds = await prisma.exercise.findMany({ orderBy: { id: 'asc' } })

  const user = await prisma.user.create({ data: {} })
  const routine = await prisma.routine.create({
    data: { userId: user.id, splitType: '상하체', daysPerWeek: 7 },
  })

  for (const dayOfWeek of WEEKDAYS) {
    const routineDay = await prisma.routineDay.create({
      data: { routineId: routine.id, dayOfWeek, targetArea: '상체' },
    })
    for (const [index, exercise] of exerciseIds.entries()) {
      await prisma.routineDayExercise.create({
        data: {
          routineDayId: routineDay.id,
          exerciseId: exercise.id,
          order: index + 1,
          targetSets: 3,
          targetReps: 10,
        },
      })
    }
  }

  console.log('E2E 시드 완료: 7일 전부 상체 세션 고정')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
