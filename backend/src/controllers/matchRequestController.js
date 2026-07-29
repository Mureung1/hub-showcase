import {
  createMatchRequest,
  acceptMatchRequest,
  rejectMatchRequest,
} from '../services/matchRequestService.js'

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

// 신청을 받은 팀의 리더가 매칭 신청(requestId)을 수락한다.
// 성공 시 두 팀이 confirmed로 확정되고, 두 팀 전체 팀원이 들어간 그룹 채팅방이 생성된다.
export async function acceptRequest(req, res) {
  try {
    const { userId } = req.user
    const { requestId } = req.params

    const result = await acceptMatchRequest(requestId, userId)

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '매칭 신청 수락 중 오류가 발생했습니다.' })
  }
}

// 신청을 받은 팀의 리더가 매칭 신청(requestId)을 거절한다. 신청 status만 rejected로 바뀐다.
export async function rejectRequest(req, res) {
  try {
    const { userId } = req.user
    const { requestId } = req.params

    const result = await rejectMatchRequest(requestId, userId)

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '매칭 신청 거절 중 오류가 발생했습니다.' })
  }
}
