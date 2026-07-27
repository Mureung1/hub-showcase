import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import Row from '../components/Row';

// VAPID 공개키는 base64url 문자열로 오지만 pushManager.subscribe는 Uint8Array를 요구한다.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function getExpiryMessage(expiry) {
  if (!expiry) return '';
  if (expiry === 'D-0' || expiry === 'D+0') return '⚠️ 오늘이 마지막이에요!';
  if (expiry.startsWith('D+')) return `❌ 유통기한 지남 (${expiry})`;
  if (expiry === 'D-1') return '내일까지 드셔야 해요';
  if (expiry === 'D-2') return '모레까지 드셔야 해요';
  if (expiry === 'D-3') return '3일 안에 드시는 게 좋아요';
  return `${expiry} 안에 드세요`;
}

export default function ExpiryAlerts() {
  const { back, fridge } = useApp();
  const [data, setData] = useState({ items: [], lowStockItems: [] });

  const requestNotification = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return alert('이 브라우저는 푸시 알림을 지원하지 않아요.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return alert('알림 권한이 거부되었어요.');

    try {
      const { publicKey } = await api.getPushPublicKey();
      if (!publicKey) {
        // 서버에 VAPID 키가 없으면(로컬 개발 등) 서버 푸시는 못 켜지만, 즉석 알림으로라도 확인시켜준다.
        new Notification('알림 설정 완료!', { body: '서버 푸시 키가 아직 설정되지 않아 이 알림만 확인용으로 띄워요.' });
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await api.subscribePush(subscription.toJSON());
      new Notification('알림 설정 완료!', { body: '유통기한이 D-2 이내가 되면 앱을 안 열어도 알려드릴게요.' });
    } catch (err) {
      alert(err.message || '알림을 설정하는 중 오류가 발생했어요.');
    }
  };

  useEffect(() => { api.getExpiryAlerts().then(setData); }, [fridge]);

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>유통기한 임박 알림</h1></div>
      <div className="content">
        <div className="notice" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <span>🔔 임박 재료는 <b style={{ color: 'var(--red)' }}>빨간 글자</b>로 표시되고, D-2부터 푸시 알림을 보내드려요.</span>
          <button className="btn outline" style={{ fontSize: 11, padding: '4px 8px', whiteSpace: 'nowrap' }} onClick={requestNotification}>알림 켜기</button>
        </div>
        <div>
          {data.items.length ? data.items.map((f) => (
            <Row key={f.id} emoji={f.emoji} name={`${f.name} ${f.qtyLabel}`} nameColor="var(--red)"
              meta={getExpiryMessage(f.expiry)} right={<span className="badge red">{f.expiry}</span>} />
          )) : <p style={{ fontSize: 13, color: 'var(--sub)' }}>임박한 재료가 없어요 👍</p>}
        </div>

        <div className="section-title" style={{ marginTop: 24 }}>수량 부족 알림 🛒</div>
        <div>
          {data.lowStockItems?.length ? data.lowStockItems.map((f) => (
            <Row key={`low_${f.id}`} emoji={f.emoji} name={`${f.name} ${f.qtyLabel}`} nameColor="#f5a623"
              meta="거의 다 썼어요" right={<span className="badge gray">부족</span>} />
          )) : <p style={{ fontSize: 13, color: 'var(--sub)' }}>부족한 재료가 없어요 👍</p>}
        </div>
      </div>
    </section>
  );
}
