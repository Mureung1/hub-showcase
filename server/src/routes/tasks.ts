import { Router } from 'express'
import { prisma } from '../prisma.js'
import { getFilteredTaskIds } from '../data/tasks.js'

export const tasksRouter = Router()

tasksRouter.get('/', async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { sessionId: req.sessionId } })
  if (!profile) {
    res.status(404).json({ error: '프로필이 없습니다.' })
    return
  }
  const taskIds = getFilteredTaskIds({
    industry: profile.industry,
    isCorporation: profile.isCorporation,
    hasEmployee: profile.hasEmployee,
    isRented: profile.isRented,
    closureDate: profile.closureDate.toISOString().slice(0, 10),
  })
  res.json({ taskIds })
})
