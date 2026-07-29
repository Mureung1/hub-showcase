import {
  createMessageInChatRoom,
  getMessagesInChatRoom,
} from '../services/teamMatchChatService.js'

// 채팅방(chatRoomId)에 메시지를 저장한다. 빈 값/공백만 있는 경우는 막는다
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

// 채팅방(chatRoomId)의 메시지 전체를 오래된 것부터 최신순으로 반환하고, 조회한 유저의 lastReadAt을 갱신한다
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
        senderNickname: message.senderNickname,
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
