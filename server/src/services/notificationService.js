import * as notificationRepo from '../repositories/notificationRepository.js'

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
 * 딜 등록 시 알림 생성 — 인앱 알림 행을 남긴다.
 * FCM 푸시 발송은 T-13에서 이 함수 뒤에 붙인다.
 * 호출부(딜 등록)의 응답을 막지 않도록 실패해도 예외를 삼키고 로그만 남긴다.
 */
export async function notifyDealCreated(deal, storeName) {
  try {
    const targets = await findNotificationTargets(deal.id)
    if (targets.length === 0) return { targetCount: 0 }

    await notificationRepo.insertMany({
      userIds: targets.map((t) => t.userId),
      dealId: deal.id,
      title: `${storeName} 마감 할인`,
      body: `${deal.name} ${deal.originalPrice.toLocaleString()}원 → ${deal.salePrice.toLocaleString()}원`,
    })

    // TODO(T-13): 여기서 device_tokens를 조회해 FCM 푸시 발송
    return { targetCount: targets.length }
  } catch (err) {
    console.error('알림 생성 실패 (딜 등록은 정상 처리됨):', err.message)
    return { targetCount: 0, failed: true }
  }
}

// 인앱 알림 목록
export async function listMyNotifications(userId) {
  return notificationRepo.listByUserId(userId)
}
