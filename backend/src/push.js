import webpush from 'web-push';
import { env } from './env.js';
import { getExpiryAlerts } from './store.js';

const enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (enabled) {
  webpush.setVapidDetails('mailto:admin@example.com', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

// 구독 정보(브라우저 PushSubscription)는 receipts/fridge와 같은 이유로 인메모리 — 서버 재시작하면
// 초기화되고, 사용자는 "알림 켜기"를 다시 누르면 된다(1인 데모 앱이라 DB 테이블까지는 과함).
const subscriptions = new Map(); // endpoint -> subscription

export function getVapidPublicKey() {
  return env.VAPID_PUBLIC_KEY || null;
}

export function addSubscription(subscription) {
  if (!subscription?.endpoint) throw Object.assign(new Error('subscription.endpoint가 필요해요.'), { status: 400 });
  subscriptions.set(subscription.endpoint, subscription);
}

export function removeSubscription(endpoint) {
  subscriptions.delete(endpoint);
}

// 같은 재료를 하루에 여러 번 알리지 않도록 "재료id-오늘날짜"를 봤는지만 기록한다.
// 서버 재시작 시 초기화되지만(=재알림 가능), 데모 앱이 재시작 사이 하루를 넘기는 일은 드물어 무방하다.
const sentToday = new Set();

// D-2 이하로 임박한 재료가 있으면 등록된 모든 구독자에게 웹 푸시를 보낸다.
// 실제 배포라면 매일 새벽 1회 cron으로 돌리겠지만, 이 앱은 데모용으로 계속 켜두는 서버가 아니라서
// server.js가 짧은 간격으로 이 함수를 반복 호출해도 sentToday가 중복 발송을 막아준다.
export async function checkAndSendExpiryPushes() {
  if (!enabled || subscriptions.size === 0) return;

  const { items } = await getExpiryAlerts();
  const todayKey = new Date().toISOString().slice(0, 10);
  const toNotify = items.filter((it) => !sentToday.has(`${it.id}-${todayKey}`));
  if (toNotify.length === 0) return;

  const payload = JSON.stringify({
    title: '🔔 유통기한 임박 재료가 있어요',
    body: toNotify.map((it) => `${it.emoji} ${it.name} (${it.expiry})`).join(', '),
  });

  for (const [endpoint, subscription] of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
    } catch (err) {
      // 410/404는 구독이 만료·해지된 것 — 더 이상 보낼 수 없으니 목록에서 정리
      if (err.statusCode === 410 || err.statusCode === 404) subscriptions.delete(endpoint);
    }
  }
  toNotify.forEach((it) => sentToday.add(`${it.id}-${todayKey}`));
}
