import { calculateAndSaveRoommateMatches } from '../services/roommateMatchingService.js'

const VALID_ROOMMATE_TYPES = ['friend', 'business']

// 룸메이트 매칭 계산 및 저장: 로그인한 유저 기준으로 하드필터 통과 후보들과의 점수를 계산해 matches에 저장하고 반환한다
export async function matchRoommate(req, res) {
  try {
    const userId = req.user.userId
    // 전달하지 않으면 기존과 동일하게 취미 필터 미적용(false)
    const applyHobbyFilter = req.body?.applyHobbyFilter === true
    // 전달하지 않으면 기존처럼 DB에 저장된 roommateType을 그대로 사용(undefined)
    const roommateTypeOverride = req.body?.roommateTypeOverride

    if (
      roommateTypeOverride !== undefined &&
      !VALID_ROOMMATE_TYPES.includes(roommateTypeOverride)
    ) {
      return res.status(400).json({ message: 'roommateTypeOverride 값이 올바르지 않습니다.' })
    }

    const result = await calculateAndSaveRoommateMatches(
      userId,
      applyHobbyFilter,
      roommateTypeOverride,
    )

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '룸메이트 매칭 처리 중 오류가 발생했습니다.' })
  }
}
