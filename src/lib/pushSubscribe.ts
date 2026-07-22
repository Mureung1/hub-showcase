// #42: 알림 권한 허용 후 pushManager.subscribe()로 구독 객체를 만들어
// POST /api/push-subscriptions(#32)로 전송한다.
import { apiFetch } from "./api.js";

// Push API의 applicationServerKey는 Uint8Array를 요구하지만 VAPID public key는
// base64url 문자열로 발급된다(#31) — 표준 변환 방식(MDN 예시와 동일한 패딩 규칙).
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // TS5.7+에서 `new Uint8Array(length)`가 Uint8Array<ArrayBufferLike>로 추론돼
  // pushManager.subscribe()의 BufferSource(ArrayBuffer 한정) 타입과 안 맞는다 —
  // ArrayBuffer를 명시로 넘겨 Uint8Array<ArrayBuffer>로 고정한다.
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 구독 생성 자체가 브라우저 Push API에 강하게 의존해 Vitest로 신뢰성 있게 검증하기
// 어렵다 — 실제 동작 확인은 Playwright로 한다(계획 단계 판단, docs 미작성).
export async function subscribeToPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(
    import.meta.env.VITE_VAPID_PUBLIC_KEY,
  );

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  const { endpoint, keys } = subscription.toJSON();

  await apiFetch("/api/push-subscriptions", {
    method: "POST",
    body: JSON.stringify({ endpoint, keys }),
  });
}
