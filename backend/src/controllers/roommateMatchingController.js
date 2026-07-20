import { calculateAndSaveRoommateMatches } from '../services/roommateMatchingService.js'

// 룸메이트 매칭 계산 및 저장: 로그인한 유저 기준으로 하드필터 통과 후보들과의 점수를 계산해 matches에 저장하고 반환한다
export async function matchRoommate(req, res) {
  try {
    const userId = req.user.userId

    const result = await calculateAndSaveRoommateMatches(userId)

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '룸메이트 매칭 처리 중 오류가 발생했습니다.' })
  }
}
