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
