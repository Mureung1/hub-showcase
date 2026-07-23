import {
  createOrGetChatRoom,
  createMessageInChatRoom,
  getMessagesInChatRoom,
} from '../services/candidateChatService.js'

// 로그인한 유저와 상대 유저(targetUserId) 사이의 채팅방을 생성하거나, 이미 있으면 기존 방을 반환한다
export async function createChatRoom(req, res) {
  try {
    const { userId } = req.user
    const { targetUserId } = req.body

    if (!targetUserId || !/^\d+$/.test(String(targetUserId))) {
      return res.status(400).json({ message: '유효하지 않은 targetUserId입니다.' })
    }

    const { chatRoom, created } = await createOrGetChatRoom(userId, targetUserId)

    return res.status(created ? 201 : 200).json({
      chatRoomId: chatRoom.id.toString(),
      user1Id: chatRoom.user1Id.toString(),
      user2Id: chatRoom.user2Id.toString(),
      createdAt: chatRoom.createdAt,
    })
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '채팅방 생성 중 오류가 발생했습니다.' })
  }
}

// 채팅방(chatRoomId)에 메시지를 저장한다. 자유 텍스트이므로 내용 형식은 제한하지 않고, 빈 값/공백만 있는 경우만 막는다
export async function sendMessage(req, res) {
  try {
    const { userId } = req.user
    const { chatRoomId } = req.params
    const { content } = req.body

    if (!/^\d+$/.test(chatRoomId)) {
      return res.status(400).json({ message: '유효하지 않은 chatRoomId입니다.' })
    }

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: '메시지 내용을 입력해주세요.' })
    }

    const message = await createMessageInChatRoom(chatRoomId, userId, content)

    return res.status(201).json({
      messageId: message.id.toString(),
      chatRoomId: message.chatRoomId.toString(),
      senderId: message.senderId.toString(),
      content: message.content,
      createdAt: message.createdAt,
    })
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '메시지 전송 중 오류가 발생했습니다.' })
  }
}

// 채팅방(chatRoomId)의 메시지 전체를 오래된 것부터 최신순으로 반환한다
export async function getMessages(req, res) {
  try {
    const { userId } = req.user
    const { chatRoomId } = req.params

    if (!/^\d+$/.test(chatRoomId)) {
      return res.status(400).json({ message: '유효하지 않은 chatRoomId입니다.' })
    }

    const messages = await getMessagesInChatRoom(chatRoomId, userId)

    return res.status(200).json({
      messages: messages.map((message) => ({
        messageId: message.id.toString(),
        senderId: message.senderId.toString(),
        content: message.content,
        createdAt: message.createdAt,
      })),
    })
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '메시지 목록 조회 중 오류가 발생했습니다.' })
  }
}
