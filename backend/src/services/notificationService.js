import { prisma } from '../config/prismaClient.js'
import { getReceivedTeamInvites } from './teamInviteService.js'
import { getReceivedMatchRequests } from './matchRequestService.js'

// 로그인 유저 기준으로 안읽은 메시지가 있는 채팅방 목록 + 대기중인 팀 초대 목록을 함께 조회한다.
// 헤더 알림 벨에서 사용할 데이터로, 안읽은 메시지가 1개 이상인 채팅방만 결과에 포함한다
export async function getNotificationSummary(userId) {
  const currentUserId = BigInt(userId)

  // 1. 내가 참여자인 모든 채팅방 조회 (상대방 닉네임을 함께 가져오기 위해 user1/user2 include)
  const chatRooms = await prisma.candidateChatRoom.findMany({
    where: {
      OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
    },
    include: {
      user1: { select: { nickname: true } },
      user2: { select: { nickname: true } },
    },
  })

  // 2. 채팅방마다 "내 lastReadAt 이후 + 상대방이 보낸" 메시지 개수를 센다
  const unreadChats = []

  for (const room of chatRooms) {
    const isUser1 = room.user1Id === currentUserId
    const myLastReadAt = isUser1 ? room.user1LastReadAt : room.user2LastReadAt
    const partnerId = isUser1 ? room.user2Id : room.user1Id
    const partnerNickname = isUser1 ? room.user2.nickname : room.user1.nickname

    const unreadCount = await prisma.candidateChatMessage.count({
      where: {
        chatRoomId: room.id,
        senderId: { not: currentUserId },
        // lastReadAt이 null이면 (한 번도 안 읽음) 상대방 메시지 전부를 안읽음으로 간주하므로 createdAt 조건을 아예 걸지 않는다
        ...(myLastReadAt ? { createdAt: { gt: myLastReadAt } } : {}),
      },
    })

    if (unreadCount > 0) {
      unreadChats.push({
        chatRoomId: room.id.toString(),
        partnerUserId: partnerId.toString(),
        partnerNickname,
        unreadCount,
      })
    }
  }

  // 3. 대기중인 팀 초대 목록은 기존 함수를 그대로 재사용
  const receivedInvites = await getReceivedTeamInvites(userId)

  const pendingInvites = receivedInvites.map((invite) => ({
    inviteId: invite.id.toString(),
    fromUserId: invite.fromUserId.toString(),
    fromUserNickname: invite.fromUser.nickname,
    createdAt: invite.createdAt,
  }))

  // 4. 내가 리더인 팀이 받은 대기중인 매칭 신청("관심 보내기") 목록도 기존 함수를 그대로 재사용
  const pendingMatchRequests = await getReceivedMatchRequests(userId)

  // 5. totalCount = 모든 안읽은 메시지 개수 합 + 대기 초대 개수 + 대기 매칭 신청 개수
  const unreadMessageTotal = unreadChats.reduce((sum, chat) => sum + chat.unreadCount, 0)
  const totalCount = unreadMessageTotal + pendingInvites.length + pendingMatchRequests.length

  return { totalCount, unreadChats, pendingInvites, pendingMatchRequests }
}
