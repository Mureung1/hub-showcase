const scenarios = [
  { name: '조모임 무임승차', tone: '부드럽게 ↔ 단호하게' },
  { name: '교수님 메일', tone: '간결하게 ↔ 격식 갖춰서' },
  { name: '선후배 존댓말', tone: '깍듯하게 ↔ 친근하게' },
  { name: '소개팅·과CC', tone: '조심스럽게 ↔ 적극적으로' },
]

const features = [
  { name: '시나리오 선택', desc: '대학생 특화 상황 4가지를 카드 형태로 제시' },
  { name: '톤 슬라이더', desc: '시나리오별로 다른 축을 가진 조절 UI (3~5단계)' },
  { name: '상황 입력', desc: '세부 맥락을 한두 줄로 최소한만 입력' },
  { name: '답장 생성', desc: '시나리오·톤별 큐레이션 예시 기반 AI 답장 후보 생성' },
  { name: '결과 복사', desc: '마음에 드는 답장을 바로 복사해 사용' },
  { name: '피드백 수집', desc: '"효과 있었어요" 평가가 예시 데이터베이스에 반영' },
]

const flowSteps = [
  '시나리오 선택',
  '톤 슬라이더 조작',
  '상황 한두 줄 입력',
  '답장 후보 생성',
  '선택 후 복사',
  '효과 피드백',
]

function ProjectIntro() {
  return (
    <main className="intro">
      <header className="intro-hero">
        <h1>답답</h1>
        <p className="tagline">
          매번 맥락을 설명하지 않아도, 몇 번의 선택만으로 받는 답장 도우미
        </p>
      </header>

      <section className="intro-section">
        <h2>이런 고민, 해본 적 있나요?</h2>
        <p>
          대학생은 애매한 답장 상황을 반복해서 마주칩니다. 조모임 무임승차자에게
          보낼 말, 교수님께 드리는 과제 연장 메일, 선후배 사이 존댓말 수위,
          소개팅에서 보낼 첫 메시지까지 — 매번 무슨 말을 어떻게 써야 할지
          고민하느라 시간과 감정 에너지를 씁니다.
        </p>
        <p>
          AI 챗봇에게 물어볼 수도 있지만, 그때마다 상황 맥락을 처음부터 글로
          설명해야 하고, 받은 답장이 실제로 효과가 있을지는 알 수 없습니다.
        </p>
      </section>

      <section className="intro-section">
        <h2>답답의 해결 방법</h2>
        <p>
          대학생이 자주 겪는 시나리오를 미리 정의해두고, 실제 그 상황을 겪어본
          사람이 큐레이션한 좋은 답장 예시를 기반으로 답장을 생성합니다. 맥락
          설명 없이 카드 선택과 톤 슬라이더 조작만으로 충분합니다.
        </p>
        <ul className="scenario-grid">
          {scenarios.map((s) => (
            <li key={s.name} className="scenario-card">
              <strong>{s.name}</strong>
              <span>{s.tone}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="intro-section">
        <h2>사용 흐름</h2>
        <ol className="flow-list">
          {flowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>
          좋은 평가를 받은 답장은 예시 데이터베이스에 쌓여, 다음 사용자의 답장
          생성에 다시 활용됩니다.
        </p>
      </section>

      <section className="intro-section">
        <h2>핵심 기능</h2>
        <ul className="feature-list">
          {features.map((f) => (
            <li key={f.name}>
              <strong>{f.name}</strong>
              <span>{f.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="intro-footer">
        <p>기술 스택: React</p>
      </footer>
    </main>
  )
}

export default ProjectIntro
