import { getTestStatusByUserId } from '../services/testStatusService.js'

// 로그인한 유저의 취미/생활성향/이상형 테스트 완료 여부 조회
export async function getTestStatus(req, res) {
  try {
    const { userId } = req.user

    const status = await getTestStatusByUserId(userId)

    return res.status(200).json(status)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '테스트 완료 여부 조회 중 오류가 발생했습니다.' })
  }
}
