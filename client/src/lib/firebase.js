import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import api from '../api/client.js'

/*
 * Firebase 웹 푸시 (T-13).
 *
 * 아래 설정값과 VAPID 공개키는 브라우저 번들에 그대로 실리는 공개 값이라 하드코딩한다.
 * (비밀은 서버의 서비스 계정 키뿐 — server/.env의 FIREBASE_SERVICE_ACCOUNT_PATH)
 *
 * 주의: public/firebase-messaging-sw.js에도 같은 설정이 들어간다.
 * 서비스 워커는 번들러를 거치지 않는 정적 파일이라 값을 공유할 수 없다 — 바꾸면 양쪽 모두 수정할 것.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyB5qJSzp1BQbeqnbJE3ejCV_bqXknfWrEM',
  authDomain: 'aac-alarm.firebaseapp.com',
  projectId: 'aac-alarm',
  storageBucket: 'aac-alarm.firebasestorage.app',
  messagingSenderId: '680559797098',
  appId: '1:680559797098:web:82f9a2028b149a6841fb13',
}

const VAPID_KEY =
  'BLtfkx5E-n7RwI3vZTzIfM5KvfMphyec7SjbE7MvnaYgjAkPaz-tITi8slxEbdoOuLDUAAYCst1cKOmetB45INM'

const app = initializeApp(firebaseConfig)
let messagingPromise = null

// 브라우저가 웹 푸시를 지원할 때만 messaging 인스턴스를 만든다 (Safari 일부·구형 브라우저 대비)
async function getMessagingIfSupported() {
  if (!messagingPromise) {
    messagingPromise = isSupported().then((ok) => (ok ? getMessaging(app) : null))
  }
  return messagingPromise
}

export async function isPushSupported() {
  return Boolean(await getMessagingIfSupported())
}

export function getPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

// 토큰을 발급받아 서버에 등록한다 (권한이 granted인 상태에서만 호출)
async function issueAndRegister(messaging) {
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!token) return { ok: false, reason: 'no-token' }

  await api.post('/device-tokens', { token })
  return { ok: true, token }
}

/*
 * 알림 권한을 요청하고 발급받은 토큰을 서버에 등록한다.
 * 사용자가 명시적으로 버튼을 눌렀을 때만 호출한다 — 자동 요청은 브라우저가 차단·감점한다.
 */
export async function enablePush() {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: permission }

  return issueAndRegister(messaging)
}

/*
 * 권한이 이미 granted인데도 서버에 토큰이 없을 수 있다(재시딩·다른 기기·최초 등록 실패).
 * 화면 진입 시 조용히 재동기화한다 — 권한을 새로 요청하지 않으므로 팝업이 뜨지 않는다.
 * "권한 허용 = 등록 완료"라는 착각을 막는 안전장치.
 */
export async function syncTokenIfGranted() {
  if (getPermission() !== 'granted') return { ok: false, reason: 'not-granted' }
  const messaging = await getMessagingIfSupported()
  if (!messaging) return { ok: false, reason: 'unsupported' }
  try {
    return await issueAndRegister(messaging)
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// 앱이 열려 있을 때(포그라운드) 수신 — 브라우저가 알림을 띄우지 않으므로 인앱으로 보여준다
export async function onForegroundMessage(handler) {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return () => {}
  return onMessage(messaging, handler)
}
