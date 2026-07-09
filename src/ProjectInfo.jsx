import './ProjectInfo.css';

const ProjectInfo = () => {
  const problems = [
    {
      id: 1,
      number: '01',
      title: '정산의 번거로움',
      description: '파티장은 매달 정산을 요청하고 입금 확인을 반복해야 하고, 파티원도 매달 이체를 반복해야 합니다.'
    },
    {
      id: 2,
      number: '02',
      title: '만족도 분석의 어려움',
      description: '구독 서비스에 대한 만족도를 일일이 파악하기 어렵고, 계정을 공유하는 경우 개인의 만족도를 그룹의 의사결정에 반영하기 힘듭니다.'
    },
    {
      id: 3,
      number: '03',
      title: '부정확한 고정 지출 파악',
      description: '공유 계정의 전체 결제 금액을 파티장 1인의 소비로만 인식하거나, 파티원의 이체 내역을 지출로 처리하지 못해 내가 실제로 부담하는 고정 지출을 파악하기 어렵습니다.'
    }
  ];

  const targets = [
    '2개 이상의 유료 구독 서비스를 이용하며 합리적인 소비를 지향하는 청년',
    '구독 서비스 계정을 공유하는 파티장(계정주)',
    '구독 서비스 계정을 공유받아 이용하는 파티원'
  ];

  const coreFeatures = [
    {
      id: 1,
      tag: 'Feature 01',
      title: '원클릭 정산',
      description: '결제일에 맞춰 파티장에게는 정산 시작 알림을, 파티원에게는 간편 이체 링크가 담긴 알림을 보냅니다. 미가입 파티원에게는 카카오톡으로 정산 요청을 일괄 전송하고, \'이체하기\'를 누르면 토스·카카오페이 딥링크로 바로 연결되어 이체할 수 있습니다.'
    },
    {
      id: 2,
      tag: 'Feature 02',
      title: 'AI 기반 만족도 리포트',
      description: '정산 요청 또는 이체 완료 직후 이모티콘 터치 한 번으로 만족도를 남기면, AI가 개인과 그룹의 만족도 추이를 분석해 구독 유지 여부에 대한 객관적인 의사결정과 대체 서비스를 제안합니다.'
    }
  ];

  const subFeature = {
    tag: 'Sub Feature',
    title: '\'내 진짜 몫\' 기준 구독 지출 대시보드',
    description: '구독 서비스, 총 결제 금액, 결제일, 파티원 수만 입력하면 1/n 기준 실제 지출 금액을 자동 계산합니다. 전체 결제 금액이 아닌 내가 실제로 지출하는 금액만 모아 월별 구독 지출 현황을 대시보드로 확인하세요.'
  };

  const aiHighlights = [
    { title: '1초 만족도 설문', description: '정산 요청 또는 이체 완료 직후 이모티콘 터치 한 번으로 끝' },
    { title: '개인 만족도 리포트', description: '월별 만족도 변화를 AI가 분석' },
    { title: '그룹 만족도 리포트', description: '파티원들의 만족도를 익명으로 종합' },
    { title: 'AI 의사결정 리포트', description: '유지·해지·전환 여부를 객관적으로 제안' },
    { title: '구독 전환 정보 제공', description: '비슷한 가격대의 대체 서비스 추천' }
  ];

  const scenarios = [
    {
      id: 'host',
      role: '파티장(계정주)',
      steps: [
        'SUBZIP에 가입하여 구독 서비스, 총 결제 금액, 결제일, 파티원 수를 등록한다.',
        '결제일이 되면 푸시 알림을 확인한 후, 카카오톡 공유 기능을 통해 파티원들에게 정산 요청 메시지를 일괄 전송한다.',
        '구독 서비스에 대한 만족도 설문을 완료하고, 개인 만족도 리포트를 기반으로 구독 유지 및 변경 여부를 결정한다.',
        '파티원의 이체가 확인되면 정산 상태를 \'확인 완료\'로 변경한다.',
        '정산이 완료된 후 그룹 만족도 리포트를 확인하고, 파티원들과 구독 유지 여부를 논의한다.'
      ]
    },
    {
      id: 'guest-nonmember',
      role: '비회원 파티원',
      steps: [
        'SUBZIP 가입 없이, 파티장이 보낸 카카오톡 메시지의 \'이체하기\'를 통해 토스·카카오페이로 이동하여 이체한다.',
        '구독 서비스에 대한 만족도 설문에 참여하여 그룹 데이터에 기여하고, \'SUBZIP 가입하기\'를 통해 SUBZIP에 가입할 수 있다.'
      ]
    },
    {
      id: 'guest-member',
      role: '회원 파티원',
      steps: [
        '결제일이 되면 푸시 알림을 통해 토스·카카오페이로 이동하여 이체한다.',
        '구독 서비스에 대한 만족도 설문을 완료하고, 개인 만족도 리포트를 기반으로 구독 유지 및 변경 여부를 결정한다.',
        '정산이 완료된 후 그룹 만족도 리포트를 확인하고, 파티원들과 구독 유지 여부를 논의한다.'
      ]
    }
  ];

  return (
    <div className="project-intro-container">
      <header className="intro-header">
        <h1 className="intro-title">SUBZIP</h1>
        <p className="intro-subtitle">매달 반복되는 정산, 이제는 한 번에 끝내보세요</p>
        <p className="intro-description">
          구독 서비스 비용을 간편하게 정산하고, AI 기반 구독 만족도 리포트로 의사결정까지 돕는 서비스입니다.
        </p>
      </header>

      <section className="hook-section">
        <p className="hook-quote">
          여러 명이 함께 쓰는 구독, 정산은 번거롭고 만족도는 파악하기 어렵습니다.
          <br />
          <strong>SUBZIP</strong>은 이 두 가지 고민을 한 번에 해결합니다.
        </p>
      </section>

      <section className="problem-section">
        <h2 className="section-label">Why SUBZIP</h2>
        <div className="problem-grid">
          {problems.map((problem) => (
            <div key={problem.id} className="problem-card">
              <span className="problem-number">{problem.number}</span>
              <h3 className="problem-title">{problem.title}</h3>
              <p className="problem-desc">{problem.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="target-section">
        <h2 className="section-label">이런 분들을 위한 서비스입니다</h2>
        <div className="target-badges">
          <span className="target-badge">{targets[0]}</span>
          <span className="target-badge-break" aria-hidden="true" />
          <span className="target-badge">{targets[1]}</span>
          <span className="target-badge">{targets[2]}</span>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-label">SUBZIP의 해결책</h2>
        <div className="features-grid">
          {coreFeatures.map((feature) => (
            <div key={feature.id} className="feature-card">
              <span className="feature-tag">{feature.tag}</span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sub-feature-section">
        <div className="sub-feature-card">
          <span className="sub-feature-tag">{subFeature.tag}</span>
          <h3 className="sub-feature-title">{subFeature.title}</h3>
          <p className="sub-feature-desc">{subFeature.description}</p>
        </div>
      </section>

      <section className="highlight-section">
        <h2 className="section-label section-label--light">AI 기반 만족도 관리</h2>
        <div className="highlight-grid">
          {aiHighlights.map((item, idx) => (
            <div key={idx} className="highlight-card">
              <h3 className="highlight-title">{item.title}</h3>
              <p className="highlight-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="scenario-section">
        <h2 className="section-label">이용 흐름</h2>
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="scenario-group">
            <h3 className="scenario-role">{scenario.role}</h3>
            <ol className="scenario-list">
              {scenario.steps.map((step, idx) => (
                <li key={idx} className="scenario-item">
                  <span className="scenario-number">{idx + 1}</span>
                  <p className="scenario-text">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section className="closing-section">
        <p className="closing-text">이제, 흩어진 구독을 SUBZIP 하나로 정리하세요.</p>
      </section>
    </div>
  );
};

export default ProjectInfo;
