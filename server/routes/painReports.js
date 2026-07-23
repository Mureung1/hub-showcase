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
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
    },
  })
  if (!routineDay) {
    return res.status(404).json({ error: '해당 세션을 찾을 수 없습니다.' })
  }

  const results = []
  for (const routineDayExercise of routineDay.exercises) {
    const found = await findReplacementCandidates(
      routineDayExercise.exerciseId,
      painBodyPart,
    )
    const candidates = found.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      imagePath: c.imagePath,
      imageLicenseAuthor: c.imageLicenseAuthor,
      imageSourceUrl: c.imageSourceUrl,
    }))

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

painReportsRouter.post('/pain-reports/confirm', async (req, res) => {
  const routineDayId = Number(req.body.routineDayId)
  const originalExerciseId = Number(req.body.originalExerciseId)
  const substitutedExerciseId = Number(req.body.substitutedExerciseId)
  const painBodyPart = req.body.painBodyPart
  const isManualOverride = Boolean(req.body.isManualOverride)

  const routineDayExercise = await prisma.routineDayExercise.findFirst({
    where: { routineDayId, exerciseId: originalExerciseId },
  })
  if (!routineDayExercise) {
    return res.status(404).json({ error: '해당 운동을 찾을 수 없습니다.' })
  }

  // 클라이언트가 보낸 대체 운동이 실제로 이 통증 부위의 유효한 후보인지 서버가 다시 확인한다.
  // 관절 필터링을 우회한 임의의 exerciseId가 그대로 DB에 반영되는 것을 막는다.
  const found = await findReplacementCandidates(
    originalExerciseId,
    painBodyPart,
  )
  const isValidCandidate = found?.candidates.some(
    (c) => c.id === substitutedExerciseId,
  )
  if (!isValidCandidate) {
    return res.status(400).json({ error: '유효하지 않은 대체 운동입니다.' })
  }

  const user = await prisma.user.findFirst()
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
  }

  await prisma.routineDayExercise.update({
    where: { id: routineDayExercise.id },
    data: { exerciseId: substitutedExerciseId },
  })

  await prisma.painReport.create({
    data: {
      userId: user.id,
      routineDayId,
      bodyPart: painBodyPart,
      originalExerciseId,
      substitutedExerciseId,
      isManualOverride,
    },
  })

  res.json({ success: true })
})
