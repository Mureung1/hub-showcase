import { prisma } from '../config/prismaClient.js'

// chatRoomId 채팅방을 조회하고, 요청자가 해당 채팅방의 참여자(TeamMatchChatRoomMember)인지 확인한다.
// 채팅방이 존재하지 않으면 404, 요청자가 참여자가 아니면 403을 던진다.
// createMessageInChatRoom / getMessagesInChatRoom이 공통으로 사용하는 검증 로직이다.
async function findChatRoomAndVerifyParticipant(chatRoomId, requesterId) {
  const roomId = BigInt(chatRoomId)
  const requesterUserId = BigInt(requesterId)

  const chatRoom = await prisma.teamMatchChatRoom.findUnique({ where: { id: roomId } })

  if (!chatRoom) {
    const err = new Error('존재하지 않는 채팅방입니다.')
    err.status = 404
    throw err
  }

  const member = await prisma.teamMatchChatRoomMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId: roomId, userId: requesterUserId } },
  })

  if (!member) {
    const err = new Error('참여 중인 채팅방이 아닙니다.')
    err.status = 403
    throw err
  }

  return { chatRoom, member }
}

// chatRoomId 채팅방에 메시지를 저장한다.
// 채팅방이 존재하지 않으면 404, 요청자가 해당 채팅방의 참여자가 아니면 403을 던진다
export async function createMessageInChatRoom(chatRoomId, senderId, content) {
  const { chatRoom } = await findChatRoomAndVerifyParticipant(chatRoomId, senderId)

  return prisma.teamMatchChatMessage.create({
    data: {
      chatRoomId: chatRoom.id,
      senderId: BigInt(senderId),
      content,
    },
  })
}

// chatRoomId 채팅방의 메시지 전체를 오래된 것부터 최신순으로 조회한다.
// 채팅방이 존재하지 않으면 404, 요청자가 해당 채팅방의 참여자가 아니면 403을 던진다
// 조회와 함께 요청자 본인의 TeamMatchChatRoomMember.lastReadAt을 현재 시각으로 갱신한다
// TeamMatchChatMessage에는 User와의 relation이 없어(스키마 주석 참고) include를 쓸 수 없으므로,
// 메시지에 등장하는 발신자(senderId)들의 닉네임을 한 번에 조회해서 붙여준다 (메시지마다 따로 조회하지 않음 -> N+1 방지)
export async function getMessagesInChatRoom(chatRoomId, requesterId) {
  const { chatRoom, member } = await findChatRoomAndVerifyParticipant(chatRoomId, requesterId)

  await prisma.teamMatchChatRoomMember.update({
    where: { id: member.id },
    data: { lastReadAt: new Date() },
  })

  const messages = await prisma.teamMatchChatMessage.findMany({
    where: { chatRoomId: chatRoom.id },
    orderBy: { createdAt: 'asc' },
  })

  if (messages.length === 0) return messages

  const senderIds = [...new Set(messages.map((message) => message.senderId))]

  const senders = await prisma.user.findMany({
    where: { userId: { in: senderIds } },
    select: { userId: true, nickname: true },
  })

  const nicknameBySenderId = new Map(senders.map((sender) => [sender.userId.toString(), sender.nickname]))

  return messages.map((message) => ({
    ...message,
    senderNickname: nicknameBySenderId.get(message.senderId.toString()) ?? null,
  }))
}
