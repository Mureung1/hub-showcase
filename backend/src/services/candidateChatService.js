import { prisma } from '../config/prismaClient.js'

// 두 유저 사이의 채팅방을 생성하거나, 이미 있으면 기존 방을 반환한다.
// user1Id에는 항상 두 userId 중 작은 값을 저장한다
// (roommateMatchingService의 partyAId/partyBId 정렬 규칙과 동일한 패턴, 같은 두 유저 조합이 중복 저장되는 것을 방지)
export async function createOrGetChatRoom(requesterId, targetUserId) {
  const selfId = BigInt(requesterId)
  const targetId = BigInt(targetUserId)

  if (selfId === targetId) {
    const err = new Error('자기 자신과는 채팅방을 만들 수 없습니다.')
    err.status = 400
    throw err
  }

  const targetUser = await prisma.user.findUnique({ where: { userId: targetId } })

  if (!targetUser) {
    const err = new Error('존재하지 않는 유저입니다.')
    err.status = 404
    throw err
  }

  const [user1Id, user2Id] = selfId < targetId ? [selfId, targetId] : [targetId, selfId]

  const existingRoom = await prisma.candidateChatRoom.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  })

  if (existingRoom) {
    return { chatRoom: existingRoom, created: false }
  }

  const newRoom = await prisma.candidateChatRoom.create({
    data: { user1Id, user2Id },
  })

  return { chatRoom: newRoom, created: true }
}

// chatRoomId 채팅방을 조회하고, 요청자가 해당 채팅방의 참여자(user1Id/user2Id)인지 확인한다.
// 채팅방이 존재하지 않으면 404, 요청자가 참여자가 아니면 403을 던진다.
// createMessageInChatRoom / getMessagesInChatRoom이 공통으로 사용하는 검증 로직이다.
async function findChatRoomAndVerifyParticipant(chatRoomId, requesterId) {
  const roomId = BigInt(chatRoomId)
  const requesterUserId = BigInt(requesterId)

  const chatRoom = await prisma.candidateChatRoom.findUnique({ where: { id: roomId } })

  if (!chatRoom) {
    const err = new Error('존재하지 않는 채팅방입니다.')
    err.status = 404
    throw err
  }

  const isParticipant = chatRoom.user1Id === requesterUserId || chatRoom.user2Id === requesterUserId

  if (!isParticipant) {
    const err = new Error('해당 채팅방의 참여자가 아닙니다.')
    err.status = 403
    throw err
  }

  return chatRoom
}

// chatRoomId 채팅방에 메시지를 저장한다.
// 채팅방이 존재하지 않으면 404, 요청자가 해당 채팅방의 참여자(user1Id/user2Id)가 아니면 403을 던진다
export async function createMessageInChatRoom(chatRoomId, senderId, content) {
  const chatRoom = await findChatRoomAndVerifyParticipant(chatRoomId, senderId)

  return prisma.candidateChatMessage.create({
    data: {
      chatRoomId: chatRoom.id,
      senderId: BigInt(senderId),
      content,
    },
  })
}

// chatRoomId 채팅방의 메시지 전체를 오래된 것부터 최신순으로 조회한다.
// 채팅방이 존재하지 않으면 404, 요청자가 해당 채팅방의 참여자(user1Id/user2Id)가 아니면 403을 던진다
// 조회와 함께 요청자 본인 쪽의 lastReadAt을 현재 시각으로 갱신한다 (상대방 쪽은 건드리지 않음)
export async function getMessagesInChatRoom(chatRoomId, requesterId) {
  const chatRoom = await findChatRoomAndVerifyParticipant(chatRoomId, requesterId)
  const requesterUserId = BigInt(requesterId)

  const isUser1 = chatRoom.user1Id === requesterUserId

  await prisma.candidateChatRoom.update({
    where: { id: chatRoom.id },
    data: isUser1 ? { user1LastReadAt: new Date() } : { user2LastReadAt: new Date() },
  })

  return prisma.candidateChatMessage.findMany({
    where: { chatRoomId: chatRoom.id },
    orderBy: { createdAt: 'asc' },
  })
}
