import { Router } from 'express'
import { prisma } from '../prisma.js'

export const progressRouter = Router()

progressRouter.get('/', async (req, res) => {
  const rows = await prisma.taskProgress.findMany({ where: { sessionId: req.sessionId } })
  const progress = Object.fromEntries(rows.map((row) => [
    row.taskId,
    { checked: row.checked, completedAt: row.checked ? row.updatedAt.toISOString() : null },
  ]))
  res.json(progress)
})

progressRouter.post('/:taskId/toggle', async (req, res) => {
  const { taskId } = req.params

  const existing = await prisma.taskProgress.findUnique({
    where: { sessionId_taskId: { sessionId: req.sessionId, taskId } },
  })

  const row = await prisma.taskProgress.upsert({
    where: { sessionId_taskId: { sessionId: req.sessionId, taskId } },
    create: { sessionId: req.sessionId, taskId, checked: true },
    update: { checked: !existing?.checked },
  })

  res.json({
    taskId: row.taskId,
    checked: row.checked,
    completedAt: row.checked ? row.updatedAt.toISOString() : null,
  })
})

progressRouter.post('/reset', async (req, res) => {
  await prisma.taskProgress.deleteMany({ where: { sessionId: req.sessionId } })
  res.status(204).end()
})
