import * as notificationRepo from '../repositories/notificationRepository.js'
import { sendToUsers } from './pushService.js'

/*
 * 알림 대상 판정 (T-11) — 기획서 §3.2의 핵심 로직.
 *
 *   발송 대상 = (관심 카테고리 매칭 OR 즐겨찾기 매장) AND 위치 조건 통과
 *
 * 위치 조건은 사용자별 설정을 따른다:
 *   - radius 모드: 기준 위치가 매장 반경 noti_radius_km 이내일 때만
 *   - always  모드: 거리와 무관하게 통과
 *
 * 판정 쿼리는 notificationRepository.findTargets 참고 (거리 계산은 T-06과 동일한 Haversine).
 */
export async function findNotificationTargets(dealId) {
  return notificationRepo.findTargets(dealId)
}

/*
 * 딜 등록 시 알림 — 인앱 알림 행을 남기고 FCM 푸시를 보낸다 (T-11 + T-13).
 *
 * 인앱 알림을 먼저 저장하는 이유: 푸시는 권한 거부·미지원·발송 실패로 못 받을 수 있으므로
 * 앱에서 확인 가능한 기록이 항상 남아야 한다(푸시는 부가, 인앱이 기준).
 * 호출부(딜 등록)의 응답을 막지 않도록 실패해도 예외를 삼키고 로그만 남긴다.
 */
export async function notifyDealCreated(deal, storeName) {
  try {
    const targets = await findNotificationTargets(deal.id)
    if (targets.length === 0) return { targetCount: 0 }

    const userIds = targets.map((t) => t.userId)
    const title = `${storeName} 마감 할인`
    const body = `${deal.name} ${deal.originalPrice.toLocaleString()}원 → ${deal.salePrice.toLocaleString()}원`

    await notificationRepo.insertMany({ userIds, dealId: deal.id, title, body })

    const push = await sendToUsers(userIds, { title, body, dealId: deal.id })
    console.log(
      `알림: 대상 ${targets.length}명, 푸시 ${push.skipped ? '비활성' : `${push.sent}건 발송`}`,
    )

    return { targetCount: targets.length, push }
  } catch (err) {
    console.error('알림 처리 실패 (딜 등록은 정상 처리됨):', err.message)
    return { targetCount: 0, failed: true }
  }
}

// 인앱 알림 목록
export async function listMyNotifications(userId) {
  return notificationRepo.listByUserId(userId)
}
