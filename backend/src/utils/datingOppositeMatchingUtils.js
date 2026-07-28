import { prisma } from '../config/prismaClient.js'
import { cosineSimilarity } from './roommateMatchingUtils.js'

// 취미 4타입 순서 (calculateHobbyScore.js와 동일한 순서)
const HOBBY_TYPES = ['딥다이버', '에너지러', '무드트래블러', '소셜메이커']
// 이상형 4타입 순서 (calculateDatingScore.js와 동일한 순서)
const DATING_TYPES = ['포근메이트', '티키타카러', '하트스파커', '그로우파트너']

// 벡터 목록을 타입별로 평균 낸다. 벡터가 하나도 없으면 0으로 채운 벡터를 반환한다.
function averageVector(vectors, types) {
  if (vectors.length === 0) return types.map(() => 0)
  return types.map((_, i) => vectors.reduce((sum, vector) => sum + vector[i], 0) / vectors.length)
}

// teamId에 속한 팀원들의 취미 4타입 점수 평균, 이상형 4타입 점수 평균을 계산한다.
// 취미/이상형 테스트를 완료하지 않은 팀원은 해당 벡터의 평균 계산에서 제외한다
// (0점 벡터로 채우면 팀 평균이 부당하게 낮아져, 다음 단계의 이성 팀 코사인 유사도 계산이 왜곡되기 때문).
// @param {number|bigint|string} teamId
// @returns {Promise<{ hobbyVector: number[], datingVector: number[] }>} 각각 길이 4인 평균 점수 배열
export async function getTeamAverageVectors(teamId) {
  const members = await prisma.datingTeamMember.findMany({
    where: { teamId: BigInt(teamId) },
    include: {
      user: {
        include: {
          hobbyTestResult: true,
          personalityTests: { where: { testType: 'dating' } },
        },
      },
    },
  })

  const hobbyVectors = []
  const datingVectors = []

  for (const member of members) {
    const { hobbyTestResult, personalityTests } = member.user

    if (hobbyTestResult) {
      hobbyVectors.push(HOBBY_TYPES.map((type) => hobbyTestResult.scoreSummary[type]))
    }

    const datingTest = personalityTests[0]
    if (datingTest) {
      datingVectors.push(DATING_TYPES.map((type) => datingTest.scoreSummary.scores[type]))
    }
  }

  return {
    hobbyVector: averageVector(hobbyVectors, HOBBY_TYPES),
    datingVector: averageVector(datingVectors, DATING_TYPES),
  }
}

// teamId로 내 팀 정보를 조회하고, 이 팀과 매칭 가능한 반대 성별 상대 팀 후보 목록을 조회한다.
// 후보 조건: status='matched' + gender가 내 팀과 다름 + teamSize가 내 팀과 같음 + teamId가 내 팀이 아님
// @param {number|bigint|string} teamId
// @returns {Promise<{ teamId: string, gender: string, teamSize: number }[]>} 조건을 만족하는 상대 팀 목록
export async function getOppositeTeamCandidates(teamId) {
  const myTeamId = BigInt(teamId)

  const myTeam = await prisma.datingTeam.findUnique({ where: { teamId: myTeamId } })

  if (!myTeam) {
    const err = new Error('존재하지 않는 팀입니다.')
    err.status = 404
    throw err
  }

  const candidateTeams = await prisma.datingTeam.findMany({
    where: {
      teamId: { not: myTeamId },
      status: 'matched',
      gender: { not: myTeam.gender },
      teamSize: myTeam.teamSize,
    },
  })

  return candidateTeams.map((team) => ({
    teamId: team.teamId.toString(),
    gender: team.gender,
    teamSize: team.teamSize,
  }))
}

// 내 teamId를 기준으로 매칭 가능한 상대 팀 후보들과의 궁합 점수를 계산해서, 높은 순으로 정렬해 반환한다.
// 취미 벡터 유사도와 이상형 벡터 유사도를 각각 코사인 유사도로 구한 뒤 5:5로 가중합한다.
// (0~1 사이 소수값 그대로 반환 — %로 변환해서 화면에 보여주는 작업은 이 함수 밖에서 처리)
// @param {number|bigint|string} teamId
// @returns {Promise<{ teamId: string, finalScore: number, hobbySimilarity: number, datingSimilarity: number }[]>}
export async function calculateOppositeTeamMatches(teamId) {
  const myVectors = await getTeamAverageVectors(teamId)
  const candidates = await getOppositeTeamCandidates(teamId)

  const results = []

  for (const candidate of candidates) {
    const candidateVectors = await getTeamAverageVectors(candidate.teamId)

    const hobbySimilarity = cosineSimilarity(myVectors.hobbyVector, candidateVectors.hobbyVector)
    const datingSimilarity = cosineSimilarity(myVectors.datingVector, candidateVectors.datingVector)
    const finalScore = hobbySimilarity * 0.5 + datingSimilarity * 0.5

    results.push({
      teamId: candidate.teamId,
      finalScore,
      hobbySimilarity,
      datingSimilarity,
    })
  }

  results.sort((a, b) => b.finalScore - a.finalScore)

  return results
}

// 지정된 두 팀(teamAId, teamBId) 사이의 궁합 점수(0~1)만 계산한다.
// calculateOppositeTeamMatches와 동일한 공식(취미0.5 + 이상형0.5 코사인 유사도)을 재사용하되,
// 후보 목록 전체를 순회하지 않고 특정 팀 쌍 하나만 계산하고 싶을 때 쓴다 (예: 상세 화면의 "내 팀 vs 상대 팀").
// @param {number|bigint|string} teamAId
// @param {number|bigint|string} teamBId
// @returns {Promise<number>} 0~1 사이의 궁합 점수
export async function calculateTeamPairFinalScore(teamAId, teamBId) {
  const vectorsA = await getTeamAverageVectors(teamAId)
  const vectorsB = await getTeamAverageVectors(teamBId)

  const hobbySimilarity = cosineSimilarity(vectorsA.hobbyVector, vectorsB.hobbyVector)
  const datingSimilarity = cosineSimilarity(vectorsA.datingVector, vectorsB.datingVector)

  return hobbySimilarity * 0.5 + datingSimilarity * 0.5
}
