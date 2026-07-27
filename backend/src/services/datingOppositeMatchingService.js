import { prisma } from '../config/prismaClient.js'
import { calculateOppositeTeamMatches } from '../utils/datingOppositeMatchingUtils.js'

// 후보 팀들의 리더 닉네임을 한 번의 조회로 가져와 { teamId: leaderNickname } 형태로 반환한다.
// (팀 이름 컬럼이 없어 화면에서는 "{리더 닉네임} 팀"으로 표시함 — 후보마다 따로 조회하지 않도록 findMany 한 번으로 처리)
async function getLeaderNicknamesByTeamId(teamIds) {
  const candidateTeams = await prisma.datingTeam.findMany({
    where: { teamId: { in: teamIds } },
    include: { leader: { select: { nickname: true } } },
  })

  const leaderNicknameByTeamId = new Map()
  for (const team of candidateTeams) {
    leaderNicknameByTeamId.set(team.teamId.toString(), team.leader?.nickname ?? null)
  }
  return leaderNicknameByTeamId
}

// 내 팀의 이성 그룹 매칭 궁합 점수를 계산해 matches 테이블에 저장(같은 조합이 이미 있으면 점수만 갱신)하고,
// finalScore 높은 순으로 정렬된 계산 결과에 각 후보 팀의 리더 닉네임(leaderNickname)을 붙여서 반환한다.
// (partyAId=내 teamId, partyBId=후보 teamId로 저장 — 룸메이트 매칭과 달리 순서를 정규화하지 않는다:
// 상대 팀이 나중에 자기 팀 기준으로 같은 API를 호출하면 partyAId/partyBId가 반대로 된 별도 row가 생긴다)
export async function calculateAndSaveOppositeTeamMatches(teamId) {
  const myTeamId = BigInt(teamId)

  const results = await calculateOppositeTeamMatches(teamId)

  for (const result of results) {
    const candidateTeamId = BigInt(result.teamId)

    const existingMatch = await prisma.match.findFirst({
      where: { matchType: 'dating_opposite', partyAId: myTeamId, partyBId: candidateTeamId },
    })

    if (existingMatch) {
      await prisma.match.update({
        where: { matchId: existingMatch.matchId },
        data: { similarityScore: result.finalScore },
      })
    } else {
      await prisma.match.create({
        data: {
          matchType: 'dating_opposite',
          partyAId: myTeamId,
          partyBId: candidateTeamId,
          similarityScore: result.finalScore,
          status: 'proposed',
        },
      })
    }
  }

  const leaderNicknameByTeamId = await getLeaderNicknamesByTeamId(
    results.map((result) => BigInt(result.teamId)),
  )

  return results.map((result) => ({
    ...result,
    // 탈퇴 등으로 리더 닉네임을 못 찾으면 null — 프론트에서 "{teamId}팀"으로 fallback 처리
    leaderNickname: leaderNicknameByTeamId.get(result.teamId) ?? null,
  }))
}
