import { useState } from 'react';
import './GroupPurchaseDetailPage.css';

const mockPurchase = {
  id: 1, category: '신선식품', deadline: 'D-2',
  title: '유기농 하스 아보카도 1박스(20개입) 공동구매', totalPrice: 40000,
  perPersonPrice: 10000, targetParticipants: 4, currentParticipants: 3,
  pickupPlace: '해피타워 A동 1층 메인 로비',
};

const images = [
  'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
];

const won = (value) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;

export default function GroupPurchaseDetailPage() {
  const [purchase, setPurchase] = useState(mockPurchase);
  const [joinState, setJoinState] = useState('idle');
  const [message, setMessage] = useState('');
  const progress = (purchase.currentParticipants / purchase.targetParticipants) * 100;

  async function handleJoin() {
    setJoinState('loading');
    setMessage('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/group-purchases/${purchase.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || '참여 신청에 실패했습니다.');
      setPurchase((current) => ({ ...current, currentParticipants: result.data.groupPurchase.currentParticipants }));
      setJoinState('joined');
      setMessage('참여 신청이 완료되었습니다. 방장 승인 후 안내해 드릴게요.');
    } catch (error) {
      setJoinState('idle');
      setMessage(error.message);
    }
  }

  return (
    <div className="td-root td-detail-page">
      <header className="td-detail-page__header">
        <a className="td-detail-page__brand" href="#top">ThingDong</a>
        <nav className="td-detail-page__nav"><a className="td-detail-page__nav-item td-detail-page__nav-item--active" href="#top">홈</a><a className="td-detail-page__nav-item" href="#location">내 주변</a><a className="td-detail-page__nav-item" href="#join">공구 참여</a><a className="td-detail-page__nav-item" href="#host">마이페이지</a></nav>
        <button className="td-detail-page__profile" aria-label="내 프로필">김</button>
      </header>
      <main id="top" className="td-detail-page__content">
        <a className="td-detail-page__back" href="#top">← 공구 목록으로 돌아가기</a>
        <div className="td-detail-page__columns">
          <section className="td-detail-page__main-column">
            <article className="td-detail-page__card">
              <div className="td-detail-page__chips"><span className="td-detail-page__chip">{purchase.category}</span><span className="td-detail-page__chip td-detail-page__chip--deadline">{purchase.deadline}</span></div>
              <h1 className="td-headline-lg td-detail-page__title">{purchase.title}</h1>
              <div className="td-detail-page__gallery"><img className="td-detail-page__image td-detail-page__image--main" src={images[0]} alt="신선한 아보카도 상자" /><img className="td-detail-page__image" src={images[1]} alt="반으로 자른 아보카도" /><img className="td-detail-page__image" src={images[2]} alt="아보카도 요리" /></div>
              <div className="td-detail-page__prices"><div className="td-detail-page__price-box"><span className="td-label-md">총 가격 (목표)</span><strong className="td-headline-md">{won(purchase.totalPrice)}</strong><small>/ 20개</small></div><div className="td-detail-page__price-box td-detail-page__price-box--highlight"><span className="td-label-md">1인당 금액 ({purchase.targetParticipants}명 기준)</span><strong className="td-headline-md">{won(purchase.perPersonPrice)}</strong><small>/ 5개</small></div></div>
              <div className="td-detail-page__progress-section"><div className="td-detail-page__progress-heading"><span className="td-label-md">모집 현황</span><strong className="td-headline-md">{purchase.currentParticipants} <small>/ {purchase.targetParticipants}명</small></strong></div><div className="td-detail-page__progress"><div className="td-detail-page__progress-fill" style={{ width: `${progress}%` }} /></div><p className="td-body-md">공동구매 성사까지 {purchase.targetParticipants - purchase.currentParticipants}명 남았습니다.</p></div>
              <div className="td-detail-page__stages">{['모집 중', '모집 완료', '주문 완료', '수령 대기', '종료'].map((stage, index) => <div className="td-detail-page__stage" key={stage}><span className={`td-detail-page__stage-dot ${index === 0 ? 'td-detail-page__stage-dot--active' : ''}`}>{index + 1}</span><span className="td-label-sm">{stage}</span></div>)}</div>
            </article>
            <article className="td-detail-page__card td-detail-page__description"><h2 className="td-headline-md">상세 설명</h2><p className="td-body-lg">지역 직송 공급업체에서 유기농 하스 아보카도 대용량 박스를 좋은 가격에 발견했어요. 혼자 먹기에는 많아 이웃 세 분을 찾습니다.</p><p className="td-body-lg">수령은 평일 저녁 7시부터 9시 사이, 해피타워 1층 메인 로비에서 진행할 예정입니다.</p><ul className="td-body-md"><li>품종: 유기농 하스</li><li>원산지: 지역 농장 직송</li><li>수령 예정일: 이번 주 금요일</li></ul></article>
          </section>
          <aside className="td-detail-page__side-column">
            <article id="location" className="td-detail-page__card"><h2 className="td-headline-md">📍 수령 위치</h2><div className="td-detail-page__map"><span>●</span><b>해피타워</b></div><p className="td-body-md">{purchase.pickupPlace}</p></article>
            <article id="host" className="td-detail-page__card"><h2 className="td-headline-md">방장 정보</h2><div className="td-detail-page__host-summary"><span className="td-detail-page__avatar">F</span><div><strong>FreshLover99</strong><p className="td-body-md">가입일: 2년 전</p></div></div><div className="td-detail-page__host-stats"><div><span>매너 온도</span><strong>42.5°C</strong></div><div><span>공구 완료</span><strong>12회</strong></div></div></article>
            <article id="join" className="td-detail-page__card td-detail-page__join"><div className="td-detail-page__join-price"><span className="td-body-md">나의 총 결제 금액</span><strong className="td-headline-md">{won(purchase.perPersonPrice)}</strong></div><button className="td-detail-page__join-button" type="button" onClick={handleJoin} disabled={joinState !== 'idle'}>{joinState === 'loading' ? '참여 신청 중...' : joinState === 'joined' ? '참여 신청 완료' : '공구 참여하기'}</button>{message && <p className={`td-detail-page__join-message td-body-md ${joinState === 'joined' ? 'td-detail-page__join-message--success' : ''}`}>{message}</p>}<div className="td-detail-page__secondary-actions"><button type="button">♡ 찜하기</button><button type="button">↗ 공유하기</button></div></article>
          </aside>
        </div>
      </main>
    </div>
  );
}
