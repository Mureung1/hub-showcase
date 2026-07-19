import { useState } from 'react';
import './MyPage.css';

export default function MyPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('hosted'); // 'hosted' | 'joined'

  const notifications = [
    {
      id: 1,
      type: 'approve',
      icon: 'check_circle',
      title: "'양파 5kg 한 망'",
      message: '공구 참여가 승인되었습니다.',
      time: '2시간 전',
    },
    {
      id: 2,
      type: 'shipping',
      icon: 'local_shipping',
      title: "'유기농 계란 30구'",
      message: '픽업이 준비되었습니다.',
      time: '1일 전',
      opacity: true,
    },
    {
      id: 3,
      type: 'join',
      icon: 'group_add',
      title: "'캡슐커피 100개입'",
      message: '공구에 새 멤버가 참여했습니다.',
      time: '2일 전',
      opacity: true,
    },
  ];

  return (
    <div className="td-root td-mypage">
      <main className="td-mypage__content">
        
        {/* Header */}
        <header className="td-mypage__header-title-row">
          <h1 className="td-headline-lg">마이페이지</h1>
        </header>

        <div className="td-mypage__grid">
          
          {/* Left Column: Profile & Notifications */}
          <div className="td-mypage__left-column">
            
            {/* Profile Card */}
            <section className="td-mypage__card td-mypage__profile-card">
              <div className="td-mypage__profile-bg-glow"></div>
              <div className="td-mypage__profile-info">
                <div className="td-mypage__profile-avatar">지</div>
                <div>
                  <h2 className="td-headline-md">김지민</h2>
                  <p className="td-mypage__profile-loc">
                    <span className="material-symbols-outlined">location_on</span>
                    서초구 반포동
                  </p>
                </div>
              </div>
              
              <div className="td-mypage__manner-box">
                <div className="td-mypage__manner-header">
                  <span className="td-label-md">매너 온도</span>
                  <span className="td-label-md td-mypage__manner-temp">
                    38.2°C
                    <span className="material-symbols-outlined fill">favorite</span>
                  </span>
                </div>
                <div className="td-mypage__manner-bar-track">
                  <div className="td-mypage__manner-bar-fill" style={{ width: '38.2%' }}></div>
                </div>
              </div>

              <div className="td-mypage__noshow-row">
                <span className="td-body-md">노쇼 횟수</span>
                <span className="td-label-md td-mypage__noshow-badge">0회</span>
              </div>
            </section>

            {/* Notifications Card */}
            <section className="td-mypage__card td-mypage__notify-card">
              <div className="td-mypage__card-header">
                <h3 className="td-headline-md">
                  <span className="material-symbols-outlined">campaign</span>
                  최근 알림
                </h3>
                <button className="td-mypage__text-btn">전체보기</button>
              </div>

              <div className="td-mypage__notify-list">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`td-mypage__notify-item ${notif.opacity ? 'td-mypage__notify-item--faded' : ''}`}
                    onClick={() => alert(`${notif.title} 알림 상세 화면은 준비 중입니다.`)}
                  >
                    <div className={`td-mypage__notify-icon-circle td-mypage__notify-icon-circle--${notif.type}`}>
                      <span className="material-symbols-outlined">{notif.icon}</span>
                    </div>
                    <div className="td-mypage__notify-body">
                      <p className="td-body-md">
                        <strong className="font-bold">{notif.title}</strong> {notif.message}
                      </p>
                      <span className="td-label-sm td-mypage__notify-time">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Right Column: Activity Tabs & Content */}
          <div className="td-mypage__right-column">
            
            {/* Tabs Selector */}
            <div className="td-mypage__tabs-container">
              <button 
                className={`td-mypage__tab-btn ${activeTab === 'hosted' ? 'td-mypage__tab-btn--active' : ''}`}
                onClick={() => setActiveTab('hosted')}
              >
                내가 연 공구
              </button>
              <button 
                className={`td-mypage__tab-btn ${activeTab === 'joined' ? 'td-mypage__tab-btn--active' : ''}`}
                onClick={() => setActiveTab('joined')}
              >
                내가 참여한 공구
              </button>
            </div>

            {/* Tab Hosted Content */}
            {activeTab === 'hosted' && (
              <div className="td-mypage__tab-content-grid">
                
                {/* Hosted Item 1: Recruiting */}
                <div className="td-mypage__card td-mypage__item-card">
                  <div className="td-mypage__item-img-wrapper">
                    <img 
                      className="td-mypage__item-img" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAK_2x7QihJKQCCmj7PokHpVFHBWD3VGaZe0IQpTkcBb6uFHj4z_5b86gic10E5RmfGYAAWMSv_WIBiCJMsYWwKKnICiutEDBItfFBvLrsfo4KJ-Z9W9vip8J0Gg8GWUxi9q2FFpZe0DGnD5QGVKWN2K6AF2YdICX-24Gdsw6c9v2PTs6qge8dHqGnSRHXuSl-7i60jnHh8sc0-7WQSpnzFa1dB0xfv5XKQWonn7Wz3Ip_P2mztNU4" 
                      alt="양파 5kg" 
                    />
                    <div className="td-mypage__item-badge td-mypage__item-badge--recruiting">
                      <span className="td-mypage__item-badge-dot"></span>
                      <span className="td-label-sm">모집중</span>
                    </div>
                  </div>
                  <div className="td-mypage__item-body">
                    <h3 className="td-headline-md">양파 5kg 한 망</h3>
                    <p className="td-body-md">산지직송 유기농 양파</p>
                    <div className="td-mypage__item-progress-section">
                      <div className="td-mypage__item-progress-header">
                        <span className="td-label-sm">진행률 (2/5)</span>
                        <span className="td-label-md">40%</span>
                      </div>
                      <div className="td-mypage__item-progress-track">
                        <div className="td-mypage__item-progress-fill" style={{ width: '40%' }}></div>
                      </div>
                      <button 
                        className="td-mypage__item-action-btn"
                        onClick={() => onNavigate('detail')}
                      >
                        <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                        공구 관리하기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hosted Item 2: Waiting Pickup */}
                <div className="td-mypage__card td-mypage__item-card td-mypage__item-card--faded">
                  <div className="td-mypage__item-img-wrapper">
                    <img 
                      className="td-mypage__item-img" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjvkLaheYryrRrlpDLOO5TgI8wyhtOpPyrmm1bKDQttkZ1ovU_yPcYeJX-Oc9NRBuIWq_vwmVZ8mPtyIY57kDooP7nI7OiN76NM2GGaG154TaLuIMBFp-0fW6S_J1PRWJsx0MlLjcWWdGXU9xXkjyieXqQKIA_w2yPbcunM6L5hIhmAqGqrYLCCLK5OT8Nxne3uckjZJpPgAdOgb1fLnNWzedLYBOxaQ0z31FPbHiRY9G1bizq7Ww" 
                      alt="캡슐커피" 
                    />
                    <div className="td-mypage__item-badge td-mypage__item-badge--pickup">
                      <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                      <span className="td-label-sm">픽업대기</span>
                    </div>
                  </div>
                  <div className="td-mypage__item-body">
                    <h3 className="td-headline-md">캡슐커피 100개입</h3>
                    <p className="td-body-md">프리미엄 로스팅 캡슐</p>
                    <div className="td-mypage__item-progress-section">
                      <div className="td-mypage__item-info-box">
                        <span className="td-label-sm">픽업 장소</span>
                        <span className="td-label-md">GS25 반포점</span>
                      </div>
                      <button 
                        className="td-mypage__item-action-btn td-mypage__item-action-btn--primary"
                        onClick={() => alert('픽업 확인용 QR코드가 로드되었습니다.')}
                      >
                        <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                        QR 코드 보기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add New CTA Card */}
                <div 
                  className="td-mypage__add-cta-card"
                  onClick={() => onNavigate('createpost')}
                >
                  <div className="td-mypage__add-cta-circle">
                    <span className="material-symbols-outlined">add</span>
                  </div>
                  <span className="td-headline-md">새 공구 시작하기</span>
                </div>

              </div>
            )}

            {/* Tab Joined Content */}
            {activeTab === 'joined' && (
              <div className="td-mypage__tab-content-grid">
                
                {/* Joined Item 1: Approved */}
                <div className="td-mypage__card td-mypage__item-card">
                  <div className="td-mypage__item-img-wrapper">
                    <img 
                      className="td-mypage__item-img" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9LxhjOpS9fbsgGD4y1id-k1A73nG5c0SshXuwxs4JvXst-xM4bFbiUsyXNevqSvtTJc7cWHnCBn01onPkEAvAg4nkINIx0wbmG7duS3cgFAbzsrdlO6DEMbx6s2u8HsJCJ14oKJCie35TApy9qu9HQPlXEdmYUgYTDvG0EZD3-G3XNVnfUYlqtgC50rfoR8eS5sEnN1WdxAbiieexUvyFEmTShZkXzsvkQf17pvBH8CLa22KX9oU" 
                      alt="세탁세제" 
                    />
                    <div className="td-mypage__item-badge td-mypage__item-badge--approved">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span className="td-label-sm">승인됨</span>
                    </div>
                  </div>
                  <div className="td-mypage__item-body">
                    <h3 className="td-headline-md">프리미엄 세탁세제 3L</h3>
                    <p className="td-body-md">친환경 세탁세제</p>
                    <div className="td-mypage__item-progress-section">
                      <div className="td-mypage__host-info">
                        <div className="td-mypage__host-avatar">H</div>
                        <div className="td-mypage__host-details">
                          <span className="td-label-sm text-on-surface-variant">호스트</span>
                          <span className="td-label-md">이웃주민</span>
                        </div>
                      </div>
                      <button 
                        className="td-mypage__item-action-btn"
                        onClick={() => alert('호스트와의 1:1 채팅방을 엽니다.')}
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        호스트와 채팅하기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Joined Item 2: Ordered */}
                <div className="td-mypage__card td-mypage__item-card td-mypage__item-card--faded">
                  <div className="td-mypage__item-img-wrapper">
                    <img 
                      className="td-mypage__item-img" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5Xu5s_WoVEKupSmY-_cP8ST0Uraj1ju_nzR3x_ZkzCyfAirkgyKPLVqsfgz6-MT9KmQY5e2xEs1xM-YafJfZVnc3BiZ8U6woEInB7dgyn9gLccRUK8gF7RmCi_ltapRFNc6GNVSeQwaj5JUVFCf9fB3jXNxxEc0yMQethais_CE0OZpkwNK7rpSdaBsfC1ZAbqV74vMqKk6Quvruqi3vJPABHSfzpbHgzBCuiw9LZlnY6y0Gyx78" 
                      alt="유기농 계란" 
                    />
                    <div className="td-mypage__item-badge td-mypage__item-badge--ordered">
                      <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                      <span className="td-label-sm">주문완료</span>
                    </div>
                  </div>
                  <div className="td-mypage__item-body">
                    <h3 className="td-headline-md">유기농 계란 30구</h3>
                    <p className="td-body-md">방사 유기농 계란</p>
                    <div className="td-mypage__item-progress-section">
                      <div className="td-mypage__item-info-box">
                        <span className="td-label-sm">배송 예정일</span>
                        <span className="td-label-md">10월 24일</span>
                      </div>
                      <button 
                        className="td-mypage__item-action-btn td-mypage__item-action-btn--disabled"
                        disabled
                      >
                        배송 대기 중
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="td-mypage__footer">
        <div className="td-mypage__footer-brand">
          <span className="td-mypage__footer-logo">ThingDong</span>
          <p className="td-mypage__footer-copy">© 2024 ThingDong. Sharing for a fresher life.</p>
        </div>
        <div className="td-mypage__footer-links">
          <a className="td-mypage__footer-link" href="#terms">이용약관</a>
          <a className="td-mypage__footer-link" href="#privacy">개인정보처리방침</a>
          <a className="td-mypage__footer-link" href="#partnership">제휴문의</a>
          <a className="td-mypage__footer-link" href="#help">고객센터</a>
        </div>
      </footer>
    </div>
  );
}
