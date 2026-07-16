import { tokenManager } from './apiClient'

/**
 * Service Worker 등록 및 푸시 구독 관리
 */

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('이 브라우저는 Service Worker를 지원하지 않습니다')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    })
    console.log('✅ Service Worker 등록 완료:', registration)
    return true
  } catch (error) {
    console.error('❌ Service Worker 등록 실패:', error)
    return false
  }
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('이 브라우저는 푸시 알림을 지원하지 않습니다')
    return false
  }

  try {
    // 1. Service Worker 등록
    const registration = await navigator.serviceWorker.ready
    console.log('📱 Service Worker 준비됨:', registration)

    // 2. VAPID 공개 키 가져오기 (환경 변수에서)
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
    if (!vapidPublicKey) {
      console.error('❌ VAPID 공개 키가 없습니다')
      return false
    }

    // 3. 기존 구독 확인
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // 4. 새로운 구독 생성
      console.log('🔔 새로운 푸시 구독 생성 중...')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      console.log('✅ 푸시 구독 생성 완료:', subscription)
    } else {
      console.log('✅ 기존 구독 사용:', subscription)
    }

    // 5. 서버에 구독 정보 저장
    await saveSubscriptionToServer(subscription)

    return true
  } catch (error) {
    console.error('❌ 푸시 구독 실패:', error)
    return false
  }
}

async function saveSubscriptionToServer(subscription: PushSubscription) {
  try {
    const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000/api'
    const accessToken = tokenManager.getAccessToken()
    const userAgent = navigator.userAgent

    const response = await fetch(`${API_BASE}/scraps/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent,
      }),
    })

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ 푸시 구독이 서버에 저장되었습니다:', data)
  } catch (error) {
    console.error('❌ 서버에 구독 저장 실패:', error)
    throw error
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('이 브라우저는 Notification API를 지원하지 않습니다')
    return false
  }

  if (Notification.permission === 'granted') {
    console.log('✅ 알림 권한이 이미 허용되었습니다')
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      console.log('✅ 알림 권한이 허용되었습니다')
      return true
    }
  }

  console.warn('⚠️ 알림 권한이 거부되었습니다')
  return false
}

export async function initializePushNotifications() {
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) {
    console.warn('알림 권한이 없어 푸시 알림을 설정할 수 없습니다')
    return false
  }

  const registered = await registerServiceWorker()
  if (!registered) {
    console.warn('Service Worker 등록 실패')
    return false
  }

  const subscribed = await subscribeToPushNotifications()
  if (!subscribed) {
    console.warn('푸시 알림 구독 실패')
    return false
  }

  console.log('✅ 푸시 알림이 모두 설정되었습니다')
  return true
}
