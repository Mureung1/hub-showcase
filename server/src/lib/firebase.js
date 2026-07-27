import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging'

/*
 * firebase-admin 지연 초기화 (T-13).
 *
 * firebase-admin 13+ 는 ESM에서 서브패스 named export를 쓴다
 * (`import admin from 'firebase-admin'`의 default import는 credential 등이 undefined가 된다).
 *
 * 서비스 계정 키는 비밀이라 레포에 넣지 않고 두 가지 경로로 받는다.
 *   - FIREBASE_SERVICE_ACCOUNT_JSON: 키 JSON 내용 그대로 (배포용 — Render 등은 파일을 두기 번거롭다)
 *   - FIREBASE_SERVICE_ACCOUNT_PATH: 레포 밖 파일 경로 (로컬 개발용)
 * 둘 다 있으면 JSON을 우선한다.
 *
 * 키가 없으면 푸시만 건너뛰고 서버·인앱 알림은 정상 동작한다
 * (팀원이 키 없이도 개발할 수 있어야 하므로 기동을 막지 않는다).
 */
let messaging = null
let initialized = false

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (raw) {
    // 대시보드에서 값을 따옴표로 감싸 넣는 실수가 잦다. 양끝이 짝을 이룰 때만 벗긴다
    // (한쪽만 확인하면 정상 JSON의 마지막 문자를 잘라먹는다).
    const quoted =
      (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    return JSON.parse(quoted ? raw.slice(1, -1) : raw)
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!path) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function getMessaging() {
  if (initialized) return messaging
  initialized = true

  try {
    const serviceAccount = readServiceAccount()
    if (!serviceAccount) {
      console.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON/PATH 미설정 — FCM 푸시는 비활성, 인앱 알림만 동작합니다.',
      )
      return null
    }
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
