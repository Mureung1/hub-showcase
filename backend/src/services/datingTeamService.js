import { prisma } from '../config/prismaClient.js'
import { calculateTeamPairFinalScore } from '../utils/datingOppositeMatchingUtils.js'

// birth_year로부터 현재 나이를 계산한다. (authController.js에서 나이 -> birthYear로 변환하는 로직의 역계산)
function calculateAgeFromBirthYear(birthYear) {
  return new Date().getFullYear() - birthYear
}

// 로그인한 유저의 현재 과팅 팀 구성 현황을 조회한다.
// 아직 아무도 초대를 주고받지 않아 recruiting 팀이 없다면, 본인 한 명만 있는 상태로 간주한다.
export async function getMyDatingTeamStatus(userId) {
  const targetId = BigInt(userId)

  const membership = await prisma.datingTeamMember.findFirst({
    where: { userId: targetId, team: { status: { in: ['recruiting', 'matched'] } } },
    include: {
      team: {
        include: {
          members: {
            include: { user: { select: { nickname: true } } },
          },
        },
      },
    },
  })

  if (membership) {
    return {
      teamSize: membership.team.teamSize,
      teamId: membership.team.teamId.toString(),
      myUserId: targetId.toString(),
      status: membership.team.status,
      isLeader: membership.team.leaderId === targetId,
      members: membership.team.members.map((m) => ({
        userId: m.userId.toString(),
        nickname: m.user.nickname,
      })),
    }
  }

  const user = await prisma.user.findUnique({
    where: { userId: targetId },
    select: { nickname: true, preferredTeamSize: true },
  })

  if (!user) {
    const err = new Error('존재하지 않는 유저입니다.')
    err.status = 404
    throw err
  }

  if (user.preferredTeamSize == null) {
    const err = new Error('먼저 과팅 인원을 선택해주세요.')
    err.status = 400
    throw err
  }

  return {
    teamSize: user.preferredTeamSize,
    teamId: null,
    myUserId: targetId.toString(),
    status: 'recruiting',
    isLeader: true,
    members: [{ userId: targetId.toString(), nickname: user.nickname }],
  }
}

// 팀 리더가 "팀 확정" 버튼을 눌렀을 때 팀 상태를 recruiting -> matched로 변경한다.
// 검증 순서: 팀 존재 확인 -> 리더 본인 확인 -> 현재 상태가 recruiting인지 확인 -> 정원이 다 찼는지 확인
export async function confirmDatingTeam(teamId, userId) {
  let parsedTeamId
  try {
    parsedTeamId = BigInt(teamId)
  } catch {
    const err = new Error('유효하지 않은 팀 ID입니다.')
    err.status = 400
    throw err
  }

  const userIdBig = BigInt(userId)

  return prisma.$transaction(async (tx) => {
    // 1. 팀 존재 확인
    const team = await tx.datingTeam.findUnique({ where: { teamId: parsedTeamId } })
    if (!team) {
      const err = new Error('존재하지 않는 팀입니다.')
      err.status = 404
      throw err
    }

    // 2. 요청한 유저가 이 팀의 리더인지 확인
    if (team.leaderId !== userIdBig) {
      const err = new Error('리더만 팀을 확정할 수 있습니다.')
      err.status = 403
      throw err
    }

    // 3. 팀 상태가 recruiting인지 확인 (이미 확정됐거나 닫힌 팀은 재확정 불가)
    if (team.status !== 'recruiting') {
      const err = new Error('이미 확정되었거나 유효하지 않은 팀 상태입니다.')
      err.status = 400
      throw err
    }

    // 4. 정원이 다 찼는지 확인 (인원이 덜 찬 상태로 확정되는 것을 막는다)
    const memberCount = await tx.datingTeamMember.count({ where: { teamId: parsedTeamId } })
    if (memberCount !== team.teamSize) {
      const err = new Error('아직 팀원이 다 모이지 않았습니다.')
      err.status = 400
      throw err
    }

    // 5. 모든 검증 통과: 팀 상태를 matched로 변경
    const updatedTeam = await tx.datingTeam.update({
      where: { teamId: parsedTeamId },
      data: { status: 'matched' },
    })

    return {
      teamId: updatedTeam.teamId.toString(),
      status: updatedTeam.status,
    }
  })
}

// teamSize=1(1:1) 유저 전용: 초대 없이 "팀 확정" 버튼 클릭 한 번으로 본인 단독 팀을 생성하고
// 곧바로 matched 상태까지 만든다. 생성과 확정을 하나의 트랜잭션으로 묶어 중간 실패 시 둘 다 롤백되게 한다.
// 검증 순서: 유저 존재 확인 -> preferredTeamSize가 1인지 확인 -> 이미 팀이 있으면(중복 클릭) 그대로 반환
export async function confirmSoloDatingTeam(userId) {
  const userIdBig = BigInt(userId)

  return prisma.$transaction(async (tx) => {
    // 1. 유저 확인
    const user = await tx.user.findUnique({
      where: { userId: userIdBig },
      select: { gender: true, preferredTeamSize: true },
    })

    if (!user) {
      const err = new Error('존재하지 않는 유저입니다.')
      err.status = 404
      throw err
    }

    // 2. teamSize=1을 선택한 유저만 이 API를 사용할 수 있다
    if (user.preferredTeamSize !== 1) {
      const err = new Error('1인 팀 확정은 1:1을 선택한 유저만 가능합니다.')
      err.status = 400
      throw err
    }

    // 3. 이미 recruiting 또는 matched 상태의 팀이 있는지 확인 (더블클릭으로 중복 생성되는 것을 방지)
    const existingMembership = await tx.datingTeamMember.findFirst({
      where: { userId: userIdBig, team: { status: { in: ['recruiting', 'matched'] } } },
      include: { team: true },
    })

    if (existingMembership) {
      return {
        teamId: existingMembership.team.teamId.toString(),
        status: existingMembership.team.status,
      }
    }

    // 4. 본인 단독 팀 생성
    const newTeam = await tx.datingTeam.create({
      data: {
        leaderId: userIdBig,
        gender: user.gender,
        teamSize: 1,
        status: 'recruiting',
      },
    })

    // 5. 본인을 멤버로 등록
    await tx.datingTeamMember.create({
      data: { teamId: newTeam.teamId, userId: userIdBig },
    })

    // 6. 생성 직후 곧바로 확정 상태로 변경
    const confirmedTeam = await tx.datingTeam.update({
      where: { teamId: newTeam.teamId },
      data: { status: 'matched' },
    })

    return {
      teamId: confirmedTeam.teamId.toString(),
      status: confirmedTeam.status,
    }
  })
}

// 로그인한 유저(myUserId)가 현재 속한 팀의 teamId를 찾는다. recruiting/matched 상태의 팀에 속해있지 않으면 null.
// (getMyDatingTeamStatus에서 "내 팀"을 찾을 때 쓰는 조건과 동일한 패턴)
// matchRequestService.js에서도 "내 팀(fromTeamId) 찾기" 용도로 재사용하기 위해 export한다.
export async function findMyActiveTeamId(myUserId) {
  const membership = await prisma.datingTeamMember.findFirst({
    where: { userId: BigInt(myUserId), team: { status: { in: ['recruiting', 'matched'] } } },
    select: { teamId: true },
  })

  return membership ? membership.teamId : null
}

// 과팅 이성 그룹 매칭 상세 화면용: teamId 하나로 팀원 개개인의 이름/나이/취미유형/이상형유형을 조회하고,
// 로그인한 유저(myUserId)가 속한 팀과의 궁합%(matchPercent)도 함께 계산해 반환한다.
// (기존 GET /:teamId/opposite-matches는 팀 단위 궁합 점수만 계산하고 팀원 개인정보는 포함하지 않아 별도로 추가)
export async function getDatingTeamDetail(teamId, myUserId) {
  let parsedTeamId
  try {
    parsedTeamId = BigInt(teamId)
  } catch {
    const err = new Error('유효하지 않은 팀 ID입니다.')
    err.status = 400
    throw err
  }

  const team = await prisma.datingTeam.findUnique({
    where: { teamId: parsedTeamId },
    include: {
      leader: { select: { nickname: true } },
      members: {
        include: {
          user: {
            select: {
              userId: true,
              nickname: true,
              birthYear: true,
              hobbyTestResult: { select: { hobbyTags: true } },
              // dating 타입 성향 테스트는 유저당 최대 1개라, 첫 번째 결과만 사용한다 (datingOppositeMatchingUtils.js와 동일한 방식)
              personalityTests: { where: { testType: 'dating' }, select: { scoreSummary: true } },
            },
          },
        },
      },
    },
  })

  if (!team) {
    const err = new Error('존재하지 않는 팀입니다.')
    err.status = 404
    throw err
  }

  // 로그인한 유저가 아직 어떤 팀에도 속해있지 않으면 궁합을 계산할 기준 팀이 없으므로 matchPercent는 null
  const myTeamId = await findMyActiveTeamId(myUserId)
  const matchPercent =
    myTeamId != null
      ? Math.round((await calculateTeamPairFinalScore(myTeamId, parsedTeamId)) * 100)
      : null

  // 내 팀이 상대팀 무관하게 이미 pending 신청을 갖고 있는지, 있다면 그 대상이 지금 보고 있는 이 팀인지 확인
  // (matchRequestService.js의 "한 팀은 동시에 하나의 신청만 진행 가능" 검증과 같은 조건을 조회용으로 재사용)
  let myRequestStatus = { hasActiveRequest: false, isForThisTeam: false }
  if (myTeamId != null) {
    const myPendingRequest = await prisma.matchRequest.findFirst({
      where: { fromTeamId: myTeamId, status: 'pending' },
    })

    if (myPendingRequest) {
      myRequestStatus = {
        hasActiveRequest: true,
        isForThisTeam: myPendingRequest.toTeamId === parsedTeamId,
      }
    }
  }

  return {
    teamId: team.teamId.toString(),
    teamName: team.leader?.nickname ?? null,
    matchPercent,
    myRequestStatus,
    members: team.members.map(({ user }) => {
      const hobbyTags = user.hobbyTestResult?.hobbyTags ?? null
      const datingScoreSummary = user.personalityTests[0]?.scoreSummary ?? null

      return {
        userId: user.userId.toString(),
        nickname: user.nickname,
        age: calculateAgeFromBirthYear(user.birthYear),
        // 취미/이상형 테스트를 아직 완료하지 않은 팀원은 null로 내려준다 (프론트에서 방어 처리)
        hobby: hobbyTags ? { primary: hobbyTags.primary, secondary: hobbyTags.secondary } : null,
        dating: datingScoreSummary
          ? { primary: datingScoreSummary.primary, secondary: datingScoreSummary.secondary }
          : null,
      }
    }),
  }
}
