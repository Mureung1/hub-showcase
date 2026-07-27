import { getMessaging } from '../lib/firebase.js'
import * as deviceTokenRepo from '../repositories/deviceTokenRepository.js'

// FCM이 "이 토큰은 더 이상 유효하지 않다"고 알려주는 코드들
const DEAD_TOKEN_CODES = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]

/*
 * 정리해야 할 죽은 토큰인지 판정.
 *
 * messaging/invalid-argument는 토큰이 아니라 페이로드가 잘못됐을 때도 나온다.
 * 코드만 보고 지우면 발송 코드 버그 하나로 전체 기기 토큰이 삭제될 수 있어,
 * 메시지가 토큰을 지목할 때만 정리한다(애매하면 남겨두는 쪽이 안전).
 */
function isDeadToken(error) {
  if (!error) return false
  if (DEAD_TOKEN_CODES.includes(error.code)) return true
  return (
    error.code === 'messaging/invalid-argument' && /registration token/i.test(error.message ?? '')
  )
}

/*
 * 대상 사용자들의 기기로 푸시 발송 (T-13).
 * 푸시가 비활성(키 미설정)이거나 실패해도 호출부를 막지 않는다 — 인앱 알림이 폴백.
 *
 * link: 알림 클릭 시 이동할 경로. 소비자는 /app, 사장님은 /owner (T-17).
 */
export async function sendToUsers(userIds, { title, body, dealId, link = '/app' }) {
  const messaging = getMessaging()
  if (!messaging) return { sent: 0, skipped: true }

  const tokens = await deviceTokenRepo.listTokensByUserIds(userIds)
  if (tokens.length === 0) return { sent: 0 }

  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    // 알림 클릭 시 어디로 보낼지 — 서비스 워커가 이 값을 읽는다
    data: { dealId: dealId == null ? '' : String(dealId), url: link },
    webpush: {
      fcmOptions: { link },
    },
  })

  // 무효 토큰은 즉시 정리해 다음 발송에서 빠지게 한다
  const dead = []
  res.responses.forEach((r, i) => {
    if (!r.success && isDeadToken(r.error)) dead.push(tokens[i])
  })
  if (dead.length > 0) await deviceTokenRepo.removeTokens(dead)

  return { sent: res.successCount, failed: res.failureCount, cleaned: dead.length }
}

export async function registerToken(userId, token) {
  await deviceTokenRepo.upsert(userId, token)
}
