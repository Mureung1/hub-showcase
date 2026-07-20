import { prisma } from '../config/prismaClient.js'
import {
  passesHardFilter,
  cosineSimilarity,
  softFilterMatch,
  calculateFinalScore,
} from '../utils/roommateMatchingUtils.js'

// 코사인 유사도 계산 시 사용할 생활성향 4타입 순서 (calculateLifestyleScore.js와 동일한 순서)
const LIFESTYLE_TYPES = ['깔끔루틴러', '함께루틴러', '여유마이웨이', '편한동거러']

// personality_tests(test_type='lifestyle')의 scoreSummary에서 하드필터에 필요한 값만 뽑아낸다
function extractHardFilterFields(user, lifestyleTest) {
  return {
    gender: user.gender,
    smokingStatus: lifestyleTest.scoreSummary.filters.smokingStatus,
    drinkingStatus: lifestyleTest.scoreSummary.filters.drinkingStatus,
    roommateType: user.roommateProfile.roommateType,
  }
}

// 룸메이트 매칭 후보 목록 조회: userId 본인 기준으로 하드필터를 통과하는 다른 유저들을 반환한다
export async function getCandidatesForUser(userId) {
  const selfId = BigInt(userId)

  const selfUser = await prisma.user.findUnique({
    where: { userId: selfId },
    include: {
      roommateProfile: true,
      personalityTests: { where: { testType: 'lifestyle' } },
    },
  })

  if (!selfUser) {
    const err = new Error('존재하지 않는 유저입니다.')
    err.status = 404
    throw err
  }

  const selfLifestyleTest = selfUser.personalityTests[0]

  if (!selfUser.roommateProfile || !selfLifestyleTest) {
    const err = new Error(
      '룸메이트 매칭을 위해서는 룸메이트 유형 선택과 생활성향 테스트를 모두 완료해야 합니다.',
    )
    err.status = 400
    throw err
  }

  const selfFilterFields = extractHardFilterFields(selfUser, selfLifestyleTest)

  // 본인을 제외한 유저 중, roommate_profiles와 생활성향 테스트 결과가 모두 있는 유저만 후보군으로 가져온다
  const candidateUsers = await prisma.user.findMany({
    where: {
      userId: { not: selfId },
      roommateProfile: { isNot: null },
      personalityTests: { some: { testType: 'lifestyle' } },
    },
    include: {
      roommateProfile: true,
      personalityTests: { where: { testType: 'lifestyle' } },
    },
  })

  const candidates = []

  for (const candidateUser of candidateUsers) {
    const candidateLifestyleTest = candidateUser.personalityTests[0]
    const candidateFilterFields = extractHardFilterFields(candidateUser, candidateLifestyleTest)

    if (!passesHardFilter(selfFilterFields, candidateFilterFields)) continue

    const { scores, filters } = candidateLifestyleTest.scoreSummary

    candidates.push({
      userId: candidateUser.userId.toString(),
      lifestyleVector: LIFESTYLE_TYPES.map((type) => scores[type]),
      guestPolicy: filters.guestPolicy,
      temperaturePreference: filters.temperaturePreference,
    })
  }

  return candidates
}

// 본인의 생활성향 벡터, guestPolicy, temperaturePreference 조회 (getCandidatesForUser의 자기 자신 조회 로직과 동일한 검증을 거친다)
async function getSelfLifestyleData(userId) {
  const selfId = BigInt(userId)

  const selfUser = await prisma.user.findUnique({
    where: { userId: selfId },
    include: {
      roommateProfile: true,
      personalityTests: { where: { testType: 'lifestyle' } },
    },
  })

  if (!selfUser) {
    const err = new Error('존재하지 않는 유저입니다.')
    err.status = 404
    throw err
  }

  const selfLifestyleTest = selfUser.personalityTests[0]

  if (!selfUser.roommateProfile || !selfLifestyleTest) {
    const err = new Error(
      '룸메이트 매칭을 위해서는 룸메이트 유형 선택과 생활성향 테스트를 모두 완료해야 합니다.',
    )
    err.status = 400
    throw err
  }

  const { scores, filters } = selfLifestyleTest.scoreSummary

  return {
    lifestyleVector: LIFESTYLE_TYPES.map((type) => scores[type]),
    guestPolicy: filters.guestPolicy,
    temperaturePreference: filters.temperaturePreference,
  }
}

// 룸메이트 매칭 점수를 계산해 matches 테이블에 저장(같은 조합이 이미 있으면 점수만 갱신)하고,
// 점수 높은 순으로 정렬된 매칭 결과를 반환한다
export async function calculateAndSaveRoommateMatches(userId) {
  const selfId = BigInt(userId)

  const [selfData, candidates] = await Promise.all([
    getSelfLifestyleData(userId),
    getCandidatesForUser(userId),
  ])

  if (candidates.length === 0) {
    return { matches: [], message: '조건에 맞는 매칭 후보가 없습니다.' }
  }

  const results = []

  for (const candidate of candidates) {
    const lifestyleSimilarity = cosineSimilarity(selfData.lifestyleVector, candidate.lifestyleVector)
    const softMatch = softFilterMatch(selfData, candidate)
    const similarityScore = calculateFinalScore(lifestyleSimilarity, softMatch)

    const candidateId = BigInt(candidate.userId)
    // A-B, B-A가 별도 row로 중복 저장되지 않도록 항상 작은 쪽을 partyAId로 고정
    const [partyAId, partyBId] =
      selfId < candidateId ? [selfId, candidateId] : [candidateId, selfId]

    const existingMatch = await prisma.match.findFirst({
      where: { matchType: 'roommate', partyAId, partyBId },
    })

    if (existingMatch) {
      await prisma.match.update({
        where: { matchId: existingMatch.matchId },
        data: { similarityScore },
      })
    } else {
      await prisma.match.create({
        data: {
          matchType: 'roommate',
          partyAId,
          partyBId,
          similarityScore,
          status: 'proposed',
        },
      })
    }

    results.push({ userId: candidate.userId, similarityScore })
  }

  results.sort((a, b) => b.similarityScore - a.similarityScore)

  return { matches: results }
}
