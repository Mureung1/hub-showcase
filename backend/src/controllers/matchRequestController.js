import { createMatchRequest } from '../services/matchRequestService.js'

// 로그인한 유저의 팀이 상대 팀(toTeamId)에게 매칭 신청("관심 보내기")을 보낸다
export async function sendMatchRequest(req, res) {
  try {
    const { userId } = req.user
    const { toTeamId } = req.body

    if (toTeamId == null) {
      return res.status(400).json({ message: 'toTeamId가 필요합니다.' })
    }

    const result = await createMatchRequest(userId, toTeamId)

    return res.status(201).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '매칭 신청 중 오류가 발생했습니다.' })
  }
}
