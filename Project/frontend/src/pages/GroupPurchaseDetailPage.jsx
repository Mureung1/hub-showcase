import { useState, useEffect } from 'react';
import {
  cancelGroupPurchaseJoin,
  getGroupPurchaseById,
  joinGroupPurchase,
  markGroupPurchaseReceipt,
  updateGroupPurchaseStatus,
} from '../api/groupPurchase';
import './GroupPurchaseDetailPage.css';
import KakaoMap from '../components/KakaoMap';

const mockPurchase = {
  id: 1,
  category: '신선식품',
  deadline: 'D-2',
  title: '유기농 아보카도 1박스(20개입) 공동구매',
  totalPrice: 40000,
  perPersonPrice: 10000,
  targetParticipants: 4,
  currentParticipants: 3,
  pickupPlace: '센트럴파크 아파트, 메인 로비 (A동)',
};

const images = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDwQY-Lso4qEhyEFancWjmu3Ol2MC7HLh2ZVUTYIpLqu8g3TKffzWWPaFuRG9e330wpbn9Ybviijw7agnijtNN6-OMGM_1-VCgyUtrYxeUcnL9t6OAqomHvxrDYaWttM_GdJtsKvjhcEmX7EqHP7pt744YSV94txYaQ8n3BX0G6eIjbRdSngdf2mgFO0EJikRCj4iFeYv_5x3su-m8CtE7ea1214BMKAc_ulvLD6NxuRuyubO8LQv8',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDSabiK06Kp5e7j7GfbnHOoKKBr6NKC9jl6fArDqPL4tJhGZwu4-HBoOiJz-Hng7WcaPCTcRa7hNbWx7UvPYzRXt52pq-LCsbF6b1ZKYdJhaZJyzbdu1g3-YoC3F34wDbBZ6ct15VjKfMXx5QaV_-4gA-diP9bsHkYGJ9Jf81APgl8heqTh1ZeXXd8gQ7Q8BWOlYx45cxB4lRrWgLXXBw2W4Z8GllQTO2nAMIuUsgbxqleV_tyvUaU',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDD99qRDlTBleJ8PiMTz6dertLLSbd2X9y6dykZTcni3_SWqBO2-hU0x73LNC8Y_YklwA2ZZzlGWWoU_B-FkGVRSufGPuLEAQ_i40xtY_MxiOcn9MMe9_QwlENj8cNqVbNB9PBURpc-gvCh1um93C3f4Yc_1gFAlyI_-SidkPQzb19TuN433vV9Y0wAc7tONMPR8Fs4JJj4f_gNek5Q9KMXsDndnq9OGPLkIerjTVq_M8D4FtWGlHE',
];

const won = (value) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;

const statusSteps = ['RECRUITING', 'COMPLETED', 'ORDERED', 'WAITING_PICKUP', 'FINISHED'];
const hostActions = {
  COMPLETED: { status: 'ORDERED', label: '주문 완료 처리' },
  ORDERED: { status: 'WAITING_PICKUP', label: '픽업 가능 처리' },
  WAITING_PICKUP: { status: 'FINISHED', label: '공동구매 완료 처리' },
};

export default function GroupPurchaseDetailPage({ onNavigate, id }) {
  const [purchase, setPurchase] = useState(mockPurchase);
  const [joinState, setJoinState] = useState('idle');
  const [workflowState, setWorkflowState] = useState('idle');
  const [message, setMessage] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const activeStepIndex = purchase.status === 'FAILED' ? -1 : Math.max(statusSteps.indexOf(purchase.status), 0);
  const progress = (purchase.currentParticipants / purchase.targetParticipants) * 100;

  useEffect(() => {
    async function fetchDetail() {
      try {
        const result = await getGroupPurchaseById(id);
        if (result.success) {
          const data = result.data;
          // Map DB keys to frontend component keys
          setPurchase({
            id: data.id,
            category: data.category === 'FOOD' ? '식자재' : data.category === 'NECESSITY' ? '생활용품' : '기타',
            deadline: 'D-1',
            title: data.title,
            totalPrice: data.totalPrice,
            perPersonPrice: data.perPersonPrice,
            targetParticipants: data.targetParticipants,
            currentParticipants: data.currentParticipants,
            pickupPlace: data.pickupPlace || data.pickupTimeSlot || '지정 위치',
            pickupLatitude: data.pickupLatitude,
            pickupLongitude: data.pickupLongitude,
            description: data.description,
            productUrl: data.productUrl,
            status: data.status,
            viewer: data.viewer,
          });
          setJoinState(data.viewer?.application ? 'joined' : 'idle');
          setMessage('');
        }
      } catch (err) {
        console.warn('Failed to fetch details:', err.message || err);
      }
    }
    if (id) {
      fetchDetail();
    }
  }, [id]);

  async function handleJoin() {
    setJoinState('loading');
    setMessage('');
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 우측 상단 프로필을 클릭하여 개발자 로그인을 먼저 진행해주세요.');
      }

      const result = await joinGroupPurchase(purchase.id);
      
      if (!result.success) {
        throw new Error(result.error?.message || '참여 신청에 실패했습니다.');
      }
      
      setPurchase((current) => ({ 
        ...current, 
        currentParticipants: result.data.groupPurchase.currentParticipants,
        status: result.data.groupPurchase.status,
        viewer: {
          ...current.viewer,
          application: result.data.application,
        },
      }));
      setJoinState('joined');
      setMessage('참여 신청이 완료되었습니다!');
    } catch (error) {
      setJoinState('error');
      setMessage(error.message);
    }
  }

  async function handleCancelJoin() {
    setJoinState('cancelling');
    setMessage('');
    try {
      const result = await cancelGroupPurchaseJoin(purchase.id);
      if (!result.success) {
        throw new Error(result.error?.message || '참여 취소에 실패했습니다.');
      }

      setPurchase((current) => ({
        ...current,
        currentParticipants: result.data.groupPurchase.currentParticipants,
        status: result.data.groupPurchase.status,
        viewer: { ...current.viewer, application: null },
      }));
      setJoinState('idle');
      setMessage('참여를 취소했습니다.');
    } catch (error) {
      setJoinState('joined');
      setMessage(error.message);
    }
  }

  async function handleHostStatus() {
    const action = hostActions[purchase.status];
    if (!action) return;

    setWorkflowState('loading');
    setMessage('');
    try {
      const result = await updateGroupPurchaseStatus(purchase.id, action.status);
      if (!result.success) throw new Error(result.error?.message || '상태 변경에 실패했습니다.');
      setPurchase((current) => ({ ...current, status: result.data.status }));
      setMessage(`${action.label}이 완료되었습니다.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorkflowState('idle');
    }
  }

  async function handleReceipt() {
    setWorkflowState('loading');
    setMessage('');
    try {
      const result = await markGroupPurchaseReceipt(purchase.id);
      if (!result.success) throw new Error(result.error?.message || '수령 완료 처리에 실패했습니다.');
      setPurchase((current) => ({
        ...current,
        viewer: { ...current.viewer, application: { ...current.viewer.application, isReceived: true } },
      }));
      setMessage('수령 완료로 기록했습니다.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorkflowState('idle');
    }
  }

  return (
    <div className="td-root td-detail-page">
      <main id="top" className="td-detail-page__content">
        
        {/* Breadcrumb */}
        <a 
          className="td-detail-page__back-btn" 
          href="#back" 
          onClick={(e) => { e.preventDefault(); if (onNavigate) onNavigate('home'); }}
        >
          <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
          홈 피드로 돌아가기
        </a>

        <div className="td-detail-page__layout-columns">
          {/* Left Column: Details */}
          <div className="td-detail-page__main-column">
            
            {/* Header Card */}
            <div className="td-detail-page__card td-detail-page__header-card">
              <div className="td-detail-page__chips">
                <span className="td-detail-page__chip">{purchase.category}</span>
                <span className="td-detail-page__chip td-detail-page__chip--deadline">{purchase.deadline}</span>
              </div>
              <h1 className="td-detail-page__title">{purchase.title}</h1>
              
              {/* Bento Grid Images */}
              <div className="td-detail-page__gallery-bento">
                <div className="td-detail-page__gallery-main-wrapper">
                  <img className="td-detail-page__gallery-img" src={images[0]} alt="Fresh Avocados Crate" />
                </div>
                <div className="td-detail-page__gallery-sub-grid">
                  <div className="td-detail-page__gallery-sub-wrapper">
                    <img className="td-detail-page__gallery-img" src={images[1]} alt="Avocado Split Halves" />
                  </div>
                  <div className="td-detail-page__gallery-sub-wrapper">
                    <img className="td-detail-page__gallery-img" src={images[2]} alt="Avocado Toast Spread" />
                  </div>
                </div>
              </div>

              {/* Price Cards */}
              <div className="td-detail-page__prices-flex">
                <div className="td-detail-page__price-card">
                  <span className="td-label-md td-detail-page__price-label">총 가격 (목표)</span>
                  <div className="td-detail-page__price-amount">
                    {won(purchase.totalPrice)}
                    <span className="td-detail-page__price-count"> / 20개</span>
                  </div>
                </div>
                <div className="td-detail-page__price-card td-detail-page__price-card--highlight">
                  <span className="td-label-md td-detail-page__price-label-highlight">인당 금액 ({purchase.targetParticipants}명 기준)</span>
                  <div className="td-detail-page__price-amount-highlight">
                    {won(purchase.perPersonPrice)}
                    <span className="td-detail-page__price-count-highlight"> / 5개</span>
                  </div>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="td-detail-page__progress-wrapper">
                <div className="td-detail-page__progress-header">
                  <span className="td-label-md td-detail-page__progress-title">모집 현황</span>
                  <div className="td-detail-page__progress-count">
                    {purchase.currentParticipants} 
                    <span className="td-detail-page__progress-total"> / {purchase.targetParticipants} 명</span>
                  </div>
                </div>
                <div className="td-detail-page__progress-bar">
                  <div className="td-detail-page__progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="td-detail-page__progress-desc">
                  공동구매 성사까지 {purchase.targetParticipants - purchase.currentParticipants}명 남았습니다!
                </p>
              </div>

              {/* 5-Step Tracker */}
              <div className="td-detail-page__tracker-section">
                <span className="td-label-md td-detail-page__tracker-title">공동구매 상태</span>
                <div className="td-detail-page__tracker-steps">
                  <div className={`td-detail-page__tracker-step ${activeStepIndex >= 0 ? 'td-detail-page__tracker-step--active' : ''}`}>
                    <div className="td-detail-page__tracker-icon-circle">
                      <span className="material-symbols-outlined text-sm">group</span>
                    </div>
                    <span className="td-label-sm">모집중</span>
                  </div>
                  <div className={`td-detail-page__tracker-step ${activeStepIndex >= 1 ? 'td-detail-page__tracker-step--active' : ''}`}>
                    <div className="td-detail-page__tracker-icon-circle">
                      <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    </div>
                    <span className="td-label-sm">모집완료</span>
                  </div>
                  <div className={`td-detail-page__tracker-step ${activeStepIndex >= 2 ? 'td-detail-page__tracker-step--active' : ''}`}>
                    <div className="td-detail-page__tracker-icon-circle">
                      <span className="material-symbols-outlined text-sm">local_shipping</span>
                    </div>
                    <span className="td-label-sm">주문완료</span>
                  </div>
                  <div className={`td-detail-page__tracker-step ${activeStepIndex >= 3 ? 'td-detail-page__tracker-step--active' : ''}`}>
                    <div className="td-detail-page__tracker-icon-circle">
                      <span className="material-symbols-outlined text-sm">inventory_2</span>
                    </div>
                    <span className="td-label-sm">픽업대기</span>
                  </div>
                  <div className={`td-detail-page__tracker-step ${activeStepIndex >= 4 ? 'td-detail-page__tracker-step--active' : ''}`}>
                    <div className="td-detail-page__tracker-icon-circle">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                    </div>
                    <span className="td-label-sm">공동구매 완료</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Description Card */}
            <div className="td-detail-page__card td-detail-page__desc-card">
              <h2 className="td-headline-md td-detail-page__section-title">상세 설명</h2>
              <div className="td-detail-page__desc-content">
                <p>지역 농장 공급업체에서 유기농 해스 아보카도 대용량 박스를 좋은 가격에 발견했습니다! 지금은 단단하지만 며칠 내로 완벽하게 후숙될 거예요. 저 혼자서 20개를 다 먹기에는 너무 많아서 같이 나눌 이웃 3분을 찾습니다.</p>
                <p>도착하면 저희 아파트 1층 메인 로비에서 픽업하시면 됩니다. 가져가실 수 있도록 종이봉투는 제가 준비해둘게요.</p>
                <ul className="td-detail-page__desc-bullets">
                  <li>품종: 유기농 해스</li>
                  <li>원산지: 지역 농장 협동조합</li>
                  <li>도착 예정일: 내일 오후</li>
                </ul>
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Sidebar */}
          <div className="td-detail-page__side-column">
            <div className="td-detail-page__sticky-sidebar">
              
              {/* Map Card */}
              <div className="td-detail-page__card td-detail-page__sidebar-card">
                <h3 className="td-detail-page__sidebar-title">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  픽업 장소·시간
                </h3>
                <div className="td-detail-page__map-wrapper">
                  <KakaoMap latitude={purchase.pickupLatitude} longitude={purchase.pickupLongitude} height={192} />
                </div>
                <p className="td-body-md td-detail-page__map-text">{purchase.pickupPlace}</p>
              </div>

              {/* Host Info Card */}
              <div className="td-detail-page__card td-detail-page__sidebar-card">
                <h3 className="td-detail-page__sidebar-title">방장 정보</h3>
                <div className="td-detail-page__host-header">
                  <div className="td-detail-page__host-avatar-wrapper">
                    <img 
                      className="td-detail-page__host-avatar" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuACbsPFnckdsTPtf8b85CE0uOU4hfWqoo-y5Esqcul3vcrTXP5gy7h72CcVUH4PMofG8Nj1wcAmfosUQcrVrH-V1X0I87Mvl3a97SsD33nY4Miqcdoy8vIo9Jc9l2gRVLhqhsex2nWtg3AVQjmGg4or569Xuts8UrGI-EefuminqOyPEUMX7hqytfdR36RTi-rCmAgIg2447mNmruo-u3e2RoYjAEZcy70tmjSAUJskTD49YO3Bboo" 
                      alt="Host Profile"
                    />
                  </div>
                  <div>
                    <div className="td-label-md">FreshLover99</div>
                    <div className="td-detail-page__host-subtext">가입일: 2년 전</div>
                  </div>
                </div>
                <div className="td-detail-page__host-stats-grid">
                  <div className="td-detail-page__host-stat-box">
                    <span className="td-detail-page__host-stat-label">매너 온도</span>
                    <strong className="td-label-md td-detail-page__host-stat-temp">
                      42.5°C 
                      <span className="material-symbols-outlined text-sm">sentiment_satisfied</span>
                    </strong>
                  </div>
                  <div className="td-detail-page__host-stat-box">
                    <span className="td-detail-page__host-stat-label">노쇼 횟수</span>
                    <strong className="td-label-md td-detail-page__host-stat-value">
                      0 <span className="td-detail-page__host-stat-unit">회</span>
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="td-detail-page__card td-detail-page__action-card">
                <div className="td-detail-page__action-price-row">
                  <span className="td-body-md td-detail-page__action-price-label">나의 총 결제금액</span>
                  <strong className="td-headline-md td-detail-page__action-price-value">{won(purchase.perPersonPrice)}</strong>
                </div>
                
                {purchase.viewer?.isHost && hostActions[purchase.status] && (
                  <button
                    className="td-detail-page__action-primary-btn"
                    onClick={handleHostStatus}
                    disabled={workflowState === 'loading'}
                  >
                    {workflowState === 'loading' ? '처리 중...' : hostActions[purchase.status].label}
                  </button>
                )}

                {purchase.viewer?.application && purchase.status === 'WAITING_PICKUP' && !purchase.viewer.application.isReceived && (
                  <button
                    className="td-detail-page__action-primary-btn"
                    onClick={handleReceipt}
                    disabled={workflowState === 'loading'}
                  >
                    {workflowState === 'loading' ? '처리 중...' : '수령 완료'}
                  </button>
                )}

                {purchase.viewer?.application?.isReceived && purchase.status === 'WAITING_PICKUP' && (
                  <p className="td-detail-page__action-message td-body-md td-detail-page__action-message--success">수령 완료가 기록되었습니다.</p>
                )}

                <button
                  style={{ display: purchase.status === 'RECRUITING' && !purchase.viewer?.isHost ? undefined : 'none' }}
                  className={`td-detail-page__action-primary-btn ${joinState === 'joined' ? 'td-detail-page__action-primary-btn--joined' : ''}`}
                  onClick={joinState === 'joined' ? handleCancelJoin : handleJoin}
                  disabled={joinState === 'loading' || joinState === 'cancelling' || (joinState !== 'joined' && purchase.currentParticipants >= purchase.targetParticipants)}
                >
                  {joinState === 'loading'
                    ? '참여 신청 중...'
                    : joinState === 'cancelling'
                      ? '참여 취소 중...'
                      : joinState === 'joined'
                          ? '참여 중 · 취소하기'
                          : '공동구매 참여하기'}
                </button>

                {message && (
                  <p className={`td-detail-page__action-message td-body-md ${joinState === 'joined' ? 'td-detail-page__action-message--success' : ''}`}>
                    {message}
                  </p>
                )}

                <div className="td-detail-page__action-secondary-row">
                  <button 
                    className={`td-detail-page__action-sec-btn ${isLiked ? 'td-detail-page__action-sec-btn--liked' : ''}`}
                    onClick={() => setIsLiked(!isLiked)}
                  >
                    <span className="material-symbols-outlined text-sm">{isLiked ? 'favorite' : 'favorite_border'}</span>
                    찜하기
                  </button>
                  <button className="td-detail-page__action-sec-btn">
                    <span className="material-symbols-outlined text-sm">share</span>
                    공유하기
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="td-detail-page__footer">
        <div className="td-detail-page__footer-brand-container">
          <span className="td-detail-page__footer-logo">ThingDong</span>
          <span className="td-detail-page__footer-copy">© 2024 ThingDong. Sharing for a fresher life.</span>
        </div>
        <div className="td-detail-page__footer-links">
          <a className="td-detail-page__footer-link" href="#terms">이용약관</a>
          <a className="td-detail-page__footer-link" href="#privacy">개인정보처리방침</a>
          <a className="td-detail-page__footer-link" href="#partnership">제휴문의</a>
          <a className="td-detail-page__footer-link" href="#help">고객센터</a>
        </div>
      </footer>
    </div>
  );
}
