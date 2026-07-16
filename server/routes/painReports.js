import { Router } from 'express'
import { prisma } from '../db.js'
import { findReplacementCandidates } from '../exerciseFilter.js'
import { pickRecommendedExerciseId } from '../llm.js'

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
    const candidates = found.candidates.map((c) => ({ id: c.id, name: c.name }))

    // 대체가 필요하고 후보가 있으면, 그중 하나를 LLM이 추천으로 고른다.
    let recommendedExerciseId = null
    let recommendedBy = null
    if (found.needsReplacement && candidates.length > 0) {
      const picked = await pickRecommendedExerciseId({
        painBodyPart,
        originalName: found.original.name,
        candidates,
      })
      // LLM이 골랐으면 그 값, 실패(null)면 결정론적 폴백으로 첫 후보를 쓴다.
      recommendedExerciseId = picked ?? candidates[0].id
      recommendedBy = picked ? 'llm' : 'fallback'
    }

    results.push({
      originalExerciseId: found.original.id,
      originalName: found.original.name,
      needsReplacement: found.needsReplacement,
      candidates,
      recommendedExerciseId,
      recommendedBy,
    })
  }

  res.json({ painBodyPart, results })
})
