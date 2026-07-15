import { Router } from 'express'
import { prisma } from '../db.js'
import { findReplacementCandidates } from '../exerciseFilter.js'

export const painReportsRouter = Router()

painReportsRouter.post('/pain-reports', async (req, res) => {
  const routineDayId = Number(req.body.routineDayId)
  const painBodyPart = req.body.painBodyPart

  const routineDay = await prisma.routineDay.findUnique({
    where: { id: routineDayId },
    include: { exercises: { include: { exercise: true }, orderBy: { order: 'asc' } } },
  })
  if (!routineDay) {
    return res.status(404).json({ error: '해당 세션을 찾을 수 없습니다.' })
  }

  const results = []
  for (const routineDayExercise of routineDay.exercises) {
    const found = await findReplacementCandidates(routineDayExercise.exerciseId, painBodyPart)
    results.push({
      originalExerciseId: found.original.id,
      originalName: found.original.name,
      needsReplacement: found.needsReplacement,
      candidates: found.candidates.map((c) => ({ id: c.id, name: c.name })),
    })
  }

  res.json({ painBodyPart, results })
})
