import './CoreLoopBuilderIntro.css'

const loopNodes = [
  { ko: '행동', en: 'Action' },
  { ko: '보상', en: 'Reward' },
  { ko: '성장', en: 'Growth' },
  { ko: '도전', en: 'Challenge' },
  { ko: '반복', en: 'Repeat' },
]

const problems = [
  '아이디어는 있지만 플레이어가 반복할 행동을 정의하기 어렵다.',
  '장르에 맞는 기본 루프 구조를 떠올리기 어렵다.',
  '참고 게임의 재미를 내 게임의 구조로 바꾸기 어렵다.',
  '보상, 성장, 도전이 자연스럽게 이어지지 않는다.',
  '기획서에서 핵심 재미를 설득력 있게 설명하기 어렵다.',
]

const users = [
  {
    title: '게임 기획 지망생',
    desc: '코어 루프 중심으로 기획 포트폴리오를 만들고 싶은 학생',
  },
  {
    title: '공모전/해커톤 참가자',
    desc: '짧은 시간 안에 게임의 핵심 플레이 구조를 정리해야 하는 사람',
  },
  {
    title: '초보 게임 개발자',
    desc: '막연한 게임 아이디어를 실제 플레이 흐름으로 바꾸고 싶은 사람',
  },
]

const howToSteps = [
  '만들고 싶은 게임 장르를 선택합니다.',
  '참고하고 싶은 게임을 입력합니다.',
  '원하는 플레이 경험을 작성합니다.',
  'AI가 장르별 기본 루프와 참고 게임의 루프를 분석합니다.',
  'AI가 코어 루프 후보를 제안합니다.',
  '사용자가 선택한 루프를 기획 초안으로 발전시킵니다.',
]

const pipeline = [
  { title: 'Input', desc: '장르, 참고 게임, 원하는 플레이 경험을 입력합니다.' },
  { title: 'Analyze', desc: '참고 게임의 핵심 재미와 반복 구조를 분석합니다.' },
  { title: 'Brainstorm', desc: '장르에 맞는 코어 루프 후보를 제안합니다.' },
  { title: 'Build Loop', desc: '행동, 보상, 성장, 도전의 연결 구조를 설계합니다.' },
  { title: 'Visualize', desc: '화살표 또는 원형 다이어그램으로 루프를 표현합니다.' },
  { title: 'Draft', desc: '포트폴리오용 기획 초안을 생성합니다.' },
  { title: 'Review', desc: '루프의 약점과 개선 방향을 피드백합니다.' },
]

const exampleLoop = [
  '전투 진입',
  '카드 사용',
  '적 처치',
  '보상 선택',
  '덱 강화',
  '더 어려운 전투',
  '반복',
]

const outputs = [
  '장르별 기본 코어 루프',
  '참고 게임의 루프 분석',
  '새로운 코어 루프 후보',
  '화살표형 루프 다이어그램',
  '핵심 재미 정의',
  '보상/성장/도전 구조',
  '포트폴리오용 기획 초안',
  'AI 피드백',
]

function CoreLoopBuilderIntro() {
  return (
    <main className="clb-page">
      {/* 1. Hero */}
      <section className="clb-section clb-hero" aria-labelledby="clb-hero-title">
        <div className="clb-hero-copy">
          <p className="clb-eyebrow">AI Agent for Game Designers</p>
          <h1 id="clb-hero-title" className="clb-hero-title">Core Loop Builder</h1>
          <p className="clb-hero-tagline">Design the Loop. Build the Game.</p>
          <p className="clb-hero-subcopy">
            게임 기획자를 꿈꾸는 사용자가 장르와 참고 게임을 바탕으로 코어 루프를
            구상하고, 이를 포트폴리오용 기획 초안으로 발전시킬 수 있도록 돕는
            AI Agent 서비스입니다.
          </p>
        </div>

        <div
          className="clb-loop-diagram"
          role="img"
          aria-label="코어 루프 순환 구조: 행동, 보상, 성장, 도전, 반복이 화살표로 이어져 순환합니다."
        >
          <ul className="clb-loop-ring">
            {loopNodes.map((node, i) => (
              <li key={node.ko} className={`clb-loop-node clb-loop-node-${i + 1}`}>
                <span className="clb-loop-node-index">{i + 1}</span>
                <span className="clb-loop-node-ko">{node.ko}</span>
                <span className="clb-loop-node-en">{node.en}</span>
              </li>
            ))}
          </ul>
          <div className="clb-loop-arrows" aria-hidden="true">
            <span className="clb-loop-arrow clb-loop-arrow-1">➜</span>
            <span className="clb-loop-arrow clb-loop-arrow-2">➜</span>
            <span className="clb-loop-arrow clb-loop-arrow-3">➜</span>
            <span className="clb-loop-arrow clb-loop-arrow-4">➜</span>
            <span className="clb-loop-arrow clb-loop-arrow-5">➜</span>
          </div>
        </div>
      </section>

      {/* 2. What is Core Loop */}
      <section className="clb-section clb-what" aria-labelledby="clb-what-title">
        <h2 id="clb-what-title" className="clb-section-title">코어 루프란?</h2>
        <div className="clb-what-body">
          <p>
            코어 루프는 플레이어가 게임 안에서 반복하게 되는 핵심 행동의
            흐름입니다. 플레이어는 행동하고, 보상을 받고, 성장하고, 다시
            도전합니다. 이 반복 구조가 명확할수록 게임의 재미와 방향성도
            선명해집니다.
          </p>
          <p className="clb-highlight">
            코어 루프는 &ldquo;플레이어가 무엇을 하고, 왜 다시 하게 되는가&rdquo;를
            설명하는 가장 작은 기획 단위입니다.
          </p>
        </div>
      </section>

      {/* 3. Problem */}
      <section className="clb-section clb-problem" aria-labelledby="clb-problem-title">
        <h2 id="clb-problem-title" className="clb-section-title">왜 코어 루프 설계가 어려울까?</h2>
        <ul className="clb-grid clb-problem-grid">
          {problems.map((problem) => (
            <li key={problem} className="clb-card clb-problem-card">
              <span className="clb-problem-icon" aria-hidden="true">⚠</span>
              <p>{problem}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Who Uses It */}
      <section className="clb-section clb-users" aria-labelledby="clb-users-title">
        <h2 id="clb-users-title" className="clb-section-title">누가 사용하나요?</h2>
        <ul className="clb-grid clb-users-grid">
          {users.map((user) => (
            <li key={user.title} className="clb-card clb-user-card">
              <h3 className="clb-card-title">{user.title}</h3>
              <p>{user.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. How To Use */}
      <section className="clb-section clb-howto" aria-labelledby="clb-howto-title">
        <h2 id="clb-howto-title" className="clb-section-title">어떻게 사용하나요?</h2>
        <ol className="clb-howto-list">
          {howToSteps.map((step, i) => (
            <li key={step} className="clb-howto-step">
              <span className="clb-howto-index" aria-hidden="true">{i + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. How It Works */}
      <section className="clb-section clb-pipeline" aria-labelledby="clb-pipeline-title">
        <h2 id="clb-pipeline-title" className="clb-section-title">어떻게 작동하나요?</h2>
        <ol className="clb-flow clb-pipeline-flow">
          {pipeline.map((stage) => (
            <li key={stage.title} className="clb-flow-step">
              <h3 className="clb-card-title">{stage.title}</h3>
              <p>{stage.desc}</p>
            </li>
          ))}
        </ol>
        <p className="clb-flow-loop-note" aria-hidden="true">
          <span className="clb-loop-back-icon">↺</span> Review 결과는 다시 Input으로 순환됩니다
        </p>
      </section>

      {/* 7. Core Loop Example */}
      <section className="clb-section clb-example" aria-labelledby="clb-example-title">
        <h2 id="clb-example-title" className="clb-section-title">코어 루프 예시</h2>
        <h3 className="clb-example-genre">장르: 로그라이크 덱빌딩 RPG</h3>
        <ol className="clb-flow clb-example-flow">
          {exampleLoop.map((step, i) => (
            <li
              key={step}
              className={`clb-flow-step clb-example-step${
                i === exampleLoop.length - 1 ? ' clb-example-step-repeat' : ''
              }`}
            >
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <p className="clb-example-desc">
          이 루프의 핵심 재미는 매 전투 이후 달라지는 선택과, 그 선택이 다음
          전투의 전략을 바꾸는 데 있습니다.
        </p>
      </section>

      {/* 8. Output */}
      <section className="clb-section clb-output" aria-labelledby="clb-output-title">
        <h2 id="clb-output-title" className="clb-section-title">무엇을 얻을 수 있나요?</h2>
        <ul className="clb-grid clb-output-grid">
          {outputs.map((output) => (
            <li key={output} className="clb-card clb-output-card">
              <span className="clb-output-icon" aria-hidden="true">✓</span>
              <p>{output}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 9. Closing */}
      <section className="clb-section clb-closing" aria-labelledby="clb-closing-title">
        <h2 id="clb-closing-title" className="clb-closing-title">
          막연한 게임 아이디어를 플레이어가 반복하고 싶어 하는 구조로 바꿔보세요.
        </h2>
        <span className="clb-cta">Start with a Core Loop</span>
      </section>
    </main>
  )
}

export default CoreLoopBuilderIntro
