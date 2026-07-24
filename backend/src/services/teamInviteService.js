import { prisma } from '../config/prismaClient.js'

// inviteCode로 상대 유저를 찾아 teamId가 비어있는(null) pending 상태의 TeamInvite를 생성한다.
// 실제 팀 생성은 초대 수락 시점에 이루어지므로, 이 단계에서 teamId는 항상 null로 저장한다
export async function createTeamInvite(fromUserId, inviteCode) {
  const toUser = await prisma.user.findUnique({ where: { inviteCode } })

  if (!toUser) {
    const err = new Error('존재하지 않는 코드입니다.')
    err.status = 404
    throw err
  }

  const fromId = BigInt(fromUserId)

  if (toUser.userId === fromId) {
    const err = new Error('자기 자신을 초대할 수 없습니다.')
    err.status = 400
    throw err
  }

  const existingInvite = await prisma.teamInvite.findFirst({
    where: {
      fromUserId: fromId,
      toUserId: toUser.userId,
      status: 'pending',
    },
  })

  if (existingInvite) {
    const err = new Error('이미 초대를 보냈습니다.')
    err.status = 409
    throw err
  }

  return prisma.teamInvite.create({
    data: {
      fromUserId: fromId,
      toUserId: toUser.userId,
      teamId: null,
      status: 'pending',
    },
  })
}

// 로그인한 유저(toUserId)가 받은, 아직 응답하지 않은(pending) 초대 목록을 최신순으로 조회한다.
// 헤더 알림 벨에서 "OO님이 초대했어요"를 보여줄 수 있도록 보낸 사람의 닉네임을 함께 반환한다
export async function getReceivedTeamInvites(toUserId) {
  return prisma.teamInvite.findMany({
    where: {
      toUserId: BigInt(toUserId),
      status: 'pending',
    },
    include: {
      fromUser: {
        select: { nickname: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// 초대 수락/거절 처리. action='reject'면 상태만 변경, action='accept'면 팀 생성/합류까지 원자적으로 처리한다
export async function respondToTeamInvite(inviteId, currentUserId, action) {
  if (action !== 'accept' && action !== 'reject') {
    const err = new Error("action은 'accept' 또는 'reject'만 가능합니다.")
    err.status = 400
    throw err
  }

  let parsedInviteId
  try {
    parsedInviteId = BigInt(inviteId)
  } catch {
    const err = new Error('유효하지 않은 초대 ID입니다.')
    err.status = 400
    throw err
  }

  const userId = BigInt(currentUserId)

  return prisma.$transaction(async (tx) => {
    // 초대 조회
    const invite = await tx.teamInvite.findUnique({ where: { id: parsedInviteId } })
    if (!invite) {
      const err = new Error('존재하지 않는 초대입니다.')
      err.status = 404
      throw err
    }

    // 본인 확인: 로그인 유저가 이 초대의 수신자인지 확인
    if (invite.toUserId !== userId) {
      const err = new Error('본인에게 온 초대만 처리할 수 있습니다.')
      err.status = 403
      throw err
    }

    // 상태 확인: 이미 처리된 초대는 재처리 불가
    if (invite.status !== 'pending') {
      const err = new Error('이미 처리된 초대입니다.')
      err.status = 409
      throw err
    }

    if (action === 'reject') {
      const updated = await tx.teamInvite.update({
        where: { id: parsedInviteId },
        data: { status: 'rejected' },
      })

      return {
        inviteId: updated.id.toString(),
        status: updated.status,
        teamId: updated.teamId ? updated.teamId.toString() : null,
      }
    }

    // ===== 여기부터 action === 'accept' =====
    const fromUserId = invite.fromUserId

    const [fromUser, toUser] = await Promise.all([
      tx.user.findUnique({ where: { userId: fromUserId } }),
      tx.user.findUnique({ where: { userId } }),
    ])

    // fromUser 팀사이즈 확인: 초대한 사람이 인원을 아직 선택하지 않았으면 팀을 만들 수 없음
    if (fromUser.preferredTeamSize == null) {
      const err = new Error('초대한 사람이 아직 인원을 선택하지 않았습니다.')
      err.status = 400
      throw err
    }

    // fromUser가 리더인 recruiting 팀 조회 (재사용/합류 대상 판단용, 없으면 새로 생성)
    const fromLedTeam = await tx.datingTeam.findFirst({
      where: { leaderId: fromUserId, status: 'recruiting' },
      include: { members: true },
    })

    // fromUser소속확인: 리더가 아닌 일반 멤버로 다른 recruiting 팀에 속해 있으면 차단
    const fromMemberships = await tx.datingTeamMember.findMany({
      where: { userId: fromUserId },
      include: { team: true },
    })
    const fromIsOtherTeamMember = fromMemberships.some(
      (m) => m.team.status === 'recruiting' && m.team.leaderId !== fromUserId
    )
    if (fromIsOtherTeamMember) {
      const err = new Error('초대한 사람이 이미 다른 팀에 소속되어 있습니다.')
      err.status = 400
      throw err
    }

    // toUser소속확인(리더): 이미 다른 recruiting 팀의 리더면서 멤버가 2명 이상이면 차단.
    // 멤버가 본인 혼자뿐인 빈 팀이면 이번 수락이 끝난 뒤 closed 처리한다
    const toLedTeam = await tx.datingTeam.findFirst({
      where: { leaderId: userId, status: 'recruiting' },
      include: { members: true },
    })

    let toUserEmptyTeamId = null
    if (toLedTeam) {
      if (toLedTeam.members.length >= 2) {
        const err = new Error('이미 다른 팀을 모으고 있습니다.')
        err.status = 400
        throw err
      }
      toUserEmptyTeamId = toLedTeam.teamId
    }

    // toUser소속확인(멤버): 리더가 아닌 일반 멤버로 다른 recruiting 팀에 속해 있으면 차단
    const toMemberships = await tx.datingTeamMember.findMany({
      where: { userId },
      include: { team: true },
    })
    const toIsOtherTeamMember = toMemberships.some(
      (m) => m.team.status === 'recruiting' && m.team.leaderId !== userId
    )
    if (toIsOtherTeamMember) {
      const err = new Error('이미 다른 팀에 소속되어 있습니다.')
      err.status = 400
      throw err
    }

    // 성별확인: 과팅 팀은 동일 성별로 구성
    if (fromUser.gender !== toUser.gender) {
      const err = new Error('초대한 사람과 성별이 달라 팀을 구성할 수 없습니다.')
      err.status = 400
      throw err
    }

    // 정원확인: 신규 생성 시에도 리더 본인이 1자리를 차지하므로 1로 계산한다
    const currentMemberCount = fromLedTeam ? fromLedTeam.members.length : 1
    if (currentMemberCount + 1 > fromUser.preferredTeamSize) {
      const err = new Error('팀 정원이 초과되었습니다.')
      err.status = 400
      throw err
    }

    // 대상 팀 확정: 기존 팀이 없으면 새로 생성하고 리더도 멤버로 등록한다
    let targetTeamId
    if (fromLedTeam) {
      targetTeamId = fromLedTeam.teamId
    } else {
      const newTeam = await tx.datingTeam.create({
        data: {
          leaderId: fromUserId,
          gender: fromUser.gender,
          teamSize: fromUser.preferredTeamSize,
          status: 'recruiting',
        },
      })
      targetTeamId = newTeam.teamId

      await tx.datingTeamMember.create({
        data: { teamId: targetTeamId, userId: fromUserId },
      })
    }

    // toUser를 대상 팀의 멤버로 추가
    await tx.datingTeamMember.create({
      data: { teamId: targetTeamId, userId },
    })

    // 초대 상태 확정
    const updatedInvite = await tx.teamInvite.update({
      where: { id: parsedInviteId },
      data: { status: 'accepted', teamId: targetTeamId },
    })

    // toUser가 갖고 있던 빈 팀은 더 이상 필요 없으므로 closed 처리
    if (toUserEmptyTeamId) {
      await tx.datingTeam.update({
        where: { teamId: toUserEmptyTeamId },
        data: { status: 'closed' },
      })
    }

    return {
      inviteId: updatedInvite.id.toString(),
      status: updatedInvite.status,
      teamId: targetTeamId.toString(),
    }
  })
}
