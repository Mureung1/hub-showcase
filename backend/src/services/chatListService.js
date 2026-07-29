import { prisma } from '../config/prismaClient.js'

// messages를 chatRoomId 기준으로 묶어서 Map으로 만든다. (chatRoomId -> createdAt 오름차순 메시지 배열)
// 채팅방별로 별도 쿼리를 날리지 않기 위해, 여러 채팅방의 메시지를 한 번에 조회한 뒤 이 함수로 묶어 쓴다.
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

// createdAt 오름차순으로 정렬된 채팅방 메시지 배열에서, 마지막(최신) 메시지와
// "내가 보내지 않았고 + 내 lastReadAt 이후"인 메시지 개수(안읽음)를 계산한다.
// candidateChatService/teamMatchChatService 둘 다 같은 규칙(createdAt > lastReadAt)을 쓰므로 공통으로 뺐다.
function summarizeRoomMessages(roomMessages, currentUserId, myLastReadAt) {
  const lastMessage = roomMessages.length > 0 ? roomMessages[roomMessages.length - 1] : null

  const unreadCount = roomMessages.filter((message) => {
    if (message.senderId === currentUserId) return false
    return myLastReadAt ? message.createdAt > myLastReadAt : true
  }).length

  return { lastMessage, unreadCount }
}

// 로그인 유저가 참여 중인 CandidateChatRoom(1:1) 목록을 통합 목록 형태로 조회한다.
async function getCandidateChatList(userId) {
  const currentUserId = BigInt(userId)

  const rooms = await prisma.candidateChatRoom.findMany({
    where: { OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }] },
    include: {
      user1: { select: { nickname: true } },
      user2: { select: { nickname: true } },
    },
  })

  if (rooms.length === 0) return []

  const roomIds = rooms.map((room) => room.id)

  // 채팅방마다 따로 조회하지 않고, 해당 채팅방들의 메시지를 한 번에 조회한다 (N+1 방지)
  const messages = await prisma.candidateChatMessage.findMany({
    where: { chatRoomId: { in: roomIds } },
    orderBy: { createdAt: 'asc' },
    select: { chatRoomId: true, senderId: true, content: true, createdAt: true },
  })

  const messagesByRoomId = groupMessagesByChatRoomId(messages)

  return rooms.map((room) => {
    const isUser1 = room.user1Id === currentUserId
    const myLastReadAt = isUser1 ? room.user1LastReadAt : room.user2LastReadAt
    const partnerName = isUser1 ? room.user2.nickname : room.user1.nickname

    const roomMessages = messagesByRoomId.get(room.id.toString()) ?? []
    const { lastMessage, unreadCount } = summarizeRoomMessages(
      roomMessages,
      currentUserId,
      myLastReadAt,
    )

    return {
      chatRoomType: 'candidate',
      chatRoomId: room.id.toString(),
      partnerName,
      lastMessage: lastMessage?.content ?? null,
      unreadCount,
      updatedAt: lastMessage?.createdAt ?? room.createdAt,
    }
  })
}

// 로그인 유저가 참여 중인 TeamMatchChatRoom(그룹) 목록을 통합 목록 형태로 조회한다.
// partnerName은 "상대 팀 리더 닉네임"이므로, matchRequestId로 두 팀(fromTeamId/toTeamId)을 찾고
// 그중 내가 속하지 않은 쪽 팀의 리더를 조회해야 한다.
async function getTeamMatchChatList(userId) {
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
      orderBy: { createdAt: 'asc' },
      select: { chatRoomId: true, senderId: true, content: true, createdAt: true },
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

  return rooms.map((room) => {
    const myLastReadAt = lastReadAtByRoomId.get(room.id.toString())
    const partnerTeamId = partnerTeamIdByMatchRequestId.get(room.matchRequestId.toString())
    const partnerTeam = partnerTeamId ? partnerTeamById.get(partnerTeamId.toString()) : null

    const roomMessages = messagesByRoomId.get(room.id.toString()) ?? []
    const { lastMessage, unreadCount } = summarizeRoomMessages(
      roomMessages,
      currentUserId,
      myLastReadAt,
    )

    return {
      chatRoomType: 'teamMatch',
      chatRoomId: room.id.toString(),
      partnerName: partnerTeam?.leader?.nickname ?? null,
      lastMessage: lastMessage?.content ?? null,
      unreadCount,
      updatedAt: lastMessage?.createdAt ?? room.createdAt,
    }
  })
}

// 로그인 유저가 참여 중인 모든 채팅방(1:1 후보 채팅 + 그룹 팀 매칭 채팅)을 하나의 목록으로 합쳐서
// 최신 메시지(또는 방 생성) 시각 기준 내림차순으로 반환한다.
// 향후 룸메이트 채팅이 추가되면 getRoommateChatList 같은 함수를 하나 더 만들어 Promise.all에 추가하면 된다.
export async function getMyChatRoomList(userId) {
  const [candidateList, teamMatchList] = await Promise.all([
    getCandidateChatList(userId),
    getTeamMatchChatList(userId),
  ])

  return [...candidateList, ...teamMatchList].sort((a, b) => b.updatedAt - a.updatedAt)
}
