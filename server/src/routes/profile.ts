import { Router } from 'express'
import { prisma } from '../prisma.js'

export const profileRouter = Router()

// Prisma DateTime → "YYYY-MM-DD" 변환 (프론트 Profile 타입과 일치)
function toShape(profile: { closureDate: Date | null; [key: string]: unknown }) {
  return {
    ...profile,
    closureDate: profile.closureDate
      ? new Date(profile.closureDate).toISOString().slice(0, 10)
      : null,
  }
}

profileRouter.get('/', async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { sessionId: req.sessionId } })
  res.json(profile ? toShape(profile) : null)
})

profileRouter.post('/', async (req, res) => {
  const { industry, isCorporation, hasEmployee, isRented, closureDate } = req.body ?? {}

  if (
    typeof industry !== 'string' ||
    typeof isCorporation !== 'boolean' ||
    typeof hasEmployee !== 'boolean' ||
    typeof isRented !== 'boolean' ||
    typeof closureDate !== 'string'
  ) {
    res.status(400).json({ error: '프로필 필드가 올바르지 않습니다.' })
    return
  }

  const profile = await prisma.profile.upsert({
    where: { sessionId: req.sessionId },
    create: {
      sessionId: req.sessionId,
      industry,
      isCorporation,
      hasEmployee,
      isRented,
      closureDate: new Date(closureDate),
    },
    update: {
      industry,
      isCorporation,
      hasEmployee,
      isRented,
      closureDate: new Date(closureDate),
    },
  })

  res.json(toShape(profile))
})
