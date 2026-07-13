import { PrismaClient } from '@prisma/client'
import { DEMO_CATEGORIES, DEMO_USER_ID } from '../src/constants.js'

const prisma = new PrismaClient()

const DEMO_SCHEDULES = [
  { date: '2026-07-07', title: '저녁 운동', time: '19:00', categoryId: 'exercise' },
  { date: '2026-07-10', title: '포트폴리오 정리', time: '14:00', categoryId: 'study' },
  { date: '2026-07-17', title: '성수 팝업', time: '18:30', categoryId: 'appointment' },
  { date: '2026-07-26', title: '7월 돌아보기', time: '21:00', categoryId: 'personal' },
  { date: '2026-07-08', title: '헬스', time: '20:00', categoryId: 'exercise' },
  { date: '2026-07-14', title: '영어 공부', time: '20:30', categoryId: 'study' },
  { date: '2026-07-22', title: '러닝', time: '07:30', categoryId: 'exercise' },
  { date: '2026-07-23', title: '주간 스터디', time: '19:30', categoryId: 'study' },
]

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: 'demo@weshoulddo.dev',
      passwordHash: 'demo-no-auth-yet',
      name: '데모 사용자',
    },
  })

  for (const category of DEMO_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: { ...category, userId: user.id },
    })
  }

  const existingCount = await prisma.schedule.count({ where: { userId: user.id } })
  if (existingCount === 0) {
    for (const schedule of DEMO_SCHEDULES) {
      await prisma.schedule.create({
        data: {
          userId: user.id,
          categoryId: schedule.categoryId,
          title: schedule.title,
          time: schedule.time,
          date: new Date(`${schedule.date}T00:00:00.000Z`),
        },
      })
    }
  }

  console.log('시드 완료')
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
