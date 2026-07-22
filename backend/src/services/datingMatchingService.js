import { prisma } from '../config/prismaClient.js'
import { passesHobbyFilter } from '../utils/roommateMatchingUtils.js'

// hobby_test_results.hobbyTags({ primary, secondary })에서 취미 하드필터에 필요한 값을 뽑아낸다.
// 취미 테스트를 완료하지 않은 유저는 null을 반환한다. (roommateMatchingService.js의 extractHobbyTags와 동일한 방식)
function extractHobbyTags(user) {
  return user.hobbyTestResult ? user.hobbyTestResult.hobbyTags : null
}

// 과팅 동성 그룹 매칭 후보 목록 조회: userId 본인과 같은 성별이면서,
// 취미 주유형이 본인의 주유형 또는 보조유형과 겹치는 후보들을 반환한다.
// (본인이 취미 테스트 미완료면 에러, 후보가 미완료면 조용히 제외 — 룸메이트 매칭과 동일한 처리 방식)
export async function getSameGenderDatingCandidates(userId) {
  const selfId = BigInt(userId)

  const selfUser = await prisma.user.findUnique({
    where: { userId: selfId },
    include: { hobbyTestResult: true },
  })

  if (!selfUser) {
    const err = new Error('존재하지 않는 유저입니다.')
    err.status = 404
    throw err
  }

  const selfHobbyTags = extractHobbyTags(selfUser)

  if (!selfHobbyTags) {
    const err = new Error('과팅 매칭을 위해서는 취미 발견 테스트를 먼저 완료해야 합니다.')
    err.status = 400
    throw err
  }

  // 본인을 제외하고, 성별이 같으며 취미 테스트를 완료한 유저만 후보군으로 가져온다
  const candidateUsers = await prisma.user.findMany({
    where: {
      userId: { not: selfId },
      gender: selfUser.gender,
      hobbyTestResult: { isNot: null },
    },
    include: { hobbyTestResult: true },
  })

  const candidates = []

  for (const candidateUser of candidateUsers) {
    const candidateHobbyTags = extractHobbyTags(candidateUser)
    if (!candidateHobbyTags) continue

    if (!passesHobbyFilter(selfHobbyTags, candidateHobbyTags)) continue

    candidates.push({
      userId: candidateUser.userId.toString(),
      nickname: candidateUser.nickname,
      hobbyPrimaryType: candidateHobbyTags.primary,
      hobbySecondaryType: candidateHobbyTags.secondary,
    })
  }

  return candidates
}
