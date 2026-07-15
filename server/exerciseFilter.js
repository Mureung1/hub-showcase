import { prisma } from './db.js'

// 특정 운동이 통증 부위(관여 관절)를 쓰는지 확인하고, 쓴다면 같은 타겟부위 안에서
// 그 관절을 쓰지 않는 대체 후보를 찾는다. "이 후보가 통증에 안전하다"고 판단하는 게
// 아니라, 구조적으로 그 관절을 쓰지 않는 운동만 골라내는 기계적 필터다.
export async function findReplacementCandidates(exerciseId, painBodyPart) {
  const original = await prisma.exercise.findUnique({ where: { id: exerciseId } })
  if (!original) return null

  const needsReplacement = original.involvedJoints.includes(painBodyPart)
  if (!needsReplacement) {
    return { needsReplacement: false, original, candidates: [] }
  }

  const candidates = await prisma.exercise.findMany({
    where: {
      targetArea: original.targetArea,
      id: { not: exerciseId },
      NOT: { involvedJoints: { has: painBodyPart } },
    },
  })

  return { needsReplacement: true, original, candidates }
}
