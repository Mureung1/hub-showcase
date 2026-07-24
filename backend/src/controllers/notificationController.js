import { getNotificationSummary } from '../services/notificationService.js'

// 로그인한 유저의 알림 요약(안읽은 채팅 + 대기중인 팀 초대)을 반환한다
export async function getSummary(req, res) {
  try {
    const { userId } = req.user

    const summary = await getNotificationSummary(userId)

    return res.status(200).json(summary)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '알림 요약 조회 중 오류가 발생했습니다.' })
  }
}
