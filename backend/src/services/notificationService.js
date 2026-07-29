import { prisma } from '../config/prismaClient.js'
import { getReceivedTeamInvites } from './teamInviteService.js'
import { getReceivedMatchRequests } from './matchRequestService.js'

// messages를 chatRoomId 기준으로 묶어서 Map으로 만든다. (chatRoomId -> 메시지 배열)
// chatListService.js의 groupMessagesByChatRoomId와 동일한 패턴이다.
// (chatListService.js는 이번 작업에서 건드리지 않기로 해서, export되어 있지 않은 이 함수를
//  가져다 쓸 수 없어 동일한 계산 방식을 이 파일 안에 그대로 다시 작성했다.)
function groupMessagesByChatRoomId(messages) {
  const messagesByRoomId = new Map()

  for (const message of messages) {
    const key = message.chatRoomId.toString()
    if (!messagesByRoomId.has(key)) {
      messagesByRoomId.set(key, [])
    }
    messagesByRoomId.get(key).push(message)
  }

  return messagesByRoomId
}

// 로그인 유저가 참여 중인 TeamMatchChatRoom(그룹 채팅) 중, 안읽은 메시지가 1개 이상인 방만 계산해서 반환한다.
// CandidateChatRoom과 동일한 규칙(본인이 보낸 메시지 제외 + lastReadAt 이후)으로 안읽음을 센다.
// chatListService.js의 getTeamMatchChatList와 동일한 조회 패턴(멤버십 -> 방+메시지 -> 매칭 신청 -> 상대 팀 리더)을
// 쓰되, 여기서는 "안읽은 방 + 개수"만 필요해서 lastMessage 계산은 하지 않는다.
// 방/메시지/매칭신청/상대팀을 각각 한 번씩만 조회해서 N+1을 피한다.
async function getUnreadTeamMatchChats(userId) {
  const currentUserId = BigInt(userId)

  const myMemberships = await prisma.teamMatchChatRoomMember.findMany({
    where: { userId: currentUserId },
    select: { chatRoomId: true, lastReadAt: true },
  })

  if (myMemberships.length === 0) return []

  const roomIds = myMemberships.map((member) => member.chatRoomId)
  const lastReadAtByRoomId = new Map(
    myMemberships.map((member) => [member.chatRoomId.toString(), member.lastReadAt]),
  )

  const [rooms, messages] = await Promise.all([
    prisma.teamMatchChatRoom.findMany({ where: { id: { in: roomIds } } }),
    prisma.teamMatchChatMessage.findMany({
      where: { chatRoomId: { in: roomIds } },
      select: { chatRoomId: true, senderId: true, createdAt: true },
    }),
  ])

  const matchRequestIds = rooms.map((room) => room.matchRequestId)

  const matchRequests = await prisma.matchRequest.findMany({
    where: { requestId: { in: matchRequestIds } },
    select: { requestId: true, fromTeamId: true, toTeamId: true },
  })

  const allTeamIds = matchRequests.flatMap((request) => [request.fromTeamId, request.toTeamId])

  // 이 매칭 신청들에 얽힌 팀들 중, 로그인 유저가 실제로 속한 팀만 골라둔다 -> 반대쪽이 상대 팀
  const myTeamMemberships = await prisma.datingTeamMember.findMany({
    where: { userId: currentUserId, teamId: { in: allTeamIds } },
    select: { teamId: true },
  })
  const myTeamIdSet = new Set(myTeamMemberships.map((member) => member.teamId.toString()))

  // matchRequestId -> 상대 팀 teamId
  const partnerTeamIdByMatchRequestId = new Map()
  for (const request of matchRequests) {
    const partnerTeamId = myTeamIdSet.has(request.fromTeamId.toString())
      ? request.toTeamId
      : request.fromTeamId
    partnerTeamIdByMatchRequestId.set(request.requestId.toString(), partnerTeamId)
  }

  const partnerTeamIds = [...new Set(partnerTeamIdByMatchRequestId.values())]

  const partnerTeams = await prisma.datingTeam.findMany({
    where: { teamId: { in: partnerTeamIds } },
    include: { leader: { select: { nickname: true } } },
  })
  const partnerTeamById = new Map(partnerTeams.map((team) => [team.teamId.toString(), team]))

  const messagesByRoomId = groupMessagesByChatRoomId(messages)

  const unreadTeamMatchChats = []

  for (const room of rooms) {
    const myLastReadAt = lastReadAtByRoomId.get(room.id.toString())
    const roomMessages = messagesByRoomId.get(room.id.toString()) ?? []

    const unreadCount = roomMessages.filter((message) => {
      if (message.senderId === currentUserId) return false
      return myLastReadAt ? message.createdAt > myLastReadAt : true
    }).length

    if (unreadCount === 0) continue

    const partnerTeamId = partnerTeamIdByMatchRequestId.get(room.matchRequestId.toString())
    const partnerTeam = partnerTeamId ? partnerTeamById.get(partnerTeamId.toString()) : null

    unreadTeamMatchChats.push({
      chatRoomType: 'teamMatch',
      chatRoomId: room.id.toString(),
      partnerNickname: partnerTeam?.leader?.nickname ?? null,
      unreadCount,
    })
  }

  return unreadTeamMatchChats
}

// 로그인 유저 기준으로 안읽은 메시지가 있는 채팅방 목록(1:1 후보 채팅 + 그룹 팀 매칭 채팅) + 대기중인 팀 초대 목록을 함께 조회한다.
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
        chatRoomType: 'candidate',
        chatRoomId: room.id.toString(),
        partnerUserId: partnerId.toString(),
        partnerNickname,
        unreadCount,
      })
    }
  }

  // 2-1. TeamMatchChatRoom(그룹 채팅) 안읽음도 같은 unreadChats 배열에 합친다 (chatRoomType으로 구분)
  const unreadTeamMatchChats = await getUnreadTeamMatchChats(userId)
  unreadChats.push(...unreadTeamMatchChats)

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
