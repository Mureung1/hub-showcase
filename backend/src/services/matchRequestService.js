import { prisma } from '../config/prismaClient.js'
import { findMyActiveTeamId } from './datingTeamService.js'
import { calculateTeamPairFinalScore } from '../utils/datingOppositeMatchingUtils.js'

// 로그인한 유저의 팀(fromTeam)이 상대 팀(toTeamId)에게 매칭 신청("관심 보내기")을 보낸다.
// 검증 순서: 내 팀 존재 확인 -> 상대 팀 존재 확인 -> 자기 팀 신청 방지 -> 두 팀 모두 matched 상태인지 확인
// -> 성별이 다른지 확인 -> teamSize 동일 확인 -> 진행 중인(pending) 신청 여부 확인 -> 동일 상대팀 기존 이력 확인
// (pending/accepted면 차단, rejected면 재신청 허용) -> 궁합 점수 계산 -> 레코드 생성 또는 갱신
export async function createMatchRequest(myUserId, toTeamId) {
  let parsedToTeamId
  try {
    parsedToTeamId = BigInt(toTeamId)
  } catch {
    const err = new Error('유효하지 않은 팀 ID입니다.')
    err.status = 400
    throw err
  }

  // 1. 로그인한 유저의 활성 팀(fromTeamId) 조회 — 없으면 신청 자체가 불가능
  const fromTeamId = await findMyActiveTeamId(myUserId)
  if (fromTeamId == null) {
    const err = new Error('소속된 팀이 없습니다.')
    err.status = 400
    throw err
  }

  // 2. 두 팀 정보를 함께 조회 (존재 여부 + status + teamSize 검증에 모두 필요)
  const [fromTeam, toTeam] = await Promise.all([
    prisma.datingTeam.findUnique({ where: { teamId: fromTeamId } }),
    prisma.datingTeam.findUnique({ where: { teamId: parsedToTeamId } }),
  ])

  if (!toTeam) {
    const err = new Error('존재하지 않는 팀입니다.')
    err.status = 404
    throw err
  }

  // 3. 자기 팀에는 신청할 수 없음
  if (fromTeamId === parsedToTeamId) {
    const err = new Error('자신의 팀에는 신청할 수 없습니다.')
    err.status = 400
    throw err
  }

  // 4. 두 팀 모두 확정(matched) 상태여야 신청 가능 — 이성 팀 후보 목록도 status='matched'인 팀만 노출한다
  //    (datingOppositeMatchingUtils.js의 getOppositeTeamCandidates와 동일한 기준)
  if (fromTeam.status !== 'matched') {
    const err = new Error('아직 확정되지 않은 팀은 신청을 보낼 수 없습니다.')
    err.status = 400
    throw err
  }

  if (toTeam.status !== 'matched') {
    const err = new Error('상대 팀이 아직 매칭 가능한 상태가 아닙니다.')
    err.status = 400
    throw err
  }

  // 5. 과팅은 이성 매칭이므로, 같은 성별 팀끼리는 신청할 수 없음
  //    (getOppositeTeamCandidates가 후보 목록을 만들 때 쓰는 조건과 동일한 기준)
  if (fromTeam.gender === toTeam.gender) {
    const err = new Error('이성 팀에만 신청할 수 있습니다.')
    err.status = 400
    throw err
  }

  // 6. 팀 인원이 같아야 신청 가능
  if (fromTeam.teamSize !== toTeam.teamSize) {
    const err = new Error('팀 인원이 달라 신청할 수 없습니다.')
    err.status = 400
    throw err
  }

  // 7. 한 팀은 동시에 하나의 신청만 진행할 수 있음 — 내 팀이 상대팀 무관하게 이미 pending 신청을 갖고 있는지 확인
  //    (팀원 여러 명이 각자 다른 팀에 동시에 신청을 보내는 상황을 방지)
  const existingPendingRequest = await prisma.matchRequest.findFirst({
    where: { fromTeamId, status: 'pending' },
  })

  if (existingPendingRequest) {
    if (existingPendingRequest.toTeamId === parsedToTeamId) {
      const err = new Error('이미 신청한 팀입니다.')
      err.status = 409
      throw err
    }

    const err = new Error('이미 다른 팀에 신청을 보낸 상태입니다.')
    err.status = 409
    throw err
  }

  // 8. 같은 조합으로 신청한 이력이 있는지 확인 — 있으면 상태에 따라 다르게 처리한다
  //    (pending/accepted면 재신청을 막고, rejected면 재신청을 허용해 기존 행을 pending으로 되돌린다)
  const existingRequest = await prisma.matchRequest.findUnique({
    where: { fromTeamId_toTeamId: { fromTeamId, toTeamId: parsedToTeamId } },
  })

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      const err = new Error('이미 신청한 팀입니다.')
      err.status = 409
      throw err
    }

    if (existingRequest.status === 'accepted') {
      const err = new Error('이미 매칭이 성사된 팀입니다.')
      err.status = 409
      throw err
    }
    // status === 'rejected'인 경우는 아래에서 재신청(재계산 후 pending으로 갱신)으로 처리한다
  }

  // 9. 궁합 점수 계산 (기존 datingOppositeMatchingUtils.js의 계산 로직 그대로 재사용)
  const similarityScore = await calculateTeamPairFinalScore(fromTeamId, parsedToTeamId)

  try {
    const matchRequest = existingRequest
      ? await prisma.matchRequest.update({
          where: { fromTeamId_toTeamId: { fromTeamId, toTeamId: parsedToTeamId } },
          data: {
            status: 'pending',
            similarityScore,
            createdAt: new Date(),
          },
        })
      : await prisma.matchRequest.create({
          data: {
            fromTeamId,
            toTeamId: parsedToTeamId,
            similarityScore,
            status: 'pending',
          },
        })

    return {
      requestId: matchRequest.requestId.toString(),
      fromTeamId: matchRequest.fromTeamId.toString(),
      toTeamId: matchRequest.toTeamId.toString(),
      similarityScore: matchRequest.similarityScore,
      status: matchRequest.status,
      createdAt: matchRequest.createdAt,
    }
  } catch (err) {
    // 동시 요청 등 극단적 경합 상황에서 @@unique 제약이 걸릴 경우, 500 대신 409로 처리
    if (err.code === 'P2002') {
      const conflictErr = new Error('이미 신청한 팀입니다.')
      conflictErr.status = 409
      throw conflictErr
    }
    throw err
  }
}

// 로그인한 유저(userId)가 "리더"로 있는 팀(들)이 받은, 아직 응답하지 않은(pending) 매칭 신청 목록을 조회한다.
// 헤더 알림 벨에서 "OO팀이 관심을 보였어요"를 보여줄 수 있도록 신청을 보낸 팀(fromTeam)의 이름도 함께 반환한다.
// MatchRequest는 DatingTeam과 relation 없이 plain BigInt로 연결돼 있어(스키마 주석 참고),
// fromTeam 정보는 별도 쿼리로 한 번에 모아 가져온다 (N+1 방지).
export async function getReceivedMatchRequests(userId) {
  const leaderId = BigInt(userId)

  // 1. 내가 리더인 팀들의 teamId 조회
  const ledTeams = await prisma.datingTeam.findMany({
    where: { leaderId },
    select: { teamId: true },
  })

  if (ledTeams.length === 0) {
    return []
  }

  const ledTeamIds = ledTeams.map((team) => team.teamId)

  // 2. 그 팀들이 받은 pending 매칭 신청 조회
  const pendingRequests = await prisma.matchRequest.findMany({
    where: {
      toTeamId: { in: ledTeamIds },
      status: 'pending',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (pendingRequests.length === 0) {
    return []
  }

  // 3. 신청을 보낸 팀(fromTeam)들의 이름(리더 닉네임)을 한 번에 조회
  //    (getDatingTeamDetail에서 teamName을 leader.nickname으로 쓰는 것과 동일한 방식)
  const fromTeamIds = pendingRequests.map((request) => request.fromTeamId)

  const fromTeams = await prisma.datingTeam.findMany({
    where: { teamId: { in: fromTeamIds } },
    include: { leader: { select: { nickname: true } } },
  })

  const fromTeamNameById = new Map(
    fromTeams.map((team) => [team.teamId.toString(), team.leader?.nickname ?? null])
  )

  return pendingRequests.map((request) => ({
    requestId: request.requestId.toString(),
    fromTeamId: request.fromTeamId.toString(),
    fromTeamName: fromTeamNameById.get(request.fromTeamId.toString()) ?? null,
    similarityScore: request.similarityScore,
    createdAt: request.createdAt,
  }))
}

// 매칭 신청을 받은 팀의 리더가 신청을 수락한다.
// 신청 상태 변경, 관련된 다른 신청 정리, 두 팀 상태 확정, 그룹 채팅방 생성까지
// 하나의 prisma.$transaction 안에서 원자적으로 처리한다 (중간에 실패하면 전체 롤백).
// 검증 순서: 신청 존재 확인 -> 이미 처리된 신청인지 확인 -> 로그인 유저가 toTeam(신청받은 팀) 리더인지 확인
export async function acceptMatchRequest(requestId, currentUserId) {
  let parsedRequestId
  try {
    parsedRequestId = BigInt(requestId)
  } catch {
    const err = new Error('유효하지 않은 신청 ID입니다.')
    err.status = 400
    throw err
  }

  const userId = BigInt(currentUserId)

  return prisma.$transaction(async (tx) => {
    // 1. 신청 존재 확인
    const matchRequest = await tx.matchRequest.findUnique({
      where: { requestId: parsedRequestId },
    })

    if (!matchRequest) {
      const err = new Error('존재하지 않는 신청입니다.')
      err.status = 404
      throw err
    }

    // 2. 이미 처리된(accepted/rejected) 신청은 재처리 불가
    if (matchRequest.status !== 'pending') {
      const err = new Error('이미 처리된 신청입니다.')
      err.status = 409
      throw err
    }

    const { fromTeamId, toTeamId } = matchRequest

    // 3. 신청을 받은 팀(toTeam)의 리더만 수락할 수 있음
    const toTeam = await tx.datingTeam.findUnique({ where: { teamId: toTeamId } })

    if (!toTeam) {
      const err = new Error('존재하지 않는 팀입니다.')
      err.status = 404
      throw err
    }

    if (toTeam.leaderId !== userId) {
      const err = new Error('해당 팀의 리더만 수락할 수 있습니다.')
      err.status = 403
      throw err
    }

    // 4. 이 신청을 accepted로 변경
    await tx.matchRequest.update({
      where: { requestId: parsedRequestId },
      data: { status: 'accepted' },
    })

    // 5. 반대 방향(toTeam -> fromTeam)으로 걸려있던 pending 신청이 있으면 취소 처리 (양방향 신청 정리)
    await tx.matchRequest.updateMany({
      where: { fromTeamId: toTeamId, toTeamId: fromTeamId, status: 'pending' },
      data: { status: 'rejected' },
    })

    // 6. 이번에 수락된 신청을 제외하고, 두 팀 중 하나라도 관련된 다른 pending 신청은 모두 정리한다
    //    (두 팀이 매칭 확정되면 각자 걸려있던 다른 신청은 더 이상 유효하지 않으므로 거절 처리)
    await tx.matchRequest.updateMany({
      where: {
        requestId: { not: parsedRequestId },
        status: 'pending',
        OR: [
          { fromTeamId: { in: [fromTeamId, toTeamId] } },
          { toTeamId: { in: [fromTeamId, toTeamId] } },
        ],
      },
      data: { status: 'rejected' },
    })

    // 7. 두 팀의 상태를 matched -> confirmed로 확정 (이성 매칭 후보 리스트에서 더 이상 노출되지 않도록)
    await tx.datingTeam.updateMany({
      where: { teamId: { in: [fromTeamId, toTeamId] }, status: 'matched' },
      data: { status: 'confirmed' },
    })

    // 8. 이 신청 하나당 그룹 채팅방 하나를 생성
    const chatRoom = await tx.teamMatchChatRoom.create({
      data: { matchRequestId: parsedRequestId },
    })

    // 9. 두 팀 전체 팀원을 채팅방 참여자로 등록 (lastReadAt은 아직 아무도 읽지 않았으므로 null)
    const teamMembers = await tx.datingTeamMember.findMany({
      where: { teamId: { in: [fromTeamId, toTeamId] } },
      select: { userId: true },
    })

    await tx.teamMatchChatRoomMember.createMany({
      data: teamMembers.map((member) => ({
        chatRoomId: chatRoom.id,
        userId: member.userId,
        lastReadAt: null,
      })),
    })

    return {
      requestId: parsedRequestId.toString(),
      status: 'accepted',
      chatRoomId: chatRoom.id.toString(),
      memberCount: teamMembers.length,
    }
  })
}

// 매칭 신청을 받은 팀의 리더가 신청을 거절한다.
// 이 신청을 rejected로 바꾸는 것과, 반대 방향(toTeam -> fromTeam)으로 걸려있던 pending 신청을
// 함께 rejected 처리하는 것을 하나의 prisma.$transaction으로 묶어 원자적으로 처리한다.
// (양쪽이 서로에게 신청을 보낸 상태에서 한쪽만 거절되고 반대 방향이 남아있으면,
//  그 반대 방향이 나중에 수락되어 이미 거절된 매칭이 성사되는 모순이 생기기 때문 —
//  acceptMatchRequest의 반대 방향 정리 로직과 동일한 이유, 동일한 방식)
// 검증 순서: 신청 존재 확인 -> 이미 처리된 신청인지 확인 -> 로그인 유저가 toTeam(신청받은 팀) 리더인지 확인
// (acceptMatchRequest와 동일한 검증 패턴)
export async function rejectMatchRequest(requestId, currentUserId) {
  let parsedRequestId
  try {
    parsedRequestId = BigInt(requestId)
  } catch {
    const err = new Error('유효하지 않은 신청 ID입니다.')
    err.status = 400
    throw err
  }

  const userId = BigInt(currentUserId)

  return prisma.$transaction(async (tx) => {
    // 1. 신청 존재 확인
    const matchRequest = await tx.matchRequest.findUnique({
      where: { requestId: parsedRequestId },
    })

    if (!matchRequest) {
      const err = new Error('존재하지 않는 신청입니다.')
      err.status = 404
      throw err
    }

    // 2. 이미 처리된(accepted/rejected) 신청은 재처리 불가
    if (matchRequest.status !== 'pending') {
      const err = new Error('이미 처리된 신청입니다.')
      err.status = 409
      throw err
    }

    const { fromTeamId, toTeamId } = matchRequest

    // 3. 신청을 받은 팀(toTeam)의 리더만 거절할 수 있음
    const toTeam = await tx.datingTeam.findUnique({ where: { teamId: toTeamId } })

    if (!toTeam) {
      const err = new Error('존재하지 않는 팀입니다.')
      err.status = 404
      throw err
    }

    if (toTeam.leaderId !== userId) {
      const err = new Error('해당 팀의 리더만 거절할 수 있습니다.')
      err.status = 403
      throw err
    }

    // 4. 이 신청을 rejected로 변경
    const updatedRequest = await tx.matchRequest.update({
      where: { requestId: parsedRequestId },
      data: { status: 'rejected' },
    })

    // 5. 반대 방향(toTeam -> fromTeam)으로 걸려있던 pending 신청이 있으면 함께 취소 처리
    //    (없으면 0건 업데이트로 조용히 지나간다 — 단방향 신청은 기존과 동일하게 동작)
    await tx.matchRequest.updateMany({
      where: { fromTeamId: toTeamId, toTeamId: fromTeamId, status: 'pending' },
      data: { status: 'rejected' },
    })

    return {
      requestId: updatedRequest.requestId.toString(),
      status: updatedRequest.status,
    }
  })
}
