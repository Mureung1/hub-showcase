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
