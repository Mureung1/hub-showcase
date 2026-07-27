import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging'

/*
 * firebase-admin 지연 초기화 (T-13).
 *
 * firebase-admin 13+ 는 ESM에서 서브패스 named export를 쓴다
 * (`import admin from 'firebase-admin'`의 default import는 credential 등이 undefined가 된다).
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
    const app =
      getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) })
    messaging = getAdminMessaging(app)
    console.log(`FCM 초기화 완료 (project: ${serviceAccount.project_id})`)
  } catch (err) {
    console.error('FCM 초기화 실패 — 푸시는 비활성됩니다:', err.message)
    messaging = null
  }
  return messaging
}
