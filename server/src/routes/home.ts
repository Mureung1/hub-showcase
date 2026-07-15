import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const homeRouter = Router()
homeRouter.use(requireAuth)

homeRouter.get('/visits', asyncHandler(async (req, res) => {
  const visits = await prisma.homeVisit.findMany({
    where: { hostId: req.userId },
    include: { visitor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json(visits.map((visit) => ({
    id: visit.id,
    visitor: visit.visitor,
    action: visit.action,
    message: visit.message,
    read: visit.read,
    createdAt: visit.createdAt.toISOString(),
  })))
}))

homeRouter.post('/visits/read', asyncHandler(async (req, res) => {
  await prisma.homeVisit.updateMany({
    where: { hostId: req.userId, read: false },
    data: { read: true },
  })
  res.status(204).end()
}))
