import { getUserProfileById, getInviteCodeByUserId } from '../services/userProfileService.js'

// 유저 프로필 조회: 닉네임 + 소프트필터(손님방문정책, 온도선호)만 반환한다
export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ message: '유효하지 않은 userId입니다.' })
    }

    const profile = await getUserProfileById(userId)

    return res.status(200).json(profile)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '유저 프로필 조회 중 오류가 발생했습니다.' })
  }
}

// 로그인한 본인의 초대 코드 조회 (JWT의 userId만 사용, 다른 유저 코드는 조회 불가)
export async function getMyInviteCode(req, res) {
  try {
    const { userId } = req.user

    const inviteCode = await getInviteCodeByUserId(userId)

    return res.status(200).json({ inviteCode })
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '초대 코드 조회 중 오류가 발생했습니다.' })
  }
}
