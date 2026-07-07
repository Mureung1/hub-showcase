import React from 'react';
import './ProjectInfo.css';

const ProjectInfo = () => {
  const coreFeatures = [
    {
      id: 1,
      icon: '📋',
      title: '구독 서비스 현황 확인',
      description: '이용 중인 구독 서비스를 수동으로 등록하면, 함께 쓰는 인원수를 기반으로 실제 분담 금액이 자동으로 계산됩니다.'
    },
    {
      id: 2,
      icon: '₩',
      title: '그룹 정산',
      description: '멤버들과 그룹을 만들어 관리하고, 매달 자동으로 정산 요청 알림을 받아 카카오페이·토스 송금으로 간편하게 정산할 수 있습니다.'
    }
  ];

  const subFeatures = [
    '구독을 해지하고 싶을 때 해당 앱/웹으로 바로 이동',
    '그룹 인원이 바뀌면 구독 해지, 요금제 변경 안내',
    '한 달에 한 번 이용 정도를 자가 체크하면 규칙 기반으로 해지 추천'
  ];

  const userScenario = [
    '사용자가 가입 후 이용 중인 구독 서비스를 등록한다. (함께 쓰는 인원수도 입력)',
    '사용자가 구독 중인 서비스 현황과 한 달 소비 금액을 한눈에 확인한다.',
    '결제 금액이 아닌 실제 분담 금액으로 본인의 정확한 소비 현황을 확인한다.',
    '여러 명이 함께 쓰는 서비스는 멤버들과 그룹을 만든다.',
    '매달 자동으로 정산 요청 알림을 받고, 카카오페이/토스 송금으로 연동되어 정산한다.',
    '그룹 인원이 바뀌면 구독 해지, 요금제 변경을 안내받는다.',
    '한 달에 한 번 서비스 이용 정도를 간단히 체크하면, 덜 쓰는 서비스는 해지를 제안받는다.',
    '구독을 해지하고 싶을 때 해당 앱/웹으로 이동한다.'
  ];

  return (
    <div className="project-intro-container">
      <header className="intro-header">
        <h1 className="intro-title">SUBZIP</h1>
        <p className="intro-subtitle">
          구독 중인 서비스를 한눈에 파악하고, 그룹원들과 정산하는 서비스
        </p>
      </header>

      <section className="problem-section">
        <h2 className="section-label">문제 정의</h2>
        <p className="problem-text">
          여러 구독 서비스를 이용하는 사람은 매달 어떤 서비스에 얼마를 쓰는지 한눈에 파악하기 어렵고, 일일이 정산하는 것이 번거롭습니다.
        </p>
      </section>

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

      <section className="sub-features-section">
        <h2 className="section-label">서브 기능</h2>
        <ul className="sub-features-list">
          {subFeatures.map((item, idx) => (
            <li key={idx} className="sub-feature-item">
              <span className="sub-feature-dot" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="scenario-section">
        <h2 className="section-label">사용자 시나리오</h2>
        <ol className="scenario-list">
          {userScenario.map((step, idx) => (
            <li key={idx} className="scenario-item">
              <span className="scenario-number">{idx + 1}</span>
              <p className="scenario-text">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default ProjectInfo;
