import { getMyChatRoomList } from '../services/chatListService.js'

// 로그인 유저가 참여 중인 모든 채팅방(1:1 후보 채팅 + 그룹 팀 매칭 채팅)을 최신순으로 반환한다
export async function getMyChatRooms(req, res) {
  try {
    const { userId } = req.user
    const chatRooms = await getMyChatRoomList(userId)

    return res.status(200).json(chatRooms)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '채팅방 목록 조회 중 오류가 발생했습니다.' })
  }
}
