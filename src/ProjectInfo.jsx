import './ProjectInfo.css';

const ProjectInfo = () => {
  const problems = [
    {
      id: 1,
      number: '01',
      title: '부정확한 지출 파악',
      description: '공유 계정의 전체 결제 금액을 내 소비로 착각하거나, 이체 내역을 놓쳐서 내가 실제로 부담하는 고정 지출을 정확히 알기 어렵습니다.'
    },
    {
      id: 2,
      number: '02',
      title: '정산 관리의 피로도',
      description: '파티장은 매달 반복되는 정산 요청과 입금 확인을 직접 챙겨야 하고, 파티원도 매번 반복되는 송금이 번거롭습니다.'
    },
    {
      id: 3,
      number: '03',
      title: '구독 유지 의사결정의 어려움',
      description: '내가 만족하며 쓰고 있는지 객관적으로 판단하기 어렵고, 해지하고 싶어도 함께 쓰는 사이라 먼저 말 꺼내기가 쉽지 않습니다.'
    }
  ];

  const targets = [
    '2개 이상의 유료 구독 서비스를 이용하는 20~30대',
    '가족·친구·지인과 구독을 공유하는 파티장 및 파티원'
  ];

  const coreFeatures = [
    {
      id: 1,
      tag: 'Feature 01',
      title: '실제 분담 금액 대시보드',
      description: '구독 서비스, 총 결제 금액, 결제일, 공유 인원만 입력하면 AI가 1/n 기준 실제 부담 금액을 자동으로 계산합니다. 전체 결제 금액이 아닌 \'내가 진짜 내는 돈\'을 기준으로 지출을 확인하세요.'
    },
    {
      id: 2,
      tag: 'Feature 02',
      title: '원클릭 그룹 정산',
      description: '결제일에 맞춰 카카오톡으로 정산 요청을 한 번에 보내고, 파티원은 가입 없이 \'송금하기\' 버튼만 누르면 토스·카카오페이로 바로 송금됩니다. 송금 직후엔 무료 구독 리포트로 자연스럽게 가입까지 이어집니다.'
    }
  ];

  const aiHighlights = [
    { title: '1초 만족도 체크', description: '송금 직후 이모티콘 터치 한 번으로 끝' },
    { title: '개인 만족도 리포트', description: '월별 만족도 변화를 AI가 분석' },
    { title: '그룹 만족도 분석', description: '파티원들의 만족도를 익명으로 종합' },
    { title: 'AI 의사결정 리포트', description: '유지·해지·전환 여부를 객관적으로 제안' },
    { title: '구독 전환 정보 제공', description: '비슷한 가격대의 대체 서비스 추천' }
  ];

  const userScenario = [
    '구독 서비스와 공유 인원을 등록하고, 내가 실제로 부담하는 월 지출을 확인한다.',
    '결제일이 되면 카카오톡으로 정산을 요청하고, 파티원은 가입 없이 송금을 완료한다.',
    '송금 후 무료 구독 리포트로 간편 가입하면, 다음부터는 자동으로 정산 알림을 받는다.',
    '송금 직후 이모티콘 터치 한 번으로 1초 만족도 평가를 남긴다.',
    'AI가 개인·그룹의 만족도 추이를 분석해 유지·해지·전환에 대한 리포트를 제공한다.',
    '리포트를 참고해 구독을 유지하거나, 파티원들과 변경·해지를 결정한다.'
  ];

  return (
    <div className="project-intro-container">
      <header className="intro-header">
        <h1 className="intro-title">SUBZIP</h1>
        <p className="intro-subtitle">내가 실제로 내는 구독료, 정확히 알고 계신가요?</p>
        <p className="intro-description">
          매달 지출하는 진짜 구독료를 관리하고, 공유 구독 정산과 그룹의 구독 의사결정까지 돕는 서비스입니다.
        </p>
      </header>

      <section className="hook-section">
        <p className="hook-quote">
          여러 명이 함께 쓰는 구독, 정산은 번거롭고 해지 얘기는 꺼내기 어렵습니다.
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
          {targets.map((target, idx) => (
            <span key={idx} className="target-badge">{target}</span>
          ))}
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
        <ol className="scenario-list">
          {userScenario.map((step, idx) => (
            <li key={idx} className="scenario-item">
              <span className="scenario-number">{idx + 1}</span>
              <p className="scenario-text">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="closing-section">
        <p className="closing-text">이제, 흩어진 구독을 SUBZIP 하나로 정리하세요.</p>
      </section>
    </div>
  );
};

export default ProjectInfo;
