import { getMessaging } from '../lib/firebase.js'
import * as deviceTokenRepo from '../repositories/deviceTokenRepository.js'

// FCM이 "이 토큰은 더 이상 유효하지 않다"고 알려주는 코드들
const DEAD_TOKEN_CODES = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]

/*
 * 대상 사용자들의 기기로 푸시 발송 (T-13).
 * 푸시가 비활성(키 미설정)이거나 실패해도 호출부를 막지 않는다 — 인앱 알림이 폴백.
 */
export async function sendToUsers(userIds, { title, body, dealId }) {
  const messaging = getMessaging()
  if (!messaging) return { sent: 0, skipped: true }

  const tokens = await deviceTokenRepo.listTokensByUserIds(userIds)
  if (tokens.length === 0) return { sent: 0 }

  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    // 알림 클릭 시 어디로 보낼지 — 서비스 워커가 이 값을 읽는다
    data: { dealId: dealId == null ? '' : String(dealId), url: '/app' },
    webpush: {
      fcmOptions: { link: '/app' },
    },
  })

  // 무효 토큰은 즉시 정리해 다음 발송에서 빠지게 한다
  const dead = []
  res.responses.forEach((r, i) => {
    if (!r.success && DEAD_TOKEN_CODES.includes(r.error?.code)) dead.push(tokens[i])
  })
  if (dead.length > 0) await deviceTokenRepo.removeTokens(dead)

  return { sent: res.successCount, failed: res.failureCount, cleaned: dead.length }
}

export async function registerToken(userId, token) {
  await deviceTokenRepo.upsert(userId, token)
}
