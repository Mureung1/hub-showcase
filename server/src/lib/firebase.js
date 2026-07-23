import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

/*
 * firebase-admin 지연 초기화 (T-13).
 *
 * 서비스 계정 키는 비밀이라 레포 밖에 두고 경로만 FIREBASE_SERVICE_ACCOUNT_PATH로 받는다.
 * 키가 없으면 푸시만 건너뛰고 서버·인앱 알림은 정상 동작한다
 * (팀원이 키 없이도 개발할 수 있어야 하므로 기동을 막지 않는다).
 */
let messaging = null
let initialized = false

export function getMessaging() {
  if (initialized) return messaging
  initialized = true

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!path) {
    console.warn(
      'FIREBASE_SERVICE_ACCOUNT_PATH 미설정 — FCM 푸시는 비활성, 인앱 알림만 동작합니다.',
    )
    return null
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(path, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    messaging = admin.messaging()
    console.log(`FCM 초기화 완료 (project: ${serviceAccount.project_id})`)
  } catch (err) {
    console.error('FCM 초기화 실패 — 푸시는 비활성됩니다:', err.message)
    messaging = null
  }
  return messaging
}
