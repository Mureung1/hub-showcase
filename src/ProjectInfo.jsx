import React from 'react';
import './ProjectInfo.css';

const ProjectInfo = () => {
  const coreFeatures = [
    {
      id: 1,
      icon: '✓',
      title: '구독 서비스 통합 관리',
      description: '현재 이용 중인 다양한 구독 서비스를 한 곳에서 모아보고, 월별 지출 내역을 체계적으로 관리합니다.'
    },
    {
      id: 2,
      icon: '₩',
      title: '스마트한 N인 정산',
      description: '계정을 공유하는 멤버들과의 정산 일정을 놓치지 않도록 알림을 제공하며, 간편하게 이체 및 납부 현황을 확인합니다.'
    }
  ];

  return (
    <div className="project-intro-container">
      <header className="intro-header">
        <h1 className="intro-title">구독 관리 서비스 (가제)</h1>
        <p className="intro-subtitle">
          복잡한 구독 내역을 한눈에 확인하고 정산까지 한번에 해결하는 서비스
        </p>
      </header>

      <section className="features-section">
        <h2 className="section-label">핵심 기능</h2>
        <div className="features-grid">
          {coreFeatures.map((feature) => (
            <div key={feature.id} className="feature-card">
              <div className="feature-card-header">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
              </div>
              <p className="feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="differentiation-section">
        <h2 className="section-label">해당 서비스만의 특별함</h2>
        <div className="diff-card">
          <h3 className="diff-title">왜곡 없는 정확한 지출 기록</h3>
          <div className="diff-content">
            <div className="diff-item problem">
              <span className="diff-badge gray">기존 방식</span>
              <p className="diff-text">
                멤버 대표는 실제 부담금보다 많은 전체 요금이 지출로 잡히고, 멤버는 단순 이체로 기록되어 정확한 구독료 파악이 어려웠습니다.
              </p>
            </div>
            <div className="diff-item solution">
              <span className="diff-badge green">해당 서비스</span>
              <p className="diff-text">
                정산 시스템을 연동하여 멤버 대표와 멤버 모두 <strong>자신이 실제로 부담하는 구독료</strong>만 정확하게 개인 지출 내역으로 관리할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="roadmap-section">
        <div className="roadmap-content">
          <h3 className="roadmap-title">Next Step: 구독 커뮤니티</h3>
          <p className="roadmap-desc">
            핵심 기능 안정화 후, OTT 등 특정 서비스를 함께 구독할 멤버를 안전하게 모집하고 매칭할 수 있는 커뮤니티 기능이 도입될 예정입니다.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ProjectInfo;