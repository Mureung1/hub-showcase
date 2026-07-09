import { Router } from 'express'
import { prisma } from '../prisma.js'

export const profileRouter = Router()

profileRouter.get('/', async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { sessionId: req.sessionId } })
  res.json(profile)
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

  res.json(profile)
})
