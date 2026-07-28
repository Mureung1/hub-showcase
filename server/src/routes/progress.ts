import { Router } from 'express'
import { prisma } from '../prisma.js'

export const progressRouter = Router()

progressRouter.get('/', async (req, res) => {
  const rows = await prisma.taskProgress.findMany({ where: { sessionId: req.sessionId } })
  const progress = Object.fromEntries(rows.map((row) => [
    row.taskId,
    {
      checked: row.checked,
      completedAt: row.checked ? row.updatedAt.toISOString() : null,
      memo: row.memo,
    },
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

progressRouter.patch('/:taskId/memo', async (req, res) => {
  const { taskId } = req.params
  const { memo } = req.body as { memo: string }

  const row = await prisma.taskProgress.upsert({
    where: { sessionId_taskId: { sessionId: req.sessionId, taskId } },
    create: { sessionId: req.sessionId, taskId, checked: false, memo },
    update: { memo },
  })

  res.json({ taskId: row.taskId, memo: row.memo })
})

progressRouter.post('/reset', async (req, res) => {
  await prisma.taskProgress.updateMany({
    where: { sessionId: req.sessionId },
    data: { checked: false },
  })
  res.status(204).end()
})
